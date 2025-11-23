'use client';

import { useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useTranslations } from 'next-intl';
import { ErrorBoundary } from '../ErrorBoundary';
import { CompactEvidenceTray } from './CompactEvidenceTray';
import { GuidebookCitation } from '../GuidebookEvidenceCard';
import { AgentStatus, Citation, JMAData, RAGContext, LoadingState, StreamEvent } from '@/types/chat';
import { isDemoModeEnabled } from '@/lib/demo-scenario';

/**
 * RouvisChatKit Compact
 *
 * Optimized chat interface for 360-400px left rail in MVP A UI.
 * Key differences from full RouvisChatKit:
 * - Fixed width design (360-400px)
 * - Vertical stacking (no flex-row)
 * - Collapsible evidence tray instead of separate rail
 * - Vision button with NEXT_PUBLIC_VISION_LITE_ENABLED feature flag
 * - Hidden on mobile (lg:flex), shown via drawer instead
 *
 * Architecture:
 * - Title bar with evidence toggle
 * - ChatKit component (OpenAI ChatKit)
 * - Collapsible evidence tray (CompactEvidenceTray)
 * - Chat input with optional vision button
 */

interface RouvisChatKitCompactProps {
  className?: string;
}

function RouvisChatKitCompactContent({ className }: RouvisChatKitCompactProps) {
  const t = useTranslations();

  // Feature flag for vision functionality
  const VISION_ENABLED = process.env.NEXT_PUBLIC_VISION_LITE_ENABLED === 'true';

  // State management (simplified from full RouvisChatKit)
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>({ isLoading: false });
  const [guidebookCitations, setGuidebookCitations] = useState<GuidebookCitation[]>([]);
  const [streamEvents, setStreamEvents] = useState<StreamEvent[]>([]);

  // Configure ChatKit with custom server event handler
  const chatKitConfig: any = {
    api: {
      url: '/api/chatkit',
      domainKey: 'rouvis-local-dev',
    },
    theme: {
      colorScheme: 'light',
      color: {
        accent: { primary: '#059669', level: 2 },
      },
      radius: 'round',
      density: 'compact', // Compact density for narrow rail
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
        ...(isDemoModeEnabled()
          ? [
              {
                label: '🌱 新潟県の枝豆の作り方',
                prompt: '新潟県の枝豆の作り方を教えてください',
              },
            ]
          : []),
      ],
    },
    composer: {
      placeholder:
        t('chat.placeholder') ||
        '質問や作業記録を入力してください…',
      tools: [
        // Vision button conditionally included based on feature flag
        ...(VISION_ENABLED
          ? [
              {
                id: 'attach-photo',
                label: t('chat.tools.attach_photo') || '写真を添付',
                icon: 'square-image',
                pinned: true,
              },
            ]
          : []),
      ],
    },
    onClientTool: async (toolCall: any) => {
      switch (toolCall.name) {
        case 'attach-photo':
          if (!VISION_ENABLED) {
            console.warn('Vision feature is disabled');
            return { photo_attached: false, error: 'Vision feature disabled' };
          }
          // TODO: Open file picker for photos
          return { photo_attached: true };
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    },
    onThreadChange: ({ threadId }: any) => {
      console.log('Thread changed:', threadId);
      // Reset state for new thread
      setGuidebookCitations([]);
      setAgentStatus(null);
      setStreamEvents([]);
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

      // Process accumulated stream events for evidence population
      if (streamEvents.length > 0) {
        const extractedGuidebookCitations: GuidebookCitation[] = [];

        for (const event of streamEvents) {
          // Extract citations from citation events
          if (event.type === 'citation') {
            const citationData = event.data;

            // If it's a guidebook citation, add to guidebook-specific list
            if (citationData.type === 'guidebook') {
              extractedGuidebookCitations.push({
                source: citationData.source || 'Unknown',
                page: citationData.page || 1,
                confidence: citationData.confidence || 0.5,
                excerpt: citationData.text ? citationData.text.substring(0, 200) : '',
                fullText: citationData.text,
                metadata: citationData.metadata,
              });
            }
          }

          // Extract RAG context from rag_searchGuides tool results
          if (event.type === 'tool_result' && event.data.toolName === 'rag_searchGuides') {
            const result = event.data.result;
            if (Array.isArray(result) && result.length > 0) {
              // Extract citations from RAG results
              result.forEach((r: any) => {
                extractedGuidebookCitations.push({
                  source: r.source || r.guidebook || 'Guidebook',
                  page: r.page || 1,
                  confidence: r.confidence || r.score || 0.5,
                  excerpt: r.excerpt || (r.text ? r.text.substring(0, 200) : ''),
                  fullText: r.text,
                  metadata: r.metadata,
                });
              });
            }
          }
        }

        // Update state with extracted evidence
        if (extractedGuidebookCitations.length > 0) {
          setGuidebookCitations(prev => [...prev, ...extractedGuidebookCitations]);
        }

        // Clear processed events
        setStreamEvents([]);
      }
    },
    locale: 'ja',
    // Collect raw server events
    onEvent: (evt: any) => {
      try {
        if (!evt) return;
        const type = evt.type || evt.event;
        if (type === 'citation') {
          const payload = evt.citation || evt.data?.citation || evt.data || {};
          setStreamEvents((prev) => [...prev, { type: 'citation', data: payload } as any]);
        } else if (type === 'tool_call_result') {
          setStreamEvents((prev) => [...prev, { type: 'tool_result', data: evt } as any]);
        } else if (type === 'tool_call_delta') {
          const delta = evt.delta || evt.data?.delta || evt.data || {};
          setStreamEvents((prev) => [...prev, { type: 'tool_call', data: delta } as any]);
        }
      } catch (e) {
        console.warn('onEvent handler error', e);
      }
    },
  };

  const { control } = useChatKit(chatKitConfig);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Title bar with chat title */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          <span className="text-lg">💬</span>
          <h2 className="font-semibold text-sm text-gray-900">
            {t('chat.title') || '農務チャット'}
          </h2>
        </div>

        {/* Loading indicator */}
        {loadingState.isLoading && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-gray-600">{loadingState.message}</span>
          </div>
        )}
      </div>

      {/* Main ChatKit Interface */}
      <div className="flex-1 min-h-0 overflow-hidden bg-white">
        <ChatKit control={control} className={className || 'h-full w-full'} />
      </div>

      {/* Collapsible Evidence Tray */}
      {guidebookCitations.length > 0 && (
        <CompactEvidenceTray
          citations={guidebookCitations}
          defaultOpen={false}
        />
      )}

      {/* Vision button hint (only shown when enabled) */}
      {VISION_ENABLED && (
        <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-800 flex items-center gap-2">
          <span className="text-sm">📷</span>
          <span>写真を添付して作物の状態を確認できます</span>
        </div>
      )}
    </div>
  );
}

/**
 * RouvisChatKit Compact with Error Boundary
 *
 * Wrapped with ErrorBoundary for resilience.
 * Hidden on mobile/tablet (lg:flex), shown via drawer instead.
 */
export function RouvisChatKit_Compact({ className }: RouvisChatKitCompactProps) {
  return (
    <ErrorBoundary
      fallback={(error, reset) => (
        <div className="flex items-center justify-center h-full p-4">
          <div className="max-w-xs w-full bg-white rounded-lg shadow-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900">エラー</h3>
                <p className="text-xs text-gray-600">チャット読み込み失敗</p>
              </div>
            </div>
            <p className="text-xs text-gray-700 mb-3">{error.message}</p>
            <button
              onClick={reset}
              className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium text-sm"
            >
              再試行
            </button>
          </div>
        </div>
      )}
    >
      <RouvisChatKitCompactContent className={className} />
    </ErrorBoundary>
  );
}
