'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, RefreshCw, Undo2, Paperclip, X, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocale, useTranslations } from 'next-intl';
import { toastError } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';
import {
  createArtifactFromStreamEvent,
  extractCommandHandshakeFromContent,
  extractReschedulePlanBlock,
  extractTraceSummary,
  stripHiddenBlocks,
  type ChatkitEvent,
} from '@/lib/chat-artifacts';
import type {
  CommandArtifact,
  CommandHandshake,
  QuickApplyResult,
  ReasoningTraceStep,
} from '@/types/project-cockpit';

export type ChatMode = 'default' | 'reschedule' | 'diagnosis' | 'logging';
export type ChatSuggestion = {
  label: string;
  message: string;
  mode?: ChatMode;
  isCancel?: boolean;
};

export interface RouvisChatKitRef {
  sendMessage: (message: string, overrideMode?: ChatMode) => Promise<void>;
  setSuggestions: (suggestions: ChatSuggestion[]) => void;
  setChatMode: (mode: ChatMode) => void;
  runRescheduleQuickApply: (options: { prompt: string; confirmMessage?: string }) => Promise<QuickApplyResult>;
}

interface ActionConfirmation {
  id: string;
  type: 'activity_logged' | 'task_created' | 'task_updated';
  summary: string;
  undoData?: unknown;
  expiresAt: number;
}

type AssistantLanguage = 'ja' | 'en';
type AssistantVerbosity = 'short' | 'balanced' | 'detailed';

interface PendingMutationApproval {
  token: string;
  summary: string;
  action?: string;
  expiresAt?: string;
}

interface ThinkingStep {
  id: string;
  tool: string;
  status: 'running' | 'completed' | 'error';
  message: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  thinkingSteps?: ThinkingStep[];
  source?: string;
  hasError?: boolean;
  createdAt?: string;
}

type IntentPolicyDebugState = {
  responsePolicy: 'casual' | 'assistive' | 'workflow' | 'deep';
  primaryIntent: string;
  confidence?: number;
  clarificationRequired: boolean;
};

type ChatMemoryRecallScope = 'session' | 'project' | 'user';

interface RouvisChatKitProps {
  className?: string;
  projectId?: string;
  initialThreadId?: string;
  initialInput?: string;
  initialSuggestions?: ChatSuggestion[];
  initialMode?: ChatMode;
  onTaskUpdate?: () => void;
  onDiagnosisComplete?: (result: unknown) => void;
  onDraftCreate?: (draft: any) => void;
  onCommandHandshakeChange?: (handshake: CommandHandshake | null) => void;
  density?: 'compact' | 'comfortable';
  growthStage?: string;
  standoutMode?: boolean;
  channel?: string;
  channelKind?: string;
  channelActorId?: string;
  sessionActorId?: string;
  pairingCode?: string;
  mentions?: string[];
  memoryRecallScope?: ChatMemoryRecallScope;
  autoCreateThread?: boolean;
}

// Friendly status message translation keys.
const FRIENDLY_STATUS_KEYS: Record<string, string> = {
  'planner': 'cockpit.status.planner',
  'jma.getForecast': 'cockpit.status.weather',
  'plant_doctor.diagnose': 'cockpit.status.diagnosis',
  'scheduler.createTask': 'cockpit.status.task_create',
  'scheduler.reschedulePlan': 'cockpit.status.reschedule',
  'scheduler.updateTask': 'cockpit.status.task_update',
  'activities.log': 'cockpit.status.activity_log',
};
const TRACE_EXPANDED_MAX_STEPS = 5;
const TRACE_LIVE_MAX_STEPS = 3;

