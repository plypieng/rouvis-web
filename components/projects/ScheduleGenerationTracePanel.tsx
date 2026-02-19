'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

type RunState = 'queued' | 'running' | 'succeeded' | 'failed';
type PanelVariant = 'banner' | 'card';

type ScheduleGenerationRunDto = {
  id: string;
  projectId: string;
  source: 'wizard_initial' | 'project_replan';
  replanMode: 'replace_open' | 'replace_all' | null;
  engine?: 'legacy_llm' | 'vertical_planner_v1';
  plannerVersion?: string | null;
  rulesetVersion?: string | null;
  optimizerUsed?: boolean | null;
  state: RunState;
  attemptsUsed: number;
  maxAttempts: number;
  retryable: boolean;
  commitRevisionId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
};

type ScheduleGenerationEventDto = {
  cursor: string;
  runId: string;
  type: 'stage' | 'reasoning_summary' | 'metric' | 'state' | 'error' | 'system';
  stage: string | null;
  title: string | null;
  detail: string | null;
  meta: Record<string, unknown> | null;
  createdAt: string;
};

type Props = {
  runId: string;
  variant?: PanelVariant;
  onRunIdChange?: (runId: string | null) => void;
  onSucceeded?: () => void;
};

const STAGE_PROGRESS: Record<string, number> = {
  queued: 12,
  observe_context: 22,
  planner_compile_constraints: 30,
  planner_build_baseline: 42,
  planner_weather_adjust: 55,
  planner_optimizer: 66,
  planner_validate: 74,
  model_generation: 74,
  commit_revision: 92,
  completed: 100,
};

