'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface ProjectInsightsPanelProps {
  project: {
    id: string;
    crop: string;
    stage?: string;
  };
  onAskAI: () => void;
}

type AdviceBlock = {
  status?: 'safe' | 'warning' | 'critical' | string;
  summary?: string;
  detail?: string;
  message?: string;
};

type AdviceTask = string | { summary?: string; detail?: string };

type Advice = {
  weatherImpact?: AdviceBlock;
  stageAdvice?: { summary?: string; detail?: string; message?: string };
  priorityTasks?: AdviceTask[];
};

function normalizeTone(status?: string): 'safe' | 'warning' | 'critical' {
  if (status === 'critical') return 'critical';
  if (status === 'warning') return 'warning';
  return 'safe';
}

function toneClass(tone: 'safe' | 'warning' | 'critical'): string {
  if (tone === 'critical') return 'status-critical';
  if (tone === 'warning') return 'status-warning';
  return 'status-safe';
}

function toneIcon(tone: 'safe' | 'warning' | 'critical'): string {
  if (tone === 'critical') return 'error';
  if (tone === 'warning') return 'warning';
  return 'check_circle';
}

export default function ProjectInsightsPanel({ project, onAskAI }: ProjectInsightsPanelProps) {
  const t = useTranslations('projects.insights_panel');
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<Advice | null>(null);
  const [hasError, setHasError] = useState(false);
  const [expandedWeather, setExpandedWeather] = useState(false);
  const [expandedStage, setExpandedStage] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState<number[]>([]);

  useEffect(() => {
    let isActive = true;

    const fetchAdvice = async () => {
      setLoading(true);
      setHasError(false);

      try {
        const res = await fetch('/api/v1/agents/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: project.id }),
        });

        if (!res.ok) {
          if (isActive) {
            setHasError(true);
            setInsights(null);
          }
          return;
        }

        const data = (await res.json()) as { advice?: Advice };
        if (isActive) {
          setInsights(data.advice || null);
        }
      } catch (error) {
        console.error('Failed to fetch advice:', error);
        if (isActive) {
          setHasError(true);
          setInsights(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    void fetchAdvice();

    return () => {
      isActive = false;
    };
  }, [project.id]);

  const toggleTaskExpansion = (index: number) => {
    setExpandedTasks((prev) =>
      prev.includes(index)
        ? prev.filter((value) => value !== index)
        : [...prev, index]
    );
  };

  if (loading) {
    return (
      <div className="surface-base p-4 sm:p-5">
        <div className="mb-3 h-5 w-44 animate-pulse rounded bg-secondary" />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="control-inset h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hasError || !insights) {
    return (
      <div className="surface-base p-4 text-sm">
        <div className="status-critical flex items-center justify-between gap-3 rounded-lg px-3 py-2">
          <span>{t('fetch_failed')}</span>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="touch-target rounded-md border border-current/30 px-3 py-1 text-xs font-semibold hover:bg-black/5"
          >
            {t('retry')}
          </button>
        </div>
      </div>
    );
  }

  const weatherTone = normalizeTone(insights.weatherImpact?.status);
  const weatherSummary = expandedWeather
    ? insights.weatherImpact?.detail
    : insights.weatherImpact?.summary || insights.weatherImpact?.message;

  const stageSummary = expandedStage
    ? insights.stageAdvice?.detail
    : insights.stageAdvice?.summary || insights.stageAdvice?.message;

  const priorityTasks = Array.isArray(insights.priorityTasks) ? insights.priorityTasks : [];

  return (
    <section className="surface-base p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="material-symbols-outlined text-brand-seedling">auto_awesome</span>
          {t('title')}
        </h3>
        <button
          type="button"
          onClick={onAskAI}
          className="touch-target inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <span className="material-symbols-outlined text-[15px]">chat</span>
          {t('ask_ai')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="control-inset p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('weather_impact')}</p>
          <div className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${toneClass(weatherTone)}`}>
            <span className="material-symbols-outlined text-[13px]">{toneIcon(weatherTone)}</span>
            <span>{t(`tone_${weatherTone}`)}</span>
          </div>
          <p className="text-sm text-foreground">{weatherSummary || t('no_data')}</p>
          {insights.weatherImpact?.detail ? (
            <button
              type="button"
              onClick={() => setExpandedWeather((prev) => !prev)}
              className="mt-2 text-xs font-semibold text-brand-waterline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expandedWeather ? t('collapse') : t('expand')}
            </button>
          ) : null}
        </article>

        <article className="control-inset p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('stage_advice')}</p>
          <p className="text-sm text-foreground whitespace-pre-line">{stageSummary || t('no_data')}</p>
          {insights.stageAdvice?.detail ? (
            <button
              type="button"
              onClick={() => setExpandedStage((prev) => !prev)}
              className="mt-2 text-xs font-semibold text-brand-waterline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expandedStage ? t('collapse') : t('expand')}
            </button>
          ) : null}
        </article>

        <article className="control-inset p-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('priority_tasks')}</p>
          {priorityTasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('no_priority_tasks')}</p>
          ) : (
            <ul className="space-y-2">
              {priorityTasks.map((task, index) => {
                const isExpanded = expandedTasks.includes(index);
                const summary = typeof task === 'string' ? task : task.summary || task.detail || t('no_data');
                const detail = typeof task === 'string' ? null : task.detail;
                const hasDetail = Boolean(detail && detail !== summary);

                return (
                  <li key={`${index}-${summary.slice(0, 12)}`} className="rounded-md border border-border/70 bg-card px-2 py-1.5 text-sm text-foreground">
                    <div className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-brand-seedling" />
                      <div className="min-w-0 flex-1">
                        <p className="break-words">{hasDetail && isExpanded ? detail : summary}</p>
                        {hasDetail ? (
                          <button
                            type="button"
                            onClick={() => toggleTaskExpansion(index)}
                            className="mt-1 text-xs font-semibold text-brand-waterline hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {isExpanded ? t('collapse') : t('expand')}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}
