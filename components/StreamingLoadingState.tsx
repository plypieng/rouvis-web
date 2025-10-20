'use client';

import { useEffect, useState } from 'react';
import { LoadingState, AgentType } from '@/types/chat';

interface StreamingLoadingStateProps {
  loadingState: LoadingState;
  className?: string;
}

const AGENT_MESSAGES: Record<AgentType, string[]> = {
  triage: [
    '🎯 リクエストを分析中...',
    '🎯 最適なエージェントを選択中...',
    '🎯 タスクを振り分け中...',
  ],
  planner: [
    '📋 作業計画を立案中...',
    '📋 スケジュールを最適化中...',
    '📋 タスクを整理中...',
  ],
  weather: [
    '🌤️ JMA気象データを確認中...',
    '🌤️ 天気予報を取得中...',
    '🌤️ 気象リスクを分析中...',
  ],
  crop_coach: [
    '📚 ガイドブックを検索中...',
    '🌱 作物情報を調査中...',
    '📚 栽培ガイドを参照中...',
  ],
  scheduler: [
    '📅 スケジュールを作成中...',
    '📅 タスクを調整中...',
    '📅 作業計画を更新中...',
  ],
};

const GENERIC_MESSAGES = [
  '💭 考え中...',
  '🤔 情報を処理中...',
  '⚙️ 作業中...',
];

export function StreamingLoadingState({ loadingState, className = '' }: StreamingLoadingStateProps) {
  const [dots, setDots] = useState('');
  const [messageIndex, setMessageIndex] = useState(0);

  const { isLoading, message, agent, progress } = loadingState;

  // Animate dots
  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);

  // Rotate through messages if no custom message
  useEffect(() => {
    if (!isLoading || message) return;

    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % 3);
    }, 3000);

    return () => clearInterval(interval);
  }, [isLoading, message]);

  if (!isLoading) return null;

  // Determine display message
  const displayMessage = message || 
    (agent ? AGENT_MESSAGES[agent][messageIndex] : GENERIC_MESSAGES[messageIndex]);

  return (
    <div className={`flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 ${className}`}>
      {/* Animated Spinner */}
      <div className="relative">
        <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        {agent && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs">
              {agent === 'triage' && '🎯'}
              {agent === 'planner' && '📋'}
              {agent === 'weather' && '🌤️'}
              {agent === 'crop_coach' && '🌱'}
              {agent === 'scheduler' && '📅'}
            </span>
          </div>
        )}
      </div>

      {/* Message */}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">
            {displayMessage}
          </span>
          <span className="text-gray-600 w-4">{dots}</span>
        </div>

        {/* Progress Bar */}
        {progress !== undefined && (
          <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Animated Dots */}
      <div className="flex gap-1">
        <span
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }}
        />
        <span
          className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }}
        />
        <span
          className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }}
        />
      </div>
    </div>
  );
}