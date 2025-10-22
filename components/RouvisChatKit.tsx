'use client';

import { useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
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
import { AgentStatus, Citation, JMAData, RAGContext, LoadingState, StreamEvent } from '@/types/chat';

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

interface RouvisChatKitProps {
  className?: string;
}

function RouvisChatKitContent({ className }: RouvisChatKitProps) {
  const t = useTranslations();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [citations, setCitations] = useState<Citation[]>([]);
  const [jmaData, setJMAData] = useState<JMAData | null>(null);
  const [ragContext, setRAGContext] = useState<RAGContext | null>(null);

  // New state for chat-action components
  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [pendingTasks, setPendingTasks] = useState<Task[]>([]);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [selectedField, setSelectedField] = useState<Field | null>(null);

  // SSE event handling for real-time updates
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);
  const [currentToolEvent, setCurrentToolEvent] = useState<{
    tool: string;
    status: 'running' | 'completed' | 'error';
    result?: any;
  } | null>(null);

  const { control } = useChatKit({
    api: {
      url: '/api/chatkit',
      domainKey: 'rouvis-local-dev', // Domain key for local development
    },
    theme: {
      colorScheme: 'light',
      color: {
        accent: { primary: '#059669', level: 2 },
      },
      radius: 'round',
      density: 'normal',
      typography: {
        fontFamily: 'Inter, system-ui, sans-serif',
      },
    },
    startScreen: {
      greeting:
        t('chat.greeting') ||
        'こんにちは！今日は何をお手伝いしましょうか？',
      prompts: [
        {
          label: t('chat.prompts.today_label') || '💬 今日の作業',
          prompt:
            t('chat.prompts.today') ||
            '今日は何をすれば良いですか？',
        },
        {
          label: t('chat.prompts.weather_label') || '🌤 天気の確認',
          prompt:
            t('chat.prompts.weather') ||
            '今週の天気と注意点を教えてください。',
        },
        {
          label: t('chat.prompts.frost_label') || '❄ 霜のリスク',
          prompt:
            t('chat.prompts.frost') ||
            '今週、霜の恐れはありますか？対策を教えてください。',
        },
        {
          label: t('chat.prompts.watering_label') || '💧 灌水の判断',
          prompt:
            t('chat.prompts.watering') ||
            '今日は灌水した方が良いですか？目安量も教えてください。',
        },
      ],
    },
    composer: {
      placeholder:
        t('chat.placeholder') ||
        '質問や作業記録を入力してください…',
      tools: [
        {
          id: 'attach-field',
          label: t('chat.tools.attach_field') || '圃場を選択',
          icon: 'map-pin',
          pinned: true,
        },
        {
          id: 'attach-photo',
          label: t('chat.tools.attach_photo') || '写真を添付',
          icon: 'square-image',
          pinned: true,
        },
      ],
    },
    onClientTool: async (toolCall: any) => {
      switch (toolCall.name) {
        case 'attach-field':
          setShowFieldSelector(true);
          return { field_selected: true };
        case 'attach-photo':
          // TODO: Open file picker for photos
          return { photo_attached: true };
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    },
    onThreadChange: ({ threadId }: any) => {
      console.log('Thread changed:', threadId);
      setAgentStatus(null);
      setPendingActivities([]);
      setPendingTasks([]);
      // Reset state for new thread
      setCitations([]);
      setJMAData(null);
      setRAGContext(null);
      setAgentStatus(null);
      setStreamEvents([]);
      setCurrentToolEvent(null);
    },
    onResponseStart: () => {
      console.log('AI response starting');
      setLoadingState({
        isLoading: true,
        message: '考えています…',
        agent: 'triage',
      });
    },
    onResponseEnd: () => {
      console.log('AI response completed');
      setLoadingState({ isLoading: false });
      setAgentStatus(null);
      setCurrentToolEvent(null); // Clear tool event on completion

      // Process accumulated stream events for evidence population
      if (streamEvents.length > 0) {
        const extractedCitations: Citation[] = [];
        let extractedJMAData: JMAData | null = null;
        let extractedRAGContext: RAGContext | null = null;

        for (const event of streamEvents) {
          // Extract citations from citation events
          if (event.type === 'citation') {
            const citationData = event.data;
            extractedCitations.push({
              id: citationData.id || `citation-${Date.now()}-${Math.random()}`,
              source: citationData.source || 'Unknown',
              page: citationData.page,
              confidence: citationData.confidence || 0.5,
              text: citationData.text,
              type: citationData.type || 'general',
              url: citationData.url,
              metadata: citationData.metadata,
            });
          }

          // Extract JMA data from tool_result events
          if (event.type === 'tool_result' && event.data.toolName === 'jma_get_forecast') {
            const result = event.data.result;
            if (result) {
              extractedJMAData = {
                location: result.location?.area || result.location?.name || 'Niigata',
                forecast: result.condition || result.forecast || 'Weather data available',
                warnings: result.warnings?.map((w: any) => w.description || w.type) || [],
                temperature: result.temperature ? {
                  high: result.temperature.max || result.temperature.high || 25,
                  low: result.temperature.min || result.temperature.low || 15,
                } : undefined,
                precipitation: result.precipitation?.probability || result.precipitation?.amount,
                timestamp: new Date(result.timestamp || Date.now()),
                source: result.source || 'JMA',
              };
            }
          }

          // Extract RAG context from rag_searchGuides tool results
          if (event.type === 'tool_result' && event.data.toolName === 'rag_searchGuides') {
            const result = event.data.result;
            if (Array.isArray(result) && result.length > 0) {
              const guidebooks = [...new Set(result.map((r: any) => r.source || r.guidebook).filter(Boolean))];
              const maxConfidence = Math.max(...result.map((r: any) => r.confidence || r.score || 0));

              extractedRAGContext = {
                guidebooks,
                chunks: result.length,
                relevanceScore: maxConfidence,
              };

              // Also extract citations from RAG results
              result.forEach((r: any) => {
                if (r.citations && Array.isArray(r.citations)) {
                  extractedCitations.push(...r.citations);
                } else {
                  // Create citation from RAG result itself
                  extractedCitations.push({
                    id: r.id || `rag-${Date.now()}-${Math.random()}`,
                    source: r.source || r.guidebook || 'Guidebook',
                    page: r.page,
                    confidence: r.confidence || r.score || 0.5,
                    text: r.text || r.excerpt,
                    type: 'guidebook',
                    url: r.url,
                    metadata: r.metadata,
                  });
                }
              });
            }
          }
        }

        // Update state with extracted evidence
        if (extractedCitations.length > 0) {
          setCitations(prev => [...prev, ...extractedCitations]);
        }

        if (extractedJMAData) {
          setJMAData(extractedJMAData);
        }

        if (extractedRAGContext) {
          setRAGContext(extractedRAGContext);
        }

        // Clear processed events
        setStreamEvents([]);
      }
    },
    locale: 'ja',
  });

  // Left rail should render only when we actually have content
  const hasLeftRail =
    pendingActivities.length > 0 ||
    pendingTasks.length > 0 ||
    !!currentToolEvent ||
    !!agentStatus ||
    loadingState.isLoading;

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

      {/* Left rail (only when content exists) */}
      {hasLeftRail && (
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

          {/* Pending Tasks */}
          {pendingTasks.map((task) => (
            <TaskSchedulerCard
              key={task.id || `task-${Date.now()}`}
              task={task}
              onConfirm={async () => {
                try {
                  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
                  const response = await fetch(`${apiBase}/api/v1/tasks`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
                    body: JSON.stringify({
                      title: task.title,
                      dueAt: task.dueAt.toISOString(),
                      fieldId: task.fieldId,
                      notes: task.description,
                    }),
                  });
                  if (!response.ok) console.error('Failed to schedule task');
                } catch (error) {
                  console.error('Error scheduling task:', error);
                }
                setPendingTasks(prev => prev.filter(t => t.id !== task.id));
              }}
              onCancel={() => setPendingTasks(prev => prev.filter(t => t.id !== task.id))}
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
      <div className="flex-1 min-w-0 min-h-[60vh] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <ChatKit control={control} className={className || 'h-full w-full'} />
      </div>

      {/* Evidence Section - Natural format without technical jargon */}
      {(citations.length > 0 || jmaData || streamEvents.length > 0) && (
        <div className="space-y-3 max-h-96 overflow-y-auto animate-fadeIn">
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

export function RouvisChatKit({ className }: RouvisChatKitProps) {
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
      <RouvisChatKitContent className={className} />
    </ErrorBoundary>
  );
}
