const MODE_CONFIG: Record<ChatMode, { color: string; bg: string; border: string }> = {
  default: { color: '', bg: '', border: '' },
  reschedule: {
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  diagnosis: {
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200'
  },
  logging: {
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
};

// Time-aware greetings
function getGreeting(
  weather: { condition?: string } | undefined,
  t: (key: string) => string
): { main: string; sub: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    return { main: t('cockpit.greeting.morning_main'), sub: t('cockpit.greeting.morning_sub') };
  } else if (hour >= 10 && hour < 17) {
    if (weather?.condition?.includes('雨')) {
      return { main: t('cockpit.greeting.rain_main'), sub: t('cockpit.greeting.rain_sub') };
    }
    return { main: t('cockpit.greeting.day_main'), sub: t('cockpit.greeting.day_sub') };
  } else if (hour >= 17 && hour < 21) {
    return { main: t('cockpit.greeting.evening_main'), sub: t('cockpit.greeting.evening_sub') };
  } else {
    return { main: t('cockpit.greeting.night_main'), sub: t('cockpit.greeting.night_sub') };
  }
}

// Quick action suggestions (text links, not buttons)
function getQuickSuggestions(
  growthStage: string | undefined,
  t: (key: string) => string
): ChatSuggestion[] {
  const hour = new Date().getHours();
  const suggestions: ChatSuggestion[] = [];

  if (hour >= 5 && hour < 12) {
    suggestions.push({ label: t('cockpit.suggestions.today_label'), message: t('cockpit.suggestions.today_message') });
  }

  if (growthStage?.toLowerCase().includes('seedling') || growthStage?.includes('育苗')) {
    suggestions.push({ label: t('cockpit.suggestions.watering_label'), message: t('cockpit.suggestions.watering_message'), mode: 'logging' });
  } else if (growthStage?.toLowerCase().includes('harvest') || growthStage?.includes('収穫')) {
    suggestions.push({ label: t('cockpit.suggestions.harvest_label'), message: t('cockpit.suggestions.harvest_message'), mode: 'logging' });
  } else {
    suggestions.push({ label: t('cockpit.suggestions.log_label'), message: t('cockpit.suggestions.log_message'), mode: 'logging' });
  }

  suggestions.push({ label: t('cockpit.suggestions.weather_label'), message: t('cockpit.suggestions.weather_message') });

  return suggestions.slice(0, 3);
}

function inferAssistantLanguage(locale: string): AssistantLanguage {
  return locale.toLowerCase().startsWith('ja') ? 'ja' : 'en';
}

export const RouvisChatKit = forwardRef<RouvisChatKitRef, RouvisChatKitProps>(({
  className,
  projectId,
  initialThreadId,
  initialInput,
  initialSuggestions,
  initialMode,
  onTaskUpdate,
  onDiagnosisComplete,
  onDraftCreate,
  onCommandHandshakeChange,
  density = 'comfortable',
  growthStage,
  standoutMode = false,
  channel = 'chat',
  channelKind = 'direct',
  channelActorId,
  sessionActorId,
  pairingCode,
  mentions,
  memoryRecallScope = 'session',
  autoCreateThread = true,
}, ref) => {
  const locale = useLocale();
  const t = useTranslations('chat');
  const defaultAssistantLanguage = inferAssistantLanguage(locale);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [actionConfirmations, setActionConfirmations] = useState<ActionConfirmation[]>([]);
  const [commandArtifacts, setCommandArtifacts] = useState<CommandArtifact[]>([]);
  const [reasoningTraceSteps, setReasoningTraceSteps] = useState<ReasoningTraceStep[]>([]);
  const [traceExpanded, setTraceExpanded] = useState(false);
  const [activeHandshake, setActiveHandshake] = useState<CommandHandshake | null>(null);
  const [weather, setWeather] = useState<{ condition?: string } | undefined>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [chatMode, setChatModeState] = useState<ChatMode>('default'); // New state
  const [customSuggestions, setCustomSuggestions] = useState<ChatSuggestion[] | null>(initialSuggestions || null);
  const [intentPolicyDebug, setIntentPolicyDebug] = useState<IntentPolicyDebugState | null>(null);
  const [assistantLanguage, setAssistantLanguage] = useState<AssistantLanguage>(defaultAssistantLanguage);
  const [assistantVerbosity, setAssistantVerbosity] = useState<AssistantVerbosity>('balanced');
  const [pendingMutationApproval, setPendingMutationApproval] = useState<PendingMutationApproval | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastAssistantRawRef = useRef('');
  const lastAssistantFailedRef = useRef(false);
  const quickApplyInFlightRef = useRef(false);
  const lastActionTypeRef = useRef<ActionConfirmation['type'] | null>(null);
  const createThreadPromiseRef = useRef<Promise<string | null> | null>(null);

  useEffect(() => {
    setAssistantLanguage(inferAssistantLanguage(locale));
  }, [locale]);

  useEffect(() => {
    if (!initialThreadId) return;
    setThreadId(initialThreadId);
  }, [initialThreadId]);

  const pushArtifact = useCallback((artifact: CommandArtifact | null) => {
    if (!artifact || !standoutMode) return;
    setCommandArtifacts(prev => [...prev.slice(-14), artifact]);
  }, [standoutMode]);

  const pushReasoningTraceStep = useCallback((step: ReasoningTraceStep | null) => {
    if (!step || !standoutMode) return;
    setReasoningTraceSteps(prev => {
      const filtered = prev.filter(existing => existing.stepId !== step.stepId);
      return [...filtered, step].slice(-TRACE_EXPANDED_MAX_STEPS);
    });
  }, [standoutMode]);

  const publishHandshake = useCallback((handshake: CommandHandshake | null) => {
    setActiveHandshake(handshake);
    onCommandHandshakeChange?.(handshake);
  }, [onCommandHandshakeChange]);

  const ensureThreadId = useCallback(async (): Promise<string | undefined> => {
    if (threadId) return threadId;
    if (!autoCreateThread) return undefined;

    if (createThreadPromiseRef.current) {
      const pendingThreadId = await createThreadPromiseRef.current;
      return pendingThreadId || undefined;
    }

    createThreadPromiseRef.current = (async () => {
      try {
        const res = await fetch('/api/chatkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chatkit.create_thread',
            payload: {
              ...(projectId ? { projectId } : {}),
            },
          }),
        });
        if (!res.ok) return null;
        const data = await res.json().catch(() => ({}));
        const createdThreadId = typeof data?.thread?.id === 'string' ? data.thread.id : null;
        if (createdThreadId) {
          setThreadId(createdThreadId);
        }
        return createdThreadId;
      } catch (error) {
        console.warn('Failed to create thread:', error);
        return null;
      } finally {
        createThreadPromiseRef.current = null;
      }
    })();

    const createdThreadId = await createThreadPromiseRef.current;
    return createdThreadId || undefined;
  }, [autoCreateThread, projectId, threadId]);

  useEffect(() => {
    let cancelled = false;

    const loadLatestThread = async () => {
      if (threadId) return;

      try {
        const listThreadsPayload = projectId
          ? { action: 'chatkit.list_threads', payload: { projectId } }
          : { action: 'chatkit.list_threads' };
        const res = await fetch('/api/chatkit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(listThreadsPayload),
        });
        if (!res.ok) return;
        const data = await res.json().catch(() => ({})) as { threads?: Array<{ id?: string }> };
        const latestThreadId = typeof data.threads?.[0]?.id === 'string' ? data.threads[0].id : undefined;
        if (!cancelled && latestThreadId) {
          setThreadId(latestThreadId);
        }
      } catch (error) {
        console.warn('Failed to load latest thread:', error);
      }
    };

    void loadLatestThread();

    return () => {
      cancelled = true;
    };
  }, [projectId, threadId]);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!threadId) return;

      try {
        const res = await fetch(`/api/chatkit?thread_id=${threadId}`);
        if (res.ok) {
          const data = (await res.json()) as {
            messages?: Array<{
              id: string;
              role: string;
              content: string;
              createdAt?: string;
            }>;
            preferences?: {
              assistantLanguage?: string;
              assistantVerbosity?: string;
            };
          };
          const history: Message[] = (data.messages || []).map((m) => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            createdAt: m.createdAt,
          }));
          setMessages(history);

          const replayTraceSteps = (data.messages || [])
            .filter((m) => m.role === 'assistant')
            .flatMap((m) => {
              const summary = extractTraceSummary(m.content);
              return summary?.steps || [];
            })
            .slice(-TRACE_EXPANDED_MAX_STEPS);
          setReasoningTraceSteps(replayTraceSteps);

          const preferenceLanguage = data.preferences?.assistantLanguage;
          if (preferenceLanguage === 'ja' || preferenceLanguage === 'en') {
            setAssistantLanguage(preferenceLanguage);
          }

          const preferenceVerbosity = data.preferences?.assistantVerbosity;
          if (
            preferenceVerbosity === 'short'
            || preferenceVerbosity === 'balanced'
            || preferenceVerbosity === 'detailed'
          ) {
            setAssistantVerbosity(preferenceVerbosity);
          }
        }
      } catch (e) {
        console.warn('Failed to load history:', e);
      }
    };

    void loadHistory();
  }, [threadId]);

  useEffect(() => {
    if (!initialMode) return;
    setChatModeState(initialMode);
  }, [initialMode]);

  useEffect(() => {
    if (!initialInput) return;
    setInput(prev => (prev.length > 0 ? prev : initialInput));
  }, [initialInput]);

  useEffect(() => {
    if (!initialSuggestions || initialSuggestions.length === 0) return;
    setCustomSuggestions(initialSuggestions);
  }, [initialSuggestions]);

  useEffect(() => {
    setCommandArtifacts([]);
    setReasoningTraceSteps([]);
    setTraceExpanded(false);
    publishHandshake(null);
    setIntentPolicyDebug(null);
    setPendingMutationApproval(null);
    if (!threadId) {
      setAssistantLanguage(inferAssistantLanguage(locale));
      setAssistantVerbosity('balanced');
    }
  }, [locale, threadId, publishHandshake]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toastError(t('cockpit.errors.image_size'));
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messagesContainerRef.current) {
      const { scrollHeight, clientHeight } = messagesContainerRef.current;
      messagesContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior,
      });
    }
  }, []);

  const handleMessagesScroll = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom < 40;

    setIsUserNearBottom(nearBottom);
    if (nearBottom) setHasUnreadMessages(false);
  }, []);

  const sendMessage = useCallback(async (
    content: string,
    overrideMode?: ChatMode,
    options?: {
      mutationApprovalToken?: string;
      allowMutations?: boolean;
      skipUserMessage?: boolean;
    }
  ) => {
    const trimmedContent = content.trim();
    const hasApprovalPayload = Boolean(options?.mutationApprovalToken);
    if ((!trimmedContent && !selectedImage && !hasApprovalPayload) || isLoading) return;
    let assistantRawContent = '';
    let assistantFailed = false;
    lastAssistantRawRef.current = '';
    lastAssistantFailedRef.current = false;

    // Capture image before clearing state
    const currentImageUrl = selectedImage;

    const userMessage: Message | null = options?.skipUserMessage
      ? null
      : {
        id: `user-${Date.now()}`,
        role: 'user',
        content: trimmedContent,
        imageUrl: currentImageUrl || undefined,
      };

    // Build API messages array BEFORE clearing state.
    const outboundMessages = userMessage ? [...messages, userMessage] : messages;
    const apiMessages = outboundMessages.map(m => ({
      role: m.role,
      content: m.imageUrl
        ? [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: m.imageUrl } }
        ]
        : m.content
    }));

    if (userMessage) {
      setMessages(prev => [...prev, userMessage]);
    }
    setInput('');
    if (!options?.skipUserMessage) {
      setSelectedImage(null);
    }
    setIsLoading(true);
    setTraceExpanded(false);
    setCurrentStatus('');
    setIsUserNearBottom(true);
    setHasUnreadMessages(false);
    if (!options?.mutationApprovalToken) {
      setPendingMutationApproval(null);
    }

    const assistantId = `assistant-${Date.now()}`;
    const newAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, newAssistantMessage]);

    try {
      const resolvedThreadId = threadId || await ensureThreadId();
      const response = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmedContent || undefined,
          messages: apiMessages,
          projectId,
          threadId: resolvedThreadId,
          mode: options?.skipUserMessage ? undefined : (overrideMode || chatMode),
          channel,
          channelKind,
          channelActorId,
          sessionActorId,
          pairingCode,
          mentions,
          recallScope: memoryRecallScope,
          assistantLanguage,
          assistantVerbosity,
          mutationApprovalToken: options?.mutationApprovalToken,
          allowMutations: options?.allowMutations === true,
        }),
      });

      if (!response.ok) throw new Error('Failed to send message');
      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          // AI SDK format: 0:"text"
          if (line.startsWith('0:')) {
            try {
              const text = JSON.parse(line.slice(2));
              assistantRawContent += text;
              lastAssistantRawRef.current = assistantRawContent;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + text } : m
              ));
            } catch {
              // Skip parse errors
            }
            continue;
          }

          // Custom event format: e:{"type":"..."}
          if (line.startsWith('e:')) {
            let data: unknown = null;
            try {
              data = JSON.parse(line.slice(2));
            } catch {
              continue;
            }

            const event = data as ChatkitEvent;

            if (
              event.type === 'reasoning_trace'
              && typeof event.stepId === 'string'
              && typeof event.phase === 'string'
              && typeof event.status === 'string'
              && typeof event.title === 'string'
              && typeof event.sourceEvent === 'string'
              && typeof event.timestamp === 'string'
            ) {
              pushReasoningTraceStep({
                stepId: event.stepId,
                phase: event.phase as ReasoningTraceStep['phase'],
                status: event.status as ReasoningTraceStep['status'],
                title: event.title,
                detail: typeof event.detail === 'string' ? event.detail : undefined,
                tool: typeof event.tool === 'string' ? event.tool : undefined,
                confidence: typeof event.confidence === 'number' ? event.confidence : undefined,
                sourceEvent: event.sourceEvent as ReasoningTraceStep['sourceEvent'],
                timestamp: event.timestamp,
              });
              continue;
            }

            const artifact = createArtifactFromStreamEvent(event);
            if (artifact && artifact.kind !== 'reasoning' && artifact.kind !== 'status') {
              pushArtifact(artifact);
            }

            if (event.type === 'intent_policy' && event.data?.responsePolicy) {
              setIntentPolicyDebug({
                responsePolicy: event.data.responsePolicy,
                primaryIntent: event.data.primaryIntent || 'unknown',
                confidence: typeof event.data.confidence === 'number' ? event.data.confidence : undefined,
                clarificationRequired: Boolean(event.data.clarificationRequired),
              });
              void trackUXEvent('chat_intent_policy', {
                policy: event.data.responsePolicy,
                confidence: typeof event.data.confidence === 'number' ? event.data.confidence : null,
                primaryIntent: event.data.primaryIntent || 'unknown',
                clarificationRequired: Boolean(event.data.clarificationRequired),
              });
            }

            // Simple status update (no complex thinking UI)
            if (event.type === 'tool_call_delta' && event.delta?.tool) {
              const statusKey = FRIENDLY_STATUS_KEYS[event.delta.tool];
              const friendlyStatus = statusKey ? t(statusKey) : t('cockpit.status.processing');
              setCurrentStatus(prev => (prev === friendlyStatus ? prev : friendlyStatus));
            }

            // Content
            if (event.type === 'content' && event.delta?.content) {
              const content = event.delta.content;
              assistantRawContent += content;
              lastAssistantRawRef.current = assistantRawContent;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + content } : m
              ));
            }

            // Source (simplified - no confidence %)
            if (event.type === 'citation' && event.citation?.source) {
              const source = event.citation.source;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, source: source } : m
              ));
            }

            // Action confirmations (simplified)
            if (event.type === 'action_confirmation' && event.action?.type) {
              const actionType =
                event.action.type === 'task_created' ||
                  event.action.type === 'activity_logged' ||
                  event.action.type === 'task_updated'
                  ? event.action.type
                  : 'task_updated';
              lastActionTypeRef.current = actionType;
              const confirmation: ActionConfirmation = {
                id: `confirm-${Date.now()}`,
                type: actionType,
                summary: actionType === 'task_created'
                  ? t('cockpit.confirmations.task_created')
                  : actionType === 'activity_logged'
                    ? t('cockpit.confirmations.activity_logged')
                    : t('cockpit.confirmations.task_updated'),
                undoData: event.action.undoData,
                expiresAt: Date.now() + 30000,
              };
              setActionConfirmations(prev => [...prev, confirmation]);
              setPendingMutationApproval(null);
              window.setTimeout(() => {
                setActionConfirmations(prev => prev.filter(c => c.id !== confirmation.id));
              }, Math.max(0, confirmation.expiresAt - Date.now()));
            }

            // Weather for context
            if (event.type === 'tool_call_result' && event.toolName === 'jma.getForecast') {
              const condition =
                event.result && typeof event.result === 'object'
                  ? (event.result as { condition?: unknown }).condition
                  : undefined;
              setWeather({ condition: typeof condition === 'string' ? condition : undefined });
            }

            // Mark error
            if (event.type === 'tool_call_delta' && event.delta?.status === 'error') {
              assistantFailed = true;
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, hasError: true } : m
              ));
            }

            // Diagnosis Result
            if (event.type === 'diagnosis_result') {
              onDiagnosisComplete?.(event.result);
            }

            // Draft Created (Re-added)
            if (event.type === 'draft_created' && (event as any).draft) {
              onDraftCreate?.((event as any).draft);
            }

            // Custom UI Events (Choices, Refreshes)
            if (event.type === 'custom_ui' && event.data) {
              if (event.data.type === 'choice' && event.data.options) {
                const mappedOptions = event.data.options.map(opt => ({
                  label: opt.label || t('cockpit.choice.default_label'),
                  message: opt.value || '',
                }));
                setCustomSuggestions(mappedOptions);
              }
              if (event.data.type === 'mutation_confirmation_required' && event.data.token) {
                setPendingMutationApproval({
                  token: event.data.token,
                  summary: event.data.summary || t('cockpit.confirmations.task_updated'),
                  action: event.data.action,
                  expiresAt: event.data.expiresAt,
                });
              }
              if (event.data.type === 'diagnosis_retake_required') {
                setCustomSuggestions([
                  {
                    label: assistantLanguage === 'ja' ? '撮り直しのコツを見る' : 'Retake photo tips',
                    message: assistantLanguage === 'ja'
                      ? '診断の確信度が低いので、撮り直しのコツを教えてください。'
                      : 'Confidence is low. Please show photo retake tips for diagnosis.',
                    mode: 'diagnosis',
                  },
                ]);
              }
              if (event.data.type === 'refresh_tasks') {
                onTaskUpdate?.();
              }
            }
          }
        }
      }

      const handshake = extractCommandHandshakeFromContent({
        content: assistantRawContent,
        promptFallback: trimmedContent || t('cockpit.reschedule.default_prompt'),
        source: 'chat',
      });
      if (handshake) {
        const localizedHandshake: CommandHandshake = {
          ...handshake,
          summary: t('cockpit.handshake.summary_detected', {
            count: handshake.affectedTasks.length,
          }),
        };
        publishHandshake(localizedHandshake);
        pushArtifact({
          id: `artifact-plan-${Date.now()}`,
          kind: 'plan',
          title: t('cockpit.artifacts.plan_title'),
          description: localizedHandshake.summary,
          detail: t('cockpit.artifacts.plan_detail', { count: localizedHandshake.affectedTasks.length }),
          tone: localizedHandshake.riskTone,
          createdAt: new Date().toISOString(),
          metadata: {
            affectedTaskCount: localizedHandshake.affectedTasks.length,
          },
        });
      } else if (overrideMode === 'reschedule' || chatMode === 'reschedule') {
        publishHandshake(null);
      }

      onTaskUpdate?.();
    } catch (error) {
      assistantFailed = true;
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: m.content || t('cockpit.errors.generic'), hasError: true }
          : m
      ));
    } finally {
      lastAssistantRawRef.current = assistantRawContent;
      lastAssistantFailedRef.current = assistantFailed;
      setIsLoading(false);
      setTraceExpanded(false);
      setCurrentStatus('');
    }
  }, [
    channel,
    channelActorId,
    channelKind,
    assistantLanguage,
    assistantVerbosity,
    ensureThreadId,
    memoryRecallScope,
    messages,
    mentions,
    projectId,
    pairingCode,
    sessionActorId,
    threadId,
    isLoading,
    selectedImage,
    onTaskUpdate,
    onDiagnosisComplete,
    onDraftCreate,
    chatMode,
    publishHandshake,
    pushArtifact,
    pushReasoningTraceStep,
    t,
  ]);

  const submitIntentFeedback = useCallback((feedbackType: 'misroute' | 'language' | 'verbosity') => {
    if (feedbackType === 'misroute') {
      void sendMessage('/feedback misroute ui-control', undefined, { skipUserMessage: true });
      return;
    }

    if (feedbackType === 'language') {
      const nextLanguage: AssistantLanguage = assistantLanguage === 'ja' ? 'en' : 'ja';
      setAssistantLanguage(nextLanguage);
      void sendMessage(`/feedback language ${nextLanguage}`, undefined, { skipUserMessage: true });
      return;
    }

    setAssistantVerbosity('short');
    void sendMessage('/feedback verbosity short', undefined, { skipUserMessage: true });
  }, [assistantLanguage, sendMessage]);

  const confirmPendingMutation = useCallback(() => {
    if (!pendingMutationApproval || isLoading) return;
    void sendMessage('', undefined, {
      skipUserMessage: true,
      mutationApprovalToken: pendingMutationApproval.token,
      allowMutations: true,
    });
  }, [isLoading, pendingMutationApproval, sendMessage]);

  const cancelPendingMutation = useCallback(() => {
    setPendingMutationApproval(null);
  }, []);

  const runRescheduleQuickApply = useCallback(async (
    options: { prompt: string; confirmMessage?: string }
  ): Promise<QuickApplyResult> => {
    const prompt = options.prompt?.trim() || '';
    if (!prompt) return { applied: false, reason: 'missing_prompt' };
    if (quickApplyInFlightRef.current || isLoading) return { applied: false, reason: 'in_flight' };

    quickApplyInFlightRef.current = true;
    setChatModeState('reschedule');
    setCustomSuggestions(null);

    try {
      await sendMessage(prompt, 'reschedule');
      if (lastAssistantFailedRef.current) {
        return { applied: false, reason: 'proposal_failed' };
      }

      const proposalRaw = lastAssistantRawRef.current;
      const planBlock = extractReschedulePlanBlock(proposalRaw);
      if (!planBlock) {
        publishHandshake(null);
        return { applied: false, reason: 'no_plan' };
      }

      lastActionTypeRef.current = null;
      await sendMessage(options.confirmMessage?.trim() || t('cockpit.quick_apply_confirm_message'), 'reschedule');
      if (lastAssistantFailedRef.current) {
        return { applied: false, reason: 'apply_failed' };
      }

      const confirmationRaw = lastAssistantRawRef.current;
      const appliedByAction = lastActionTypeRef.current === 'task_updated';
      const appliedByText = /予定を調整しました|更新しました|反映済み|applied|updated/i.test(confirmationRaw);
      return appliedByAction || appliedByText
        ? { applied: true }
        : { applied: false, reason: 'apply_unconfirmed' };
    } finally {
      quickApplyInFlightRef.current = false;
    }
  }, [isLoading, publishHandshake, sendMessage, t]);

  const handleRetry = useCallback(() => {
    setMessages(prev => {
      const lastAssistantIdx = prev.findLastIndex(m => m.role === 'assistant');
      if (lastAssistantIdx >= 0) return prev.slice(0, lastAssistantIdx);
      return prev;
    });
    setTimeout(() => {
      const lastUser = messages.findLast(m => m.role === 'user');
      if (lastUser) sendMessage(lastUser.content);
    }, 100);
  }, [messages, sendMessage]);

  useImperativeHandle(ref, () => ({
    sendMessage,
    setSuggestions: (suggestions) => {
      setCustomSuggestions(suggestions);
      setIsUserNearBottom(true); // Scroll down to show them
    },
    setChatMode: (mode: ChatMode) => {
      setChatModeState(mode);
      setIsUserNearBottom(true);
    },
    runRescheduleQuickApply,
  }));

  useEffect(() => {
    if (isUserNearBottom) {
      scrollToBottom('auto');
    } else {
      setHasUnreadMessages(true);
    }
  }, [messages, isUserNearBottom, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleUndo = useCallback(async (confirmation: ActionConfirmation) => {
    if (!confirmation.undoData || Date.now() > confirmation.expiresAt) return;
    try {
      const res = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chatkit.undo', payload: confirmation.undoData }),
      });
      if (res.ok) {
        setActionConfirmations(prev => prev.filter(c => c.id !== confirmation.id));
        onTaskUpdate?.();
        void trackUXEvent('command_artifact_undo_clicked', {
          projectId: projectId || 'none',
          actionType: confirmation.type,
        });
      }
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }, [onTaskUpdate, projectId]);

  const greeting = getGreeting(weather, t);
  const suggestions = customSuggestions || getQuickSuggestions(growthStage, t);
  const isCompact = density === 'compact';
  const modeConfig = MODE_CONFIG[chatMode];
  const modeLabelMap: Record<Exclude<ChatMode, 'default'>, string> = {
    reschedule: t('cockpit.modes.reschedule.label'),
    diagnosis: t('cockpit.modes.diagnosis.label'),
    logging: t('cockpit.modes.logging.label'),
  };
  const modePlaceholderMap: Record<Exclude<ChatMode, 'default'>, string> = {
    reschedule: t('cockpit.modes.reschedule.placeholder'),
    diagnosis: t('cockpit.modes.diagnosis.placeholder'),
    logging: t('cockpit.modes.logging.placeholder'),
  };
  const modeLabel = chatMode === 'default' ? '' : modeLabelMap[chatMode];
  const inputPlaceholder = chatMode === 'default'
    ? t('cockpit.placeholder_message')
    : modePlaceholderMap[chatMode];
  const handshakeToneClass = activeHandshake?.riskTone === 'critical'
    ? 'status-critical'
    : activeHandshake?.riskTone === 'warning'
      ? 'status-warning'
      : activeHandshake?.riskTone === 'watch'
        ? 'status-watch'
        : 'status-safe';
  const latestTraceStep = reasoningTraceSteps[reasoningTraceSteps.length - 1];
  const expandedTraceSteps = reasoningTraceSteps.slice(-TRACE_EXPANDED_MAX_STEPS);
  const liveTraceSteps = reasoningTraceSteps.slice(-TRACE_LIVE_MAX_STEPS);
  const traceStepsForRender = traceExpanded
    ? (isLoading ? liveTraceSteps : expandedTraceSteps)
    : liveTraceSteps;
  const showLiveMiniList = isLoading && !traceExpanded && liveTraceSteps.length > 0;
  const showIntentDebug = process.env.NEXT_PUBLIC_CHAT_INTENT_DEBUG === '1'
    || process.env.NEXT_PUBLIC_CHAT_INTENT_DEBUG === 'true';

  return (
    <div className={`surface-base flex flex-col h-full ${className}`} data-testid="chat-container">
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="mobile-scroll flex-1 overflow-y-auto p-4 space-y-4"
      >
        {standoutMode && (
          <div className="surface-raised px-3 py-2 text-[11px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border bg-card px-2 py-0.5 font-semibold">
                {chatMode === 'default' ? t('cockpit.modes.default.label') : modeLabel}
              </span>
              {activeHandshake ? (
                <span className={`rounded-full px-2 py-0.5 font-semibold ${handshakeToneClass}`}>
                  {t('cockpit.handshake.affected', { count: activeHandshake.affectedTasks.length })}
                </span>
              ) : (
                <span className="text-muted-foreground">{t('cockpit.handshake.none')}</span>
              )}
            </div>
          </div>
        )}

        {/* Empty state with personality */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12 px-6">
            <p className="text-lg text-foreground">{greeting.main}</p>
            <p className="text-sm text-muted-foreground mt-1">{greeting.sub}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-1" data-testid={message.hasError ? 'chat-error' : undefined}>
            {/* Message Bubble */}
            <div className={`flex ${message.role === 'user' ? 'justify-end message-user' : 'justify-start message-assistant'}`}>
              <div
                className={`max-w-[85%] px-4 py-3 ${message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md'
                  : message.hasError
                    ? 'bg-destructive/10 text-destructive rounded-2xl rounded-tl-md'
                    : 'bg-secondary text-secondary-foreground rounded-2xl rounded-tl-md'
                  } ${isCompact ? 'text-sm' : 'text-base'}`}
              >
                {message.imageUrl && (
                  <div className="mb-2">
                    <img
                      src={message.imageUrl}
                      alt={t('cockpit.images.uploaded_alt')}
                      className="max-w-full rounded-lg max-h-64 object-cover border border-black/10"
                    />
                  </div>
                )}
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
                      li: ({ children }) => <li className="mb-1">{children}</li>,
                    }}
                  >
                    {stripHiddenBlocks(message.content)}
                  </ReactMarkdown>
                </div>

                {/* Retry for errors */}
                {message.hasError && !isLoading && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 flex items-center gap-1 text-xs text-destructive/80 hover:text-destructive"
                  >
                    <RefreshCw className="w-3 h-3" />
                    {t('cockpit.retry')}
                  </button>
                )}
              </div>
            </div>

            {/* Simple source attribution (no confidence %) */}
            {message.source && (
              <p className="text-xs text-muted-foreground ml-1">
                {t('cockpit.citation_prefix')}: {message.source}
              </p>
            )}
          </div>
        ))}

        {/* Simple status line while loading */}
        {isLoading && currentStatus && (
          <p className="text-sm text-muted-foreground animate-pulse pl-1" data-testid="streaming-indicator">
            {currentStatus}
          </p>
        )}

        {showIntentDebug && intentPolicyDebug && (
          <div className="pl-1 text-[11px] text-muted-foreground space-y-1" data-testid="intent-policy-debug">
            <span className="block">
              policy={intentPolicyDebug.responsePolicy} intent={intentPolicyDebug.primaryIntent}
              {typeof intentPolicyDebug.confidence === 'number'
                ? ` confidence=${Math.round(intentPolicyDebug.confidence * 100)}%`
                : ''}
              {intentPolicyDebug.clarificationRequired ? ' clarify=true' : ''}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="underline hover:no-underline"
                disabled={isLoading}
                onClick={() => submitIntentFeedback('misroute')}
              >
                wrong intent
              </button>
              <button
                type="button"
                className="underline hover:no-underline"
                disabled={isLoading}
                onClick={() => submitIntentFeedback('language')}
              >
                {assistantLanguage === 'ja' ? 'switch to English' : '日本語に切替'}
              </button>
              <button
                type="button"
                className="underline hover:no-underline"
                disabled={isLoading}
                onClick={() => submitIntentFeedback('verbosity')}
              >
                too long
              </button>
            </div>
          </div>
        )}

        {standoutMode && (activeHandshake || commandArtifacts.length > 0 || reasoningTraceSteps.length > 0) && (
          <section className="space-y-2" data-testid="command-artifact-timeline">
            {activeHandshake && (
              <article
                data-testid="command-handshake-card"
                className={`rounded-lg border px-3 py-2 text-xs ${handshakeToneClass}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{activeHandshake.summary}</p>
                  <button
                    type="button"
                    className="touch-target rounded-md border border-current/30 px-2 py-1 font-semibold hover:bg-black/5"
                    onClick={() => {
                      void trackUXEvent('command_handshake_preview_in_chat', {
                        projectId: projectId || 'none',
                        affectedTasks: activeHandshake.affectedTasks.length,
                      });
                      void sendMessage(activeHandshake.prompt, 'reschedule');
                    }}
                  >
                    {t('cockpit.handshake.preview')}
                  </button>
                </div>
                <p className="mt-1 text-[11px] opacity-85">
                  {t('cockpit.handshake.affected', { count: activeHandshake.affectedTasks.length })}
                </p>
              </article>
            )}

            <article
              data-testid="inference-trace-panel"
              className="rounded-lg border border-border/80 bg-secondary/35 px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{t('cockpit.trace.title')}</p>
                <button
                  type="button"
                  className="touch-target rounded-md border border-border/80 px-2 py-1 text-[11px] font-semibold hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => setTraceExpanded(prev => !prev)}
                >
                  {traceExpanded ? t('cockpit.trace.collapse') : t('cockpit.trace.expand')}
                </button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground" data-testid="inference-trace-summary">
                {reasoningTraceSteps.length === 0
                  ? t('cockpit.trace.empty')
                  : t('cockpit.trace.summary', { count: reasoningTraceSteps.length })}
                {latestTraceStep ? ` · ${latestTraceStep.title}` : ''}
              </p>
              {(traceExpanded || showLiveMiniList) && traceStepsForRender.length > 0 && (
                <div className="mt-2 space-y-1.5" data-testid="inference-trace-steps">
                  {traceStepsForRender.map((step) => {
                    const toneClass = step.status === 'error'
                      ? 'status-critical'
                      : step.status === 'completed'
                        ? 'status-safe'
                        : 'status-watch';
                    return (
                      <div
                        key={step.stepId}
                        className={`rounded-md border px-2 py-1 ${toneClass}`}
                        data-testid="inference-trace-step"
                      >
                        <p className="font-semibold">
                          {step.title}
                        </p>
                        <p className="text-[11px] opacity-80">
                          {`${step.phase} · ${step.status}`}
                        </p>
                        {step.detail ? (
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{step.detail}</p>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </article>

            {commandArtifacts.map((artifact) => {
              const confidence = typeof artifact.metadata?.confidence === 'number'
                ? Math.round(artifact.metadata.confidence * 100)
                : null;
              const choiceCount = typeof artifact.metadata?.options === 'object' && Array.isArray(artifact.metadata.options)
                ? artifact.metadata.options.length
                : 0;
              const artifactTitle = artifact.kind === 'status'
                ? t('cockpit.artifacts.status_title')
                : artifact.kind === 'citation'
                  ? t('cockpit.artifacts.citation_title')
                  : artifact.kind === 'action_receipt'
                    ? t('cockpit.artifacts.action_receipt_title')
                    : artifact.kind === 'choice'
                      ? t('cockpit.artifacts.choice_title')
                      : artifact.kind === 'queue'
                        ? t('cockpit.artifacts.queue_title')
                        : artifact.kind === 'memory'
                          ? t('cockpit.artifacts.memory_title')
                          : artifact.kind === 'reasoning'
                            ? t('cockpit.artifacts.reasoning_title')
                          : artifact.kind === 'error'
                            ? t('cockpit.artifacts.error_title')
                            : artifact.title;
              const artifactDescription = artifact.kind === 'choice'
                ? t('cockpit.artifacts.choice_detail', { count: choiceCount })
                : artifact.description;
              return (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={() => {
                    void trackUXEvent('command_artifact_clicked', {
                      projectId: projectId || 'none',
                      kind: artifact.kind,
                    });
                  }}
                  className="w-full rounded-lg border border-border/80 bg-secondary/35 px-3 py-2 text-left text-xs text-foreground hover:bg-secondary/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={artifact.kind === 'citation' ? 'evidence-card' : `command-artifact-${artifact.kind}`}
                >
                  <p className="font-semibold">{artifactTitle}</p>
                  {artifactDescription ? <p className="mt-0.5">{artifactDescription}</p> : null}
                  {artifact.detail ? <p className="mt-0.5 text-muted-foreground">{artifact.detail}</p> : null}
                  {artifact.kind === 'citation' ? (
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span data-testid="citation">{t('cockpit.citation_label')}</span>
                      <span data-testid="confidence-score">
                        {confidence === null ? '-' : `${confidence}%`}
                      </span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </section>
        )}

        {!isUserNearBottom && hasUnreadMessages && (
          <div className="sticky bottom-2 z-10 flex justify-center">
            <button
              type="button"
              onClick={() => {
                scrollToBottom('smooth');
                setHasUnreadMessages(false);
                setIsUserNearBottom(true);
              }}
              className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-md hover:opacity-90"
            >
              {t('cockpit.jump_latest')}
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t border-border ${chatMode !== 'default' ? modeConfig.bg : ''}`}>
        {messages.length > 0 && (
          <div className="px-4 pt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isLoading}
              onClick={() => submitIntentFeedback('misroute')}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {assistantLanguage === 'ja' ? '意図が違う' : 'Wrong intent'}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => submitIntentFeedback('language')}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {assistantLanguage === 'ja' ? '英語で返答' : 'Reply in Japanese'}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={() => submitIntentFeedback('verbosity')}
              className="rounded-full border border-border/70 px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {assistantLanguage === 'ja' ? '短くして' : 'Too long'}
            </button>
          </div>
        )}

        {pendingMutationApproval && (
          <div className="px-4 pt-3">
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
              <p className="font-semibold">
                {assistantLanguage === 'ja' ? '変更内容の承認が必要です' : 'Approval required before applying change'}
              </p>
              <p className="mt-1 text-xs">{pendingMutationApproval.summary}</p>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                  disabled={isLoading}
                  onClick={confirmPendingMutation}
                >
                  {assistantLanguage === 'ja' ? '適用する' : 'Apply'}
                </button>
                <button
                  type="button"
                  className="rounded-md border border-amber-400 px-3 py-1.5 text-xs font-semibold"
                  disabled={isLoading}
                  onClick={cancelPendingMutation}
                >
                  {assistantLanguage === 'ja' ? 'キャンセル' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Confirmations (simplified) */}
        {actionConfirmations.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            {actionConfirmations.map((confirmation) => (
              <div
                key={confirmation.id}
                className="flex items-center justify-between py-2 px-4 bg-primary/10 text-primary text-sm rounded-lg"
                data-testid="action-confirmation-card"
              >
                <span>{confirmation.summary} ✓</span>
                {!!confirmation.undoData && Date.now() < confirmation.expiresAt && (
                  <button
                    onClick={() => handleUndo(confirmation)}
                    className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
                  >
                    <Undo2 className="w-3 h-3" />
                    {t('cockpit.undo')}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Suggestions (Compact Grid) */}
        {(messages.length === 0 || customSuggestions) && !isLoading && (
          <div className="grid grid-cols-2 gap-2 px-4 pt-3 pb-2">
            {suggestions.map((s) => (
              <button
                key={s.label}
                onClick={() => {
                  if (s.isCancel) {
                    void trackUXEvent('chat_quick_suggestion_cancelled', {
                      projectId: projectId || 'none',
                      source: customSuggestions ? 'context' : 'default',
                    });
                    setCustomSuggestions(null);
                    setChatModeState('default'); // Also exit mode on cancel
                  } else {
                    const mode = s.mode;
                    void trackUXEvent('chat_quick_suggestion_clicked', {
                      projectId: projectId || 'none',
                      source: customSuggestions ? 'context' : 'default',
                      mode: mode || 'default',
                      label: s.label,
                    });
                    if (mode) setChatModeState(mode);
                    sendMessage(s.message, mode);
                    setCustomSuggestions(null); // Clear after selection
                  }
                }}
                className={`w-full text-left px-3 py-2 text-xs font-medium bg-background border border-border/60 hover:border-primary/50 hover:bg-muted/50 rounded-md transition-all flex items-center justify-between group ${s.isCancel ? 'text-muted-foreground' : 'text-foreground'}`}
              >
                <span className="truncate">{s.label}</span>
                {!s.isCancel && (
                  <ArrowRight className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Image Preview */}
        {selectedImage && (
          <div className="px-4 pt-3">
            <div className="relative inline-block">
              <img
                src={selectedImage}
                alt={t('cockpit.images.preview_alt')}
                className="h-20 w-20 object-cover rounded-lg border border-border"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-sm hover:bg-destructive/90 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="p-4 pt-3">
          <div className={`flex items-center gap-2 bg-background rounded-full border p-1 focus-within:ring-2 transition-all ${chatMode !== 'default' ? modeConfig.border + ' focus-within:' + modeConfig.border : 'border-border focus-within:ring-primary/20 focus-within:border-primary'}`}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 ml-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
              disabled={isLoading}
              aria-label={t('cockpit.attach_image')}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              className={`flex-1 bg-transparent border-none px-2 py-2 min-h-[44px] focus:outline-none placeholder:text-muted-foreground ${isCompact ? 'text-sm' : 'text-base'}`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className={`text-primary-foreground rounded-full p-3 min-w-[44px] min-h-[44px] flex items-center justify-center hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all ${chatMode !== 'default' ? chatMode === 'reschedule' ? 'bg-amber-600' : chatMode === 'diagnosis' ? 'bg-teal-600' : 'bg-blue-600' : 'bg-primary'}`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" data-testid="message-loading" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>

        {/* Context Banner (Sticky Bottom) - Placed BELOW Input */}
        {chatMode !== 'default' && (
          <div className={`px-4 py-2 flex items-center justify-between text-xs font-medium border-t ${modeConfig.color} ${modeConfig.bg} ${modeConfig.border}`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">
                {chatMode === 'reschedule' ? 'calendar_today' : chatMode === 'diagnosis' ? 'stethoscope' : 'edit_note'}
              </span>
              <span>{modeLabel}</span>
            </div>
            <button
              onClick={() => setChatModeState('default')}
              className="hover:underline opacity-80 hover:opacity-100 uppercase tracking-wider text-[10px]"
            >
              {t('cockpit.exit')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

RouvisChatKit.displayName = 'RouvisChatKit';
