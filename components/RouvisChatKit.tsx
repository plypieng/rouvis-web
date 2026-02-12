'use client';

import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import { Send, Loader2, RefreshCw, Undo2, Paperclip, X, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export type ChatMode = 'default' | 'reschedule' | 'diagnosis' | 'logging';

export interface RouvisChatKitRef {
  sendMessage: (message: string, overrideMode?: ChatMode) => void;
  setSuggestions: (suggestions: { label: string; message: string; isCancel?: boolean }[]) => void;
  setChatMode: (mode: ChatMode) => void;
}

interface ActionConfirmation {
  id: string;
  type: 'activity_logged' | 'task_created' | 'task_updated';
  summary: string;
  undoData?: unknown;
  expiresAt: number;
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

interface RouvisChatKitProps {
  className?: string;
  projectId?: string;
  initialThreadId?: string;
  onTaskUpdate?: () => void;
  onDiagnosisComplete?: (result: unknown) => void;
  onDraftCreate?: (draft: any) => void;
  density?: 'compact' | 'comfortable';
  growthStage?: string;
}

// Friendly status messages (no technical jargon)
const FRIENDLY_STATUS: Record<string, string> = {
  'planner': '考え中...',
  'jma.getForecast': '天気を確認中...',
  'plant_doctor.diagnose': '見てみますね...',
  'scheduler.createTask': '予定に追加中...',
  'scheduler.reschedulePlan': '予定を見直し中...',
  'scheduler.updateTask': '予定を調整中...',
  'activities.log': '記録中...',
};

const MODE_CONFIG: Record<ChatMode, { label: string; color: string; bg: string; border: string }> = {
  default: { label: '', color: '', bg: '', border: '' },
  reschedule: {
    label: 'スケジュール調整モード: 日程変更や優先順位の相談承ります',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200'
  },
  diagnosis: {
    label: '診断モード: 写真を送ってください。AIが診断します',
    color: 'text-teal-700',
    bg: 'bg-teal-50',
    border: 'border-teal-200'
  },
  logging: {
    label: '作業記録モード: 作業内容を教えてください',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200'
  },
};

function stripHiddenBlocks(content: string): string {
  if (!content) return content;
  return content
    .replace(/\[\[(RESCHEDULE_PLAN|UPDATE_TASK|CHOICE):[\s\S]*?\]\]/g, '')
    .trim();
}

// Time-aware greetings
function getGreeting(weather?: { condition?: string }): { main: string; sub: string } {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 10) {
    return { main: 'おはようございます 🌱', sub: '今日も良い一日になりますように' };
  } else if (hour >= 10 && hour < 17) {
    if (weather?.condition?.includes('雨')) {
      return { main: '雨の日ですね ☔', sub: '計画を立てるのにいい日かも' };
    }
    return { main: '今日も畑日和ですね 🌱', sub: '何か気になることありますか？' };
  } else if (hour >= 17 && hour < 21) {
    return { main: 'お疲れさまです 🌾', sub: '今日の振り返りはいかがですか？' };
  } else {
    return { main: 'こんばんは 🌙', sub: '明日の準備はどうですか？' };
  }
}

// Quick action suggestions (text links, not buttons)
function getQuickSuggestions(growthStage?: string): { label: string; message: string; mode?: ChatMode }[] {
  const hour = new Date().getHours();
  const suggestions: { label: string; message: string; mode?: ChatMode }[] = [];

  if (hour >= 5 && hour < 12) {
    suggestions.push({ label: '今日の予定は？', message: '今日の作業予定を教えて' });
  }

  if (growthStage?.toLowerCase().includes('seedling') || growthStage?.includes('育苗')) {
    suggestions.push({ label: '水やり記録', message: '水やりを記録したい', mode: 'logging' });
  } else if (growthStage?.toLowerCase().includes('harvest') || growthStage?.includes('収穫')) {
    suggestions.push({ label: '収穫記録', message: '収穫を記録したい', mode: 'logging' });
  } else {
    suggestions.push({ label: '作業を記録', message: '作業を記録したい', mode: 'logging' });
  }

  suggestions.push({ label: '天気', message: '今日の天気は？' });

  return suggestions.slice(0, 3);
}

export const RouvisChatKit = forwardRef<RouvisChatKitRef, RouvisChatKitProps>(({
  className,
  projectId,
  initialThreadId,
  onTaskUpdate,
  onDiagnosisComplete,
  onDraftCreate,
  density = 'comfortable',
  growthStage,
}, ref) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId);
  const [currentStatus, setCurrentStatus] = useState<string>('');
  const [actionConfirmations, setActionConfirmations] = useState<ActionConfirmation[]>([]);
  const [weather, setWeather] = useState<{ condition?: string } | undefined>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUserNearBottom, setIsUserNearBottom] = useState(true);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [chatMode, setChatModeState] = useState<ChatMode>('default'); // New state
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!threadId) {
        if (projectId) {
          try {
            const res = await fetch('/api/chatkit', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'chatkit.create_thread', payload: { projectId } }),
            });
            if (res.ok) {
              const data = await res.json();
              if (data.thread?.id) setThreadId(data.thread.id);
            }
          } catch (e) {
            console.warn('Failed to create thread:', e);
          }
        }
        return;
      }

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
          };
          const history: Message[] = (data.messages || []).map((m) => ({
            id: m.id,
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.content,
            createdAt: m.createdAt,
          }));
          setMessages(history);
        }
      } catch (e) {
        console.warn('Failed to load history:', e);
      }
    };

    loadHistory();
  }, [threadId, projectId]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('画像サイズは5MB以下にしてください');
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

  const sendMessage = useCallback(async (content: string, overrideMode?: ChatMode) => {
    if ((!content.trim() && !selectedImage) || isLoading) return;

    // Capture image before clearing state
    const currentImageUrl = selectedImage;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      imageUrl: currentImageUrl || undefined,
    };

    // Build API messages array BEFORE clearing state
    const apiMessages = [...messages, userMessage].map(m => ({
      role: m.role,
      content: m.imageUrl
        ? [
          { type: 'text', text: m.content },
          { type: 'image_url', image_url: { url: m.imageUrl } }
        ]
        : m.content
    }));

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedImage(null);
    setIsLoading(true);
    setCurrentStatus('');
    setIsUserNearBottom(true);
    setHasUnreadMessages(false);

    const assistantId = `assistant-${Date.now()}`;
    const newAssistantMessage: Message = {
      id: assistantId,
      role: 'assistant',
      content: '',
    };
    setMessages(prev => [...prev, newAssistantMessage]);

    try {
      const response = await fetch('/api/chatkit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          projectId,
          threadId,
          mode: overrideMode || chatMode, // Send active mode (prefer override if provided)
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

            const event = data as {
              type?: string;
              delta?: { tool?: string; status?: string; content?: string };
              citation?: { source?: string };
              action?: { type?: string; undoData?: unknown };
              toolName?: string;
              result?: unknown;
              data?: { type: string; options?: any[]; action?: string };
            };

            // Simple status update (no complex thinking UI)
            if (event.type === 'tool_call_delta' && event.delta?.tool) {
              const friendlyStatus = FRIENDLY_STATUS[event.delta.tool] || '処理中...';
              setCurrentStatus(friendlyStatus);
            }

            // Content
            if (event.type === 'content' && event.delta?.content) {
              const content = event.delta.content;
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
              const confirmation: ActionConfirmation = {
                id: `confirm-${Date.now()}`,
                type: actionType,
                summary: actionType === 'task_created' ? '予定に追加しました' :
                  actionType === 'activity_logged' ? '記録しました' :
                    '更新しました',
                undoData: event.action.undoData,
                expiresAt: Date.now() + 30000,
              };
              setActionConfirmations(prev => [...prev, confirmation]);
              setTimeout(() => {
                setActionConfirmations(prev => prev.filter(c => c.id !== confirmation.id));
              }, 5000);
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
                  label: opt.label,
                  message: opt.value,
                }));
                setCustomSuggestions(mappedOptions);
              }
              if (event.data.type === 'refresh_tasks') {
                onTaskUpdate?.();
              }
            }
          }
        }
      }

      onTaskUpdate?.();
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: m.content || 'うまくいかなかったみたい。', hasError: true }
          : m
      ));
    } finally {
      setIsLoading(false);
      setCurrentStatus('');
    }
  }, [messages, projectId, threadId, isLoading, selectedImage, onTaskUpdate, onDiagnosisComplete, chatMode]);

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

  const [customSuggestions, setCustomSuggestions] = useState<{ label: string; message: string }[] | null>(null);

  useImperativeHandle(ref, () => ({
    sendMessage,
    setSuggestions: (suggestions) => {
      setCustomSuggestions(suggestions);
      setIsUserNearBottom(true); // Scroll down to show them
    },
    setChatMode: (mode: ChatMode) => {
      setChatModeState(mode);
      setIsUserNearBottom(true);
    }
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
      }
    } catch (e) {
      console.error('Undo failed:', e);
    }
  }, [onTaskUpdate]);

  const greeting = getGreeting(weather);
  const suggestions = customSuggestions || getQuickSuggestions(growthStage);
  const isCompact = density === 'compact';
  const modeConfig = MODE_CONFIG[chatMode];

  return (
    <div className={`flex flex-col h-full bg-card ${className}`}>
      {/* Messages */}
      <div
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Empty state with personality */}
        {messages.length === 0 && !isLoading && (
          <div className="text-center py-12 px-6">
            <p className="text-lg text-foreground">{greeting.main}</p>
            <p className="text-sm text-muted-foreground mt-1">{greeting.sub}</p>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-1">
            {/* Message Bubble */}
            <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                      alt="Uploaded"
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
                    もう一度試す
                  </button>
                )}
              </div>
            </div>

            {/* Simple source attribution (no confidence %) */}
            {message.source && (
              <p className="text-xs text-muted-foreground ml-1">
                出典: {message.source}
              </p>
            )}
          </div>
        ))}

        {/* Simple status line while loading */}
        {isLoading && currentStatus && (
          <p className="text-sm text-muted-foreground animate-pulse pl-1">
            {currentStatus}
          </p>
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
              className="rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-md hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              最新のメッセージへ
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className={`border-t border-border ${chatMode !== 'default' ? modeConfig.bg : ''}`}>
        {/* Action Confirmations (simplified) */}
        {actionConfirmations.length > 0 && (
          <div className="px-4 pt-3 space-y-2">
            {actionConfirmations.map((confirmation) => (
              <div
                key={confirmation.id}
                className="flex items-center justify-between py-2 px-4 bg-primary/10 text-primary text-sm rounded-lg"
              >
                <span>{confirmation.summary} ✓</span>
                {!!confirmation.undoData && Date.now() < confirmation.expiresAt && (
                  <button
                    onClick={() => handleUndo(confirmation)}
                    className="flex items-center gap-1 rounded px-1 text-xs underline opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Undo2 className="w-3 h-3" />
                    取り消す
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
                  if ((s as any).isCancel) {
                    setCustomSuggestions(null);
                    setChatModeState('default'); // Also exit mode on cancel
                  } else {
                    const mode = (s as any).mode;
                    if (mode) setChatModeState(mode);
                    sendMessage(s.message, mode);
                    setCustomSuggestions(null); // Clear after selection
                  }
                }}
                className={`group flex w-full items-center justify-between rounded-md border border-border/60 bg-background px-3 py-2 text-left text-xs font-medium transition-all hover:border-primary/50 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${(s as any).isCancel ? 'text-muted-foreground' : 'text-foreground'}`}
              >
                <span className="truncate">{s.label}</span>
                {!((s as any).isCancel) && (
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
                alt="Preview"
                className="h-20 w-20 object-cover rounded-lg border border-border"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute -top-2 -right-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
              className="ml-1 rounded-full p-2 text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              disabled={isLoading}
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatMode !== 'default' ? modeConfig.label.split(':')[0] + 'でメッセージ...' : 'メッセージ...'}
              className={`flex-1 bg-transparent border-none px-2 py-2 min-h-[44px] focus:outline-none placeholder:text-muted-foreground ${isCompact ? 'text-sm' : 'text-base'}`}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !selectedImage)}
              className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full p-3 text-primary-foreground transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${chatMode !== 'default' ? chatMode === 'reschedule' ? 'bg-amber-600' : chatMode === 'diagnosis' ? 'bg-teal-600' : 'bg-blue-600' : 'bg-primary'}`}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
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
              <span>{modeConfig.label}</span>
            </div>
            <button
              onClick={() => setChatModeState('default')}
              className="rounded px-1 text-[10px] uppercase tracking-wider opacity-80 hover:opacity-100 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              終了
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

RouvisChatKit.displayName = 'RouvisChatKit';
