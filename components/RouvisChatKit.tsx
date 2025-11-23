'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from './ErrorBoundary';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { StreamingLoadingState } from './StreamingLoadingState';
import { NaturalEvidenceCard } from './NaturalEvidenceCard';
import { JMAEvidenceCard } from './JMAEvidenceCard';
import { RAGContextBadge } from './RAGContextBadge';
import { ActionConfirmationCard } from './ActionConfirmationCard';
import { FieldSelector } from './FieldSelector';
import { TaskSchedulerCard } from './TaskSchedulerCard';
import { ActivityFeedCard } from './ActivityFeedCard';
import { EvidenceCard } from './EvidenceCard';
import { GuidebookEvidenceRail, GuidebookCitation } from './GuidebookEvidenceCard';
import { AgentStatus, Citation, JMAData, RAGContext, LoadingState, StreamEvent } from '@/types/chat';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { isDemoModeEnabled } from '@/lib/demo-scenario';

interface Activity {
  id?: string;
  type: 'watering' | 'fertilizing' | 'harvesting' | 'planting' | 'maintenance';
  fieldName?: string;
  quantity?: number;
  unit?: string;
  note?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'cancelled';
}

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueAt: Date;
  fieldId?: string;
  fieldName?: string;
  priority?: 'low' | 'medium' | 'high';
  status: 'pending' | 'scheduled' | 'cancelled';
}

interface Field {
  id: string;
  name: string;
  crop?: string;
  area?: number;
  location?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ToolEvent {
  tool: string;
  status: 'running' | 'completed' | 'error';
  message?: string;
  result?: any;
}

interface RouvisChatKitProps {
  className?: string;
  onTasksScheduled?: (tasks: Task[]) => void;
  hideLeftRail?: boolean;
}

function DemoChatComponent({ className, onTasksScheduled, hideLeftRail = false }: RouvisChatKitProps) {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [citations, setCitations] = useState<Citation[]>([]);
  const [guidebookCitations, setGuidebookCitations] = useState<GuidebookCitation[]>([]);
  const [jmaData, setJMAData] = useState<JMAData | null>(null);
  const [ragContext, setRAGContext] = useState<RAGContext | null>(null);
  const [currentToolEvent, setCurrentToolEvent] = useState<ToolEvent | null>(null);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);

  // New state for chat-action components
  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  const messagesContainerRef = useRef<HTMLDivElement>(null);


  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setLoadingState({
      isLoading: true,
      message: '考えています…',
      agent: 'triage',
    });

