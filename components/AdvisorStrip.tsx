'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

type AdvisorState = {
  nextTask?: string;
  weatherImpact?: { summary: string; detail: string; status: string };
  stageAdvice?: { summary: string; detail: string };
};

export function AdvisorStrip({ className = '', projectId: propProjectId }: { className?: string; projectId?: string }) {
  const t = useTranslations();
  const [state, setState] = useState<AdvisorState>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(propProjectId || null);

  const fetchAdvice = async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
      const body = propProjectId ? { projectId: propProjectId, forceRefresh } : { forceRefresh };
      const res = await fetch(`${baseUrl}/api/v1/agents/advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!res.ok) throw new Error('Failed to fetch advice');

      const data = await res.json();
      const advice = data.advice;

      if (advice) {
        setState({
          nextTask: advice.priorityTasks?.[0]?.summary,
          weatherImpact: advice.weatherImpact,
          stageAdvice: advice.stageAdvice
        });
      }
    } catch (error) {
      console.error('Error fetching advice:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdvice();
  }, [propProjectId]);

  if (loading && !state.weatherImpact) {
    return (
      <section className={`w-full rounded-xl border border-border bg-card p-4 ${className}`}>
        <div className="h-5 bg-secondary rounded w-1/3 mb-3 animate-pulse"></div>
        <div className="h-4 bg-secondary rounded w-2/3 animate-pulse"></div>
      </section>
    );
  }

  const weatherText = state.weatherImpact?.summary;
  const stageText = state.stageAdvice?.summary;
  const nextTaskText = state.nextTask;

  // If no advice available
  if (!weatherText && !stageText && !nextTaskText) {
    return (
      <section className={`w-full rounded-xl border border-border bg-card p-4 ${className}`}>
        <p className="text-sm text-muted-foreground">今日のアドバイスはありません</p>
      </section>
    );
  }

  return (
    <section
      role="region"
      aria-live="polite"
      className={`w-full rounded-xl border border-border bg-card p-4 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-medium text-foreground">今日のポイント</h2>
        <button
          onClick={() => fetchAdvice(true)}
          disabled={refreshing}
          className="text-xs text-muted-foreground hover:text-primary transition-colors disabled:opacity-50"
        >
          {refreshing ? '更新中...' : '更新'}
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {weatherText && (
          <p className="text-foreground">
            <span className="text-muted-foreground">天気:</span> {weatherText}
          </p>
        )}
        {stageText && (
          <p className="text-foreground">
            <span className="text-muted-foreground">栽培:</span> {stageText}
          </p>
        )}
        {nextTaskText && (
          <p className="text-primary font-medium mt-2 pt-2 border-t border-border">
            → {nextTaskText}
          </p>
        )}
      </div>
    </section>
  );
}
