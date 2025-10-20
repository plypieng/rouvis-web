'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AgentStatus, AgentType } from '@/types/chat';

interface AgentStatusIndicatorProps {
  status: AgentStatus | null;
  className?: string;
}

const AGENT_COLORS: Record<AgentType, string> = {
  triage: 'bg-blue-500 border-blue-600',
  planner: 'bg-purple-500 border-purple-600',
  weather: 'bg-sky-500 border-sky-600',
  crop_coach: 'bg-green-500 border-green-600',
  scheduler: 'bg-orange-500 border-orange-600',
};

const AGENT_ICONS: Record<AgentType, string> = {
  triage: '🎯',
  planner: '📋',
  weather: '🌤️',
  crop_coach: '🌱',
  scheduler: '📅',
};

const AGENT_LABELS: Record<AgentType, { en: string; ja: string }> = {
  triage: { en: 'Triage', ja: '振り分け' },
  planner: { en: 'Planner', ja: 'プランナー' },
  weather: { en: 'Weather & Risk', ja: '気象・リスク' },
  crop_coach: { en: 'Crop Coach', ja: '作物コーチ' },
  scheduler: { en: 'Scheduler', ja: 'スケジューラー' },
};

export function AgentStatusIndicator({ status, className = '' }: AgentStatusIndicatorProps) {
  const t = useTranslations();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [prevAgent, setPrevAgent] = useState<AgentType | null>(null);

  useEffect(() => {
    if (status && prevAgent && status.current !== prevAgent) {
      setIsTransitioning(true);
      const timer = setTimeout(() => setIsTransitioning(false), 600);
      return () => clearTimeout(timer);
    }
    if (status) {
      setPrevAgent(status.current);
    }
  }, [status, prevAgent]);

  if (!status) {
    return null;
  }

  const agentColor = AGENT_COLORS[status.current];
  const agentIcon = AGENT_ICONS[status.current];
  const agentLabel = AGENT_LABELS[status.current];

  return (
    <div className={`relative ${className}`}>
      <div
        className={`
          flex items-center gap-3 p-4 rounded-lg border-2 
          ${agentColor} bg-opacity-10 backdrop-blur-sm
          transition-all duration-300 ease-in-out
          ${isTransitioning ? 'scale-105 shadow-lg' : 'scale-100'}
        `}
      >
        {/* Agent Icon */}
        <div
          className={`
            flex items-center justify-center w-12 h-12 rounded-full
            ${agentColor} bg-opacity-90
            transition-transform duration-300
            ${isTransitioning ? 'rotate-180' : 'rotate-0'}
          `}
        >
          <span className="text-2xl">{agentIcon}</span>
        </div>

        {/* Agent Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
              {agentLabel.ja}
            </h3>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {agentLabel.en}
            </span>
          </div>

          {/* Thinking State */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-700 dark:text-gray-300 truncate">
              {status.thinking}
            </p>
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>

          {/* Progress Bar */}
          {status.progress !== undefined && (
            <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full ${agentColor.split(' ')[0]} transition-all duration-500 ease-out`}
                style={{ width: `${status.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Handoff Animation */}
        {isTransitioning && (
          <div className="absolute -right-2 top-1/2 transform -translate-y-1/2">
            <div className="flex items-center">
              <div className="w-6 h-0.5 bg-gradient-to-r from-gray-400 to-transparent animate-pulse" />
              <svg
                className="w-4 h-4 text-gray-600 animate-pulse"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Agent History Trail (optional visual enhancement) */}
      {isTransitioning && prevAgent && prevAgent !== status.current && (
        <div className="absolute -bottom-8 left-0 right-0 flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>{AGENT_ICONS[prevAgent]}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
          </svg>
          <span>{AGENT_ICONS[status.current]}</span>
        </div>
      )}
    </div>
  );
}