function isTerminal(state: RunState | null): boolean {
  return state === 'succeeded' || state === 'failed';
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function resolveProgress(state: RunState | null, latestStage: string | null): number {
  if (state === 'succeeded') return 100;
  if (state === 'queued') return 12;
  if (state === 'running') {
    if (latestStage && STAGE_PROGRESS[latestStage]) return STAGE_PROGRESS[latestStage];
    return 48;
  }
  if (state === 'failed') {
    if (latestStage && STAGE_PROGRESS[latestStage]) return Math.min(95, STAGE_PROGRESS[latestStage]);
    return 76;
  }
  return 8;
}

export default function ScheduleGenerationTracePanel({
  runId,
  variant = 'card',
  onRunIdChange,
  onSucceeded,
}: Props) {
  const t = useTranslations('projects');
  const [activeRunId, setActiveRunId] = useState(runId);
  const [run, setRun] = useState<ScheduleGenerationRunDto | null>(null);
  const [events, setEvents] = useState<ScheduleGenerationEventDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingMode, setPollingMode] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const succeededNotifiedRef = useRef(false);

  useEffect(() => {
    setActiveRunId(runId);
    setRun(null);
    setEvents([]);
    setCursor(null);
    setError(null);
    setPollingMode(false);
    setLoading(true);
    setDetailsOpen(false);
    succeededNotifiedRef.current = false;
  }, [runId]);

  const appendEvents = useCallback((incoming: ScheduleGenerationEventDto[]) => {
    if (!incoming.length) return;
    setEvents((current) => {
      const seen = new Set(current.map((event) => event.cursor));
      const next = [...current];
      for (const event of incoming) {
        if (seen.has(event.cursor)) continue;
        next.push(event);
        seen.add(event.cursor);
      }
      next.sort((left, right) => {
        const leftCursor = BigInt(left.cursor);
        const rightCursor = BigInt(right.cursor);
        if (leftCursor === rightCursor) return 0;
        return leftCursor > rightCursor ? 1 : -1;
      });
      return next.slice(-120);
    });

    setCursor((current) => {
      const latest = incoming[incoming.length - 1]?.cursor;
      if (!latest) return current;
      if (!current) return latest;
      return BigInt(latest) > BigInt(current) ? latest : current;
    });
  }, []);

  const fetchRun = useCallback(async () => {
    const response = await fetch(`/api/v1/agents/schedule-generation/runs/${encodeURIComponent(activeRunId)}`, {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        (payload as Record<string, unknown>)?.message as string
        || (payload as Record<string, unknown>)?.error as string
        || 'Failed to load run status'
      );
    }

    const nextRun = payload as ScheduleGenerationRunDto;
    setRun(nextRun);
    if (nextRun.state === 'succeeded' && !succeededNotifiedRef.current) {
      succeededNotifiedRef.current = true;
      onSucceeded?.();
    }
    return nextRun;
  }, [activeRunId, onSucceeded]);

  const fetchEvents = useCallback(async () => {
    const query = cursor ? `?after=${encodeURIComponent(cursor)}&limit=100` : '?limit=100';
    const response = await fetch(`/api/v1/agents/schedule-generation/runs/${encodeURIComponent(activeRunId)}/events${query}`, {
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(
        (payload as Record<string, unknown>)?.message as string
        || (payload as Record<string, unknown>)?.error as string
        || 'Failed to load run events'
      );
    }

    const rows = Array.isArray((payload as Record<string, unknown>)?.events)
      ? ((payload as Record<string, unknown>).events as ScheduleGenerationEventDto[])
      : [];
    appendEvents(rows);
  }, [activeRunId, appendEvents, cursor]);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        setLoading(true);
        await fetchRun();
        await fetchEvents();
      } catch (fetchError) {
        if (!cancelled) {
          setError(fetchError instanceof Error ? fetchError.message : 'Failed to load generation trace');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [fetchEvents, fetchRun]);

  useEffect(() => {
    if (!activeRunId) return;
    if (pollingMode) return;
    if (isTerminal(run?.state ?? null)) return;

    const streamUrl = new URL(`/api/v1/agents/schedule-generation/runs/${encodeURIComponent(activeRunId)}/stream`, window.location.origin);
    if (cursor) {
      streamUrl.searchParams.set('after', cursor);
    }

    const stream = new EventSource(streamUrl.toString());
    stream.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as ScheduleGenerationEventDto;
        appendEvents([payload]);
      } catch {
        // ignore malformed SSE payloads
      }
    };
    stream.onerror = () => {
      stream.close();
      setPollingMode(true);
    };

    return () => {
      stream.close();
    };
  }, [activeRunId, appendEvents, cursor, pollingMode, run?.state]);

  useEffect(() => {
    if (!activeRunId) return;
    if (!pollingMode && !isTerminal(run?.state ?? null)) return;
    if (isTerminal(run?.state ?? null)) return;

    const interval = setInterval(() => {
      void fetchRun().catch(() => undefined);
      void fetchEvents().catch(() => undefined);
    }, 1500);

    return () => {
      clearInterval(interval);
    };
  }, [activeRunId, fetchEvents, fetchRun, pollingMode, run?.state]);

  const latestEvent = useMemo(() => {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const event = events[index];
      if (event.title || event.detail) return event;
    }
    return null;
  }, [events]);

  const statusLabel = useMemo(() => {
    switch (run?.state) {
      case 'queued':
        return t('generation_panel_state_queued');
      case 'running':
        return t('generation_panel_state_running');
      case 'succeeded':
        return t('generation_panel_state_succeeded');
      case 'failed':
        return t('generation_panel_state_failed');
      default:
        return t('generation_panel_state_running');
    }
  }, [run?.state, t]);

  const titleLabel = useMemo(() => {
    switch (run?.state) {
      case 'queued':
        return t('generation_panel_title_queued');
      case 'running':
        return t('generation_panel_title_running');
      case 'succeeded':
        return t('generation_panel_title_succeeded');
      case 'failed':
        return t('generation_panel_title_failed');
      default:
        return t('generation_panel_title_running');
    }
  }, [run?.state, t]);

  const subtitleLabel = useMemo(() => {
    switch (run?.state) {
      case 'queued':
        return t('generation_panel_subtitle_queued');
      case 'running':
        return variant === 'banner' ? t('generation_panel_banner_running') : t('generation_panel_subtitle_running');
      case 'succeeded':
        return t('generation_panel_subtitle_succeeded');
      case 'failed':
        return variant === 'banner' ? t('generation_panel_banner_failed') : t('generation_panel_subtitle_failed');
      default:
        return t('generation_panel_subtitle_running');
    }
  }, [run?.state, t, variant]);

  const progressValue = useMemo(
    () => resolveProgress(run?.state ?? null, latestEvent?.stage ?? null),
    [latestEvent?.stage, run?.state]
  );

  const friendlyError = useMemo(() => {
    if (run?.state !== 'failed') return null;
    if (run.errorCode === 'MODEL_TIMEOUT') {
      return t('generation_panel_error_model_timeout');
    }
    return t('generation_panel_error_generic');
  }, [run?.errorCode, run?.state, t]);

  const engineLabel = useMemo(() => {
    const engine = run?.engine;
    if (engine === 'vertical_planner_v1') return 'Vertical Planner v1';
    if (engine === 'legacy_llm') return 'Legacy LLM';
    return 'unknown';
  }, [run?.engine]);

  const handleRetry = useCallback(async () => {
    if (!run?.retryable || retrying) return;

    try {
      setRetrying(true);
      setError(null);
      const response = await fetch(`/api/v1/agents/schedule-generation/runs/${encodeURIComponent(activeRunId)}/retry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          (payload as Record<string, unknown>)?.message as string
          || (payload as Record<string, unknown>)?.error as string
          || 'Retry failed'
        );
      }

      const generation = (payload as Record<string, unknown>)?.generation as Record<string, unknown> | undefined;
      const nextRunId = typeof generation?.runId === 'string' ? generation.runId : null;
      if (!nextRunId) {
        throw new Error('Retry response did not include runId');
      }

      setActiveRunId(nextRunId);
      onRunIdChange?.(nextRunId);
      setEvents([]);
      setCursor(null);
      setPollingMode(false);
      setDetailsOpen(false);
      succeededNotifiedRef.current = false;
      setRun(null);
      setLoading(true);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Retry failed');
    } finally {
      setRetrying(false);
    }
  }, [activeRunId, onRunIdChange, retrying, run?.retryable]);

  if (!activeRunId) return null;

  const wrapperClassName = variant === 'banner'
    ? 'rounded-xl border border-border/70 bg-card px-3 py-2'
    : 'rounded-2xl border border-border bg-card px-5 py-4 shadow-sm';
  const statusClassName = run?.state === 'failed'
    ? 'bg-destructive/15 text-destructive'
    : run?.state === 'succeeded'
      ? 'bg-emerald-100 text-emerald-800'
      : 'bg-amber-100 text-amber-800';
  const detailEvents = events.slice(-20);
  const latestTitle = latestEvent?.title || latestEvent?.detail || t('generation_panel_no_updates');
  const latestDetail = latestEvent?.title && latestEvent?.detail ? latestEvent.detail : null;

  return (
    <section className={wrapperClassName} data-testid="schedule-generation-trace-panel">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {t('generation_panel_badge')}
          </p>
          <h3 className={`mt-0.5 ${variant === 'banner' ? 'text-sm' : 'text-lg'} font-semibold text-foreground`}>
            {titleLabel}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitleLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusClassName}`}>
            {statusLabel}
          </span>
          {run?.state === 'failed' && run.retryable ? (
            <button
              type="button"
              onClick={() => {
                void handleRetry();
              }}
              disabled={retrying}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
            >
              {retrying ? t('generation_panel_retrying') : t('generation_panel_retry')}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3">
        <div className="h-2 rounded-full bg-secondary">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${run?.state === 'failed' ? 'bg-destructive/75' : 'bg-primary'}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      <div className="mt-2 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {t('generation_panel_latest_step')}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{latestTitle}</p>
        {latestDetail ? <p className="text-xs text-muted-foreground">{latestDetail}</p> : null}
        {latestEvent ? (
          <p className="mt-1 text-[11px] text-muted-foreground">{formatEventTime(latestEvent.createdAt)}</p>
        ) : null}
      </div>

      {friendlyError ? (
        <p className="mt-2 text-sm font-medium text-destructive">{friendlyError}</p>
      ) : null}

      {loading ? <p className="mt-2 text-xs text-muted-foreground">{t('generation_panel_loading')}</p> : null}
      {error ? <p className="mt-2 text-xs text-destructive">{error}</p> : null}

      <div className="mt-2">
        <button
          type="button"
          onClick={() => setDetailsOpen((value) => !value)}
          className="text-xs font-semibold text-muted-foreground underline underline-offset-2 hover:text-foreground"
        >
          {detailsOpen ? t('generation_panel_hide_details') : t('generation_panel_show_details')}
        </button>
      </div>

      {detailsOpen ? (
        <div className="mt-2 rounded-lg border border-border/70 bg-background/40 p-2">
          <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <p>{t('generation_panel_run_id')}: <span className="font-mono text-[11px] text-foreground">{activeRunId}</span></p>
            <p>{t('generation_panel_engine')}: <span className="text-foreground">{engineLabel}</span></p>
            {run?.plannerVersion ? <p>{t('generation_panel_planner')}: <span className="text-foreground">{run.plannerVersion}</span></p> : null}
            {run?.rulesetVersion ? <p>{t('generation_panel_ruleset')}: <span className="text-foreground">{run.rulesetVersion}</span></p> : null}
            {typeof run?.optimizerUsed === 'boolean' ? (
              <p>{t('generation_panel_optimizer')}: <span className="text-foreground">{run.optimizerUsed ? t('generation_panel_optimizer_on') : t('generation_panel_optimizer_off')}</span></p>
            ) : null}
            {run?.errorCode ? <p>{t('generation_panel_error')}: <span className="text-foreground">{run.errorCode}</span></p> : null}
          </div>

          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border/70 bg-card p-2">
            {detailEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('generation_panel_no_updates')}</p>
            ) : (
              <ul className="space-y-1.5">
                {detailEvents.map((event) => (
                  <li key={event.cursor} className="text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-mono text-[10px]">{formatEventTime(event.createdAt)}</span>
                      <span className="uppercase tracking-[0.06em]">{event.type}</span>
                      {event.stage ? (
                        <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">
                          {event.stage}
                        </span>
                      ) : null}
                    </div>
                    {event.title ? <p className="font-medium text-foreground">{event.title}</p> : null}
                    {event.detail ? <p className="text-foreground/90">{event.detail}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