    try {
      const response = await fetch('/api/chatkit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'threads.messages.create',
          payload: {
            thread_id: 'demo-thread',
            content: [{ type: 'input_text', text: messageText }],
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let assistantMessageContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);
              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'thread_item.delta' && data.delta?.content) {
                  const textContent = data.delta.content.find((c: any) => c.type === 'output_text')?.text || '';
                  assistantMessageContent += textContent;
                  setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMessage = newMessages[newMessages.length - 1];
                    if (lastMessage?.role === 'assistant') {
                      lastMessage.content = assistantMessageContent;
                    } else {
                      newMessages.push({
                        id: `assistant-${Date.now()}`,
                        role: 'assistant',
                        content: assistantMessageContent,
                        timestamp: new Date(),
                      });
                    }
                    return newMessages;
                  });
                } else if (data.type === 'tool_call_delta') {
                  setCurrentToolEvent({
                    tool: data.delta.tool || 'unknown',
                    status: data.delta.status || 'running',
                    message: data.delta.message || '実行中...',
                  });
                  setAgentStatus({
                    current: 'triage',
                    thinking: data.delta.message || '実行中...',
                  });
                } else if (data.type === 'tool_call_result') {
                  setCurrentToolEvent(prev => prev ? { ...prev, status: 'completed', result: data.result } : null);
                  setAgentStatus(null);

                  // Map scheduled tasks into pending scheduler cards
                  try {
                    if (data.toolName === 'command_bus.schedule_task') {
                      const resultTasks = Array.isArray(data.result?.tasks) ? data.result.tasks : [];
                      const mappedTasks: Task[] = resultTasks.map((t: any) => ({
                        id: t.id,
                        title: String(t.title ?? '新しい作業'),
                        description: t.description ? String(t.description) : undefined,
                        dueAt: new Date(t.due_at ?? Date.now()),
                        fieldId: t.field_id ? String(t.field_id) : undefined,
                        fieldName: t.fieldName ? String(t.fieldName) : undefined,
                        priority: (t.priority === 'high' || t.priority === 'medium' || t.priority === 'low') ? t.priority : 'medium',
                        status: 'pending',
                      }));
                      if (mappedTasks.length > 0) {
                        setPendingTasks(prev => [...prev, ...mappedTasks]);
                        // Notify parent component about scheduled tasks
                        onTasksScheduled?.(mappedTasks);
                      }
                    }

                    // Map activity log into a pending activity confirmation
                    if (data.toolName === 'activities.log' && data.result) {
                      const r = data.result;
                      const activity: Activity = {
                        id: String(r.id ?? `activity-${Date.now()}`),
                        type: (r.type === 'watering' || r.type === 'fertilizing' || r.type === 'harvesting' || r.type === 'planting' || r.type === 'maintenance') ? r.type : 'watering',
                        fieldName: r.field_id ? undefined : undefined,
                        quantity: undefined,
                        unit: undefined,
                        note: r.description ? String(r.description) : undefined,
                        timestamp: new Date(r.performed_at ?? Date.now()),
                        status: 'pending',
                      };
                      setPendingActivities(prev => [...prev, activity]);
                    }
                  } catch (e) {
                    console.warn('Failed to project tool result into UI cards', e);
                  }
                } else if (data.type === 'citation') {
                  const citation: Citation = {
                    id: `citation-${Date.now()}`,
                    source: data.citation?.source || 'Unknown',
                    confidence: data.citation?.confidence || 0.5,
                    text: data.citation?.text || '',
                    type: data.citation?.type || 'general',
                  };
                  setCitations(prev => [...prev, citation]);

                  if (data.citation?.type === 'guidebook') {
                    const guidebookCitation: GuidebookCitation = {
                      source: data.citation.source || 'Unknown',
                      page: data.citation.page || 1,
                      confidence: data.citation.confidence || 0.5,
                      excerpt: data.citation.text?.substring(0, 200) || '',
                      fullText: data.citation.text || '',
                    };
                    setGuidebookCitations(prev => [...prev, guidebookCitation]);
                  }
                }
              } catch (parseError) {
                console.error('Failed to parse SSE data:', parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ありません、エラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
      setLoadingState({ isLoading: false });
      setCurrentToolEvent(null);
      setAgentStatus(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  // Left rail should render only when we actually have content
  // Note: pendingTasks are now handled by parent TodaysOverviewCard
  const hasLeftRail =
    pendingActivities.length > 0 ||
    !!currentToolEvent ||
    !!agentStatus ||
    loadingState.isLoading;

  // Evidence rail should render when we have guidebook citations
  const hasEvidenceRail = guidebookCitations.length > 0;
  const avgConfidence = guidebookCitations.length
    ? Math.round((guidebookCitations.reduce((sum, c) => sum + (c.confidence || 0), 0) / guidebookCitations.length) * 100)
    : undefined;

  // Suggested quick prompts (no demo wording; production‑like suggestions)
  const quickPrompts: { label: string; prompt: string }[] = [
    { label: t('chat.prompts.today_label') || '今日の作業', prompt: t('chat.prompts.today') || '今日は何をすればいいですか？' },
    { label: t('chat.prompts.weather_label') || '天気', prompt: t('chat.prompts.weather') || '今週の天気と注意点を教えてください。' },
    { label: t('chat.prompts.watering_label') || '灌水', prompt: t('chat.prompts.watering') || '今日は灌水した方が良いですか？目安量も教えてください。' },
    ...(isDemoModeEnabled()
      ? [
          {
            label: '🌱 新潟県の枝豆の作り方',
            prompt: '新潟県の枝豆の作り方を教えてください',
          },
        ]
      : []),
  ];

  // When used in VibeFarmingLayout, render only the main chat interface
  if (hideLeftRail) {
    return (
      <>
        {/* Field Selector Modal (overlay) */}
        <FieldSelector
          isOpen={showFieldSelector}
          onClose={() => setShowFieldSelector(false)}
          onSelect={(field) => {
            setSelectedField(field);
            setShowFieldSelector(false);
          }}
          onFetchFields={async () => {
            try {
              const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
              const response = await fetch(`${apiBase}/api/v1/fields`, {
                headers: { 'x-user-id': 'demo-user' },
              });
              if (!response.ok) throw new Error('Failed to fetch fields');
              const data = await response.json();
              return data.fields.map((f: any) => ({
                id: f.id,
                name: f.name,
                crop: f.crop,
                area: f.area_sqm,
                location: '',
              }));
            } catch (error) {
              console.error('Error fetching fields:', error);
              return [
                { id: '1', name: 'A圃場', crop: 'コシヒカリ', area: 1000, location: '長岡' },
                { id: '2', name: 'B圃場', crop: '枝豆', area: 500, location: '三条' },
              ];
            }
          }}
        />

        {/* Main Chat Interface Only */}
        <div className="flex-1 min-w-0 min-h-[60vh] overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur shadow-xl">
          <div className="flex h-full flex-col">
            {/* Polished Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-inner">R</div>
                <div>
                  <div className="font-semibold text-gray-900">R.O.U.V.I.S. アシスタント</div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </div>
                </div>
              </div>
              {typeof avgConfidence === 'number' && (
                <div className="hidden sm:block">
                  <ConfidenceIndicator confidence={avgConfidence / 100} />
                </div>
              )}
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-transparent to-gray-50/60">
              {messages.length === 0 && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-600">
                    <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">🌾</div>
                    <p className="text-base font-medium">農作業の相談や記録を始めましょう</p>
                    <p className="text-sm mt-1">右の天気・作業計画と連携して、最適な提案を行います</p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {message.role === 'assistant' ? (
                    <div className="flex items-end gap-2 max-w-[85%]">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">AI</div>
                      <div className="rounded-2xl px-4 py-2 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 text-gray-900 shadow-sm">
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className="text-[10px] opacity-60 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end gap-2 max-w-[85%]">
                      <div className="rounded-2xl px-4 py-2 bg-emerald-600 text-white shadow-md">
                        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                        <p className="text-[10px] opacity-80 mt-1 text-right">{message.timestamp.toLocaleTimeString()}</p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm">👤</div>
                    </div>
                  )}
                </div>
              ))}

              {/* Dramatic AI workflow visualization */}
              {loadingState.isLoading && (
                <div className="flex justify-start animate-slideIn w-full">
                  <div className="flex flex-col gap-3 w-full max-w-[95%]">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 via-cyan-600 to-emerald-600 text-white flex items-center justify-center shadow-xl animate-pulse flex-shrink-0">
                        <span className="text-sm font-bold">AI</span>
                      </div>
                      <div className="flex-1 rounded-2xl px-6 py-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-emerald-50 border-2 border-blue-300 shadow-2xl">
                        {currentToolEvent ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-4">
                              <div className="relative flex-shrink-0 mt-1">
                                <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                <div className="absolute inset-0 w-7 h-7 border-4 border-cyan-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                                <div className="absolute inset-1 w-5 h-5 border-3 border-emerald-500 border-l-transparent rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-blue-700 mb-1 flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                  {currentToolEvent.tool}
                                </div>
                                <div className="text-base text-gray-800 font-medium leading-relaxed">
                                  {currentToolEvent.message || '処理中...'}
                                </div>
                                <div className="text-xs text-gray-600 mt-2 font-mono">
                                  システムが複数のデータソースから情報を収集・分析しています
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="h-2 bg-gradient-to-r from-gray-200 via-blue-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-500 to-emerald-500 animate-pulse rounded-full" style={{ width: '75%', transition: 'width 0.5s ease-in-out' }} />
                              </div>
                              <div className="text-xs text-right text-gray-500 font-medium">処理中... 75%</div>
                            </div>
                          </div>
                        ) : agentStatus ? (
                          <div className="space-y-3">
                            <div className="flex items-start gap-4">
                              <div className="relative flex-shrink-0 mt-1">
                                <div className="w-7 h-7 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                                <div className="absolute inset-0 w-7 h-7 border-4 border-blue-400 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-emerald-700 mb-1 flex items-center gap-2">
                                  <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                                  AI 高度処理中
                                </div>
                                <div className="text-base text-gray-800 font-medium leading-relaxed">
                                  {agentStatus.thinking || '考えています...'}
                                </div>
                                <div className="text-xs text-gray-600 mt-2 font-mono">
                                  農業知識ベース・気象データ・圃場記録を統合分析中
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <div className="h-2 bg-gradient-to-r from-gray-200 via-emerald-100 to-gray-200 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-cyan-500 animate-pulse rounded-full" style={{ width: '60%', transition: 'width 0.5s ease-in-out' }} />
                              </div>
                              <div className="text-xs text-right text-gray-500 font-medium">分析中... 60%</div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                              <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                            <span className="text-base text-gray-700 font-medium">AI処理を開始しています...</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Composer with quick prompts */}
            <div className="border-t border-gray-200 bg-gradient-to-b from-transparent to-white px-4 py-4">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={t('chat.placeholder') || '質問や作業記録を入力してください…'}
                    className="flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    title="画像を添付"
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M4 16l4.5-4.5a2.121 2.121 0 0 1 3 0L20 20M14 14l1-1M2 7h20M5 3h14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-2 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  送信
                </button>
              </div>

              {/* Quick prompts */}
              <div className="mt-3 flex flex-wrap gap-2">
                {quickPrompts.map(({ label, prompt }) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-emerald-300 transition-colors"
                    title={prompt}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 xl:flex-row">
      {/* Field Selector Modal (overlay) */}
      <FieldSelector
        isOpen={showFieldSelector}
        onClose={() => setShowFieldSelector(false)}
        onSelect={(field) => {
          setSelectedField(field);
          setShowFieldSelector(false);
        }}
        onFetchFields={async () => {
          try {
            const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
            const response = await fetch(`${apiBase}/api/v1/fields`, {
              headers: { 'x-user-id': 'demo-user' },
            });
            if (!response.ok) throw new Error('Failed to fetch fields');
            const data = await response.json();
            return data.fields.map((f: any) => ({
              id: f.id,
              name: f.name,
              crop: f.crop,
              area: f.area_sqm,
              location: '',
            }));
          } catch (error) {
            console.error('Error fetching fields:', error);
            return [
              { id: '1', name: 'A圃場', crop: 'コシヒカリ', area: 1000, location: '長岡' },
              { id: '2', name: 'B圃場', crop: '枝豆', area: 500, location: '三条' },
            ];
          }
        }}
      />

      {/* Left rail (only when content exists and not in Vibe layout) */}
      {hasLeftRail && !hideLeftRail && (
        <div className="hidden xl:flex xl:flex-col xl:gap-4 xl:max-w-sm xl:flex-shrink-0 w-full">
          {/* Pending Activities */}
          {pendingActivities.map((activity) => (
            <ActionConfirmationCard
              key={activity.id || `activity-${Date.now()}`}
              activity={activity}
              onConfirm={async () => {
                try {
                  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
                  const response = await fetch(`${apiBase}/api/v1/activities`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
                    body: JSON.stringify({
                      type: activity.type,
                      fieldId: activity.fieldName ? '1' : undefined,
                      qty: activity.quantity,
                      unit: activity.unit,
                      note: activity.note,
                      performedAt: activity.timestamp.toISOString(),
                    }),
                  });
                  if (!response.ok) console.error('Failed to log activity');
                } catch (error) {
                  console.error('Error logging activity:', error);
                }
                setPendingActivities(prev => prev.filter(a => a.id !== activity.id));
              }}
              onCancel={() => setPendingActivities(prev => prev.filter(a => a.id !== activity.id))}
              onUndo={async () => {
                try {
                  if (activity.id) {
                    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
                    const response = await fetch(`${apiBase}/api/v1/activities/${activity.id}`, {
                      method: 'DELETE',
                      headers: { 'x-user-id': 'demo-user' },
                    });
                    if (!response.ok) console.error('Failed to delete activity');
                  }
                } catch (error) {
                  console.error('Error deleting activity:', error);
                }
                setPendingActivities(prev => prev.filter(a => a.id !== activity.id));
              }}
            />
          ))}

          {/* Tool Event Status */}
          {currentToolEvent && (
            <EvidenceCard
              type="tool_event"
              content={`${currentToolEvent.tool} 実行中…`}
              toolEvent={currentToolEvent}
              isStreaming={true}
            />
          )}

          {/* Agent Status Indicator */}
          {agentStatus && (
            <div className="animate-slideIn">
              <AgentStatusIndicator status={agentStatus} />
            </div>
          )}

          {/* Loading State */}
          {loadingState.isLoading && <StreamingLoadingState loadingState={loadingState} />}
        </div>
      )}

      {/* Main Chat Interface */}
      <div className={`flex-1 min-w-0 min-h-[60vh] overflow-hidden rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur shadow-xl ${hasEvidenceRail ? 'xl:max-w-[60%]' : ''}`}>
        <div className="flex h-full flex-col">
          {/* Polished Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/70 bg-gradient-to-r from-emerald-50/70 via-white to-sky-50/50">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-inner">R</div>
              <div>
                <div className="font-semibold text-gray-900">R.O.U.V.I.S. アシスタント</div>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </div>
              </div>
            </div>
            {typeof avgConfidence === 'number' && (
              <div className="hidden sm:block">
                <ConfidenceIndicator confidence={avgConfidence / 100} />
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-b from-transparent to-gray-50/60">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-600">
                  <div className="mx-auto mb-3 w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">🌾</div>
                  <p className="text-base font-medium">農作業の相談や記録を始めましょう</p>
                  <p className="text-sm mt-1">右の天気・作業計画と連携して、最適な提案を行います</p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {message.role === 'assistant' ? (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">AI</div>
                    <div className="rounded-2xl px-4 py-2 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 text-gray-900 shadow-sm">
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className="text-[10px] opacity-60 mt-1">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 max-w-[85%]">
                    <div className="rounded-2xl px-4 py-2 bg-emerald-600 text-white shadow-md">
                      <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                      <p className="text-[10px] opacity-80 mt-1 text-right">{message.timestamp.toLocaleTimeString()}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center shadow-sm">👤</div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator with workflow in hideLeftRail mode */}
            {loadingState.isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">AI</div>
                  <div className="rounded-2xl px-4 py-2 bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 shadow-sm">
                    {currentToolEvent ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-700">{currentToolEvent.message || '処理中...'}</span>
                      </div>
                    ) : agentStatus ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-700">{agentStatus.thinking || '考えています...'}</span>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Composer with quick prompts */}
          <div className="border-t border-gray-200 bg-gradient-to-b from-transparent to-white px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t('chat.placeholder') || '質問や作業記録を入力してください…'}
                  className="flex-1 outline-none bg-transparent text-gray-900 placeholder:text-gray-400"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  title="画像を添付"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M4 16l4.5-4.5a2.121 2.121 0 0 1 3 0L20 20M14 14l1-1M2 7h20M5 3h14" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={!inputValue.trim() || isLoading}
                className="px-4 py-2 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                送信
              </button>
            </div>

            {/* Quick prompts */}
            <div className="mt-3 flex flex-wrap gap-2">
              {quickPrompts.map(({ label, prompt }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="text-xs px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-emerald-300 transition-colors"
                  title={prompt}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right: Guidebook Evidence Rail (dedicated to citations) */}
      {hasEvidenceRail && (
        <div className="hidden xl:block xl:w-[40%] xl:max-w-md xl:flex-shrink-0">
          {typeof avgConfidence === 'number' && (
            <div className="mb-3">
              <ConfidenceIndicator confidence={avgConfidence / 100} />
            </div>
          )}
          <GuidebookEvidenceRail
            citations={guidebookCitations}
            className="sticky top-4"
          />
        </div>
      )}

      {/* Legacy Evidence Section - Natural format without technical jargon (shown below on mobile/tablet) */}
      {(citations.length > 0 || jmaData || streamEvents.length > 0) && (
        <div className="space-y-3 max-h-96 overflow-y-auto animate-fadeIn xl:hidden">
          {citations.length > 0 && (
            <NaturalEvidenceCard citations={citations} showMultipleSourceConfirmation={true} />
          )}
          {jmaData && <JMAEvidenceCard data={jmaData} />}
          {streamEvents.length > 0 && (
            <div className="space-y-2">
              {streamEvents.slice(-3).map((event, index) => (
                <EvidenceCard
                  key={`stream-${index}`}
                  type="tool_event"
                  content={`ツールイベント: ${event.type}`}
                  toolEvent={{ tool: event.type, status: 'completed', result: event.data }}
                  streamEvents={[event]}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function RouvisChatKit({ className, onTasksScheduled, hideLeftRail }: RouvisChatKitProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="flex items-center justify-center h-full p-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">エラー</h3>
                <p className="text-sm text-gray-600">チャットの読み込みに失敗しました</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">{error.message}</p>
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              再試行            </button>
          </div>
        </div>
      )}
    >
      <DemoChatComponent className={className} onTasksScheduled={onTasksScheduled} hideLeftRail={hideLeftRail} />
    </ErrorBoundary>
  );
}




















