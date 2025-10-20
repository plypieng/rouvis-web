'use client';

import { useCallback, useState } from 'react';
import { ChatKit, useChatKit } from '@openai/chatkit-react';
import { useTranslations } from 'next-intl';
import {
  CREATE_SESSION_ENDPOINT,
  WORKFLOW_ID,
  isWorkflowConfigured,
} from '@/lib/chatkit';
import { ErrorBoundary } from './ErrorBoundary';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { StreamingLoadingState } from './StreamingLoadingState';
import { NaturalEvidenceCard } from './NaturalEvidenceCard';
import { JMAEvidenceCard } from './JMAEvidenceCard';
import { RAGContextBadge } from './RAGContextBadge';
import { AgentStatus, Citation, JMAData, RAGContext, LoadingState } from '@/types/chat';

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

  const getClientSecret = useCallback(async () => {
    if (!isWorkflowConfigured()) {
      throw new Error('NEXT_PUBLIC_CHATKIT_WORKFLOW_ID is not configured.');
    }

    const response = await fetch(CREATE_SESSION_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workflow: { id: WORKFLOW_ID },
        chatkit_configuration: {
          file_upload: { enabled: true },
        },
      }),
    });

    const raw = await response.text();
    let payload: Record<string, unknown> = {};
    if (raw) {
      try {
        payload = JSON.parse(raw) as Record<string, unknown>;
      } catch (error) {
        console.error('Failed to parse ChatKit session response', error);
      }
    }

    if (!response.ok) {
      const message =
        (typeof payload.error === 'string' && payload.error) ||
        response.statusText ||
        'Failed to create ChatKit session';
      throw new Error(message);
    }

    const secret = payload?.client_secret;
    if (typeof secret !== 'string' || secret.length === 0) {
      throw new Error('Missing client secret in ChatKit session response.');
    }

    return secret;
  }, []);

  const { control } = useChatKit({
    api: { getClientSecret },
    theme: {
      colorScheme: 'light',
      color: {
        accent: { primary: '#16a34a', level: 2 },
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
        'こんにちは！新潟の農業アドバイザーです。今日は何をお手伝いしましょうか？',
      prompts: [
        {
          label: t('chat.prompts.today_label') || '💬 今日は何をすればいい？',
          prompt:
            t('chat.prompts.today') ||
            '今日は何をすればいいですか？',
        },
        {
          label: t('chat.prompts.weather_label') || '🌤️ 天気はどう？',
          prompt:
            t('chat.prompts.weather') ||
            '今週の天気と気をつけることを教えてください',
        },
        {
          label: t('chat.prompts.frost_label') || '❄️ 霜は来る？',
          prompt:
            t('chat.prompts.frost') ||
            '冷え込みが来そうですか？コシヒカリの対策を教えてください',
        },
        {
          label: t('chat.prompts.watering_label') || '💧 水やりは必要？',
          prompt:
            t('chat.prompts.watering') ||
            '今日は水やりをした方がいいですか？',
        },
      ],
    },
    composer: {
      placeholder:
        t('chat.placeholder') ||
        '質問や作業記録を入力してください...',
      tools: [
        {
          id: 'attach-field',
          label: t('chat.tools.attach_field') || '圃場',
          icon: 'map-pin',
          pinned: true,
        },
        {
          id: 'attach-photo',
          label: t('chat.tools.attach_photo') || '写真',
          icon: 'square-image',
          pinned: true,
        },
      ],
    },
    onClientTool: async (toolCall) => {
      switch (toolCall.name) {
        case 'attach-field':
          // TODO: Fetch fields from GET /v1/fields and show selector
          return { field_selected: true };
        case 'attach-photo':
          // TODO: Open file picker for photos
          return { photo_attached: true };
        default:
          throw new Error(`Unknown tool: ${toolCall.name}`);
      }
    },
    onThreadChange: ({ threadId }) => {
      console.log('Thread changed:', threadId);
      // Reset state for new thread
      setCitations([]);
      setJMAData(null);
      setRAGContext(null);
      setAgentStatus(null);
    },
    onResponseStart: () => {
      console.log('AI response starting');
      setLoadingState({
        isLoading: true,
        message: '確認しています...',
        agent: 'triage',
      });
    },
    onResponseEnd: () => {
      console.log('AI response completed');
      setLoadingState({ isLoading: false });
      setAgentStatus(null);
      
      // TODO Week 3: In a real implementation, parse SSE events to extract:
      // - Agent handoffs (update agentStatus)
      // - Citations (add to citations array)
      // - JMA data (update jmaData)
      // - RAG context (update ragContext)
    },
    locale: 'ja',
  });

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Agent Status Indicator */}
      {agentStatus && (
        <div className="animate-slideIn">
          <AgentStatusIndicator status={agentStatus} />
        </div>
      )}

      {/* Loading State */}
      {loadingState.isLoading && (
        <StreamingLoadingState loadingState={loadingState} />
      )}

      {/* Main Chat Interface */}
      <div className="flex-1 min-h-0">
        <ChatKit
          control={control}
          className={className || 'h-full w-full'}
        />
      </div>

      {/* Evidence Section - Natural format without technical jargon */}
      {(citations.length > 0 || jmaData) && (
        <div className="space-y-3 max-h-96 overflow-y-auto animate-fadeIn">
          {/* Citations - Natural Evidence Card */}
          {citations.length > 0 && (
            <NaturalEvidenceCard
              citations={citations}
              showMultipleSourceConfirmation={true}
            />
          )}

          {/* JMA Weather Data - Only show if present */}
          {jmaData && (
            <JMAEvidenceCard data={jmaData} />
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
                <h3 className="font-semibold text-gray-900">チャットエラー</h3>
                <p className="text-sm text-gray-600">チャットの読み込みに失敗しました</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 mb-4">{error.message}</p>
            <button
              onClick={reset}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              再試行
            </button>
          </div>
        </div>
      )}
    >
      <RouvisChatKitContent className={className} />
    </ErrorBoundary>
  );
}
