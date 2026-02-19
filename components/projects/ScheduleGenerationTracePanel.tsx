'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type RunState = 'queued' | 'running' | 'succeeded' | 'failed';

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
  onRunIdChange?: (runId: string | null) => void;
  onSucceeded?: () => void;
};

function isTerminal(state: RunState | null): boolean {
  return state === 'succeeded' || state === 'failed';
}

function formatEventTime(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function ScheduleGenerationTracePanel({
  runId,
  onRunIdChange,
  onSucceeded,
}: Props) {
  const [activeRunId, setActiveRunId] = useState(runId);
  const [run, setRun] = useState<ScheduleGenerationRunDto | null>(null);
  const [events, setEvents] = useState<ScheduleGenerationEventDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollingMode, setPollingMode] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const succeededNotifiedRef = useRef(false);

  useEffect(() => {
    setActiveRunId(runId);
    setRun(null);
    setEvents([]);
    setCursor(null);
    setError(null);
    setPollingMode(false);
    setLoading(true);
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

  const statusLabel = useMemo(() => {
    switch (run?.state) {
      case 'queued':
        return 'Queued';
      case 'running':
        return 'Running';
      case 'succeeded':
        return 'Succeeded';
      case 'failed':
        return 'Failed';
      default:
        return 'Loading';
    }
  }, [run?.state]);

  const engineLabel = useMemo(() => {
    const fromRun = run?.engine;
    if (fromRun === 'vertical_planner_v1') return 'vertical_planner_v1';
    if (fromRun === 'legacy_llm') return 'legacy_llm';

    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      const engine = typeof event.meta?.engine === 'string' ? event.meta.engine : null;
      if (engine === 'vertical_planner_v1' || engine === 'legacy_llm') {
        return engine;
      }
    }
    return 'unknown';
  }, [events, run?.engine]);

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

  return (
    <div className="mb-3 rounded-lg border border-border bg-card p-3" data-testid="schedule-generation-trace-panel">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Schedule Generation</p>
          <p className="text-sm font-semibold text-foreground">Status: {statusLabel}</p>
        </div>
        {run?.state === 'failed' && run.retryable ? (
          <button
            type="button"
            onClick={() => {
              void handleRetry();
            }}
            disabled={retrying}
            className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {retrying ? 'Retrying...' : 'Retry'}
          </button>
        ) : null}
      </div>

      <div className="mb-2 text-xs text-muted-foreground">
        <p>Run ID: <span className="font-mono text-[11px] text-foreground">{activeRunId}</span></p>
        <p>Engine: <span className="font-mono text-[11px] text-foreground">{engineLabel}</span></p>
        {run?.plannerVersion ? <p>Planner: <span className="font-mono text-[11px] text-foreground">{run.plannerVersion}</span></p> : null}
        {run?.rulesetVersion ? <p>Ruleset: <span className="font-mono text-[11px] text-foreground">{run.rulesetVersion}</span></p> : null}
        {typeof run?.optimizerUsed === 'boolean' ? <p>Optimizer: <span className="font-mono text-[11px] text-foreground">{run.optimizerUsed ? 'enabled' : 'disabled'}</span></p> : null}
        {run?.errorMessage ? <p className="mt-1 text-red-700">{run.errorMessage}</p> : null}
        {loading ? <p className="mt-1">Loading trace...</p> : null}
        {error ? <p className="mt-1 text-red-700">{error}</p> : null}
      </div>

      <div className="max-h-48 overflow-y-auto rounded-md border border-border/70 bg-background/40 p-2">
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No trace events yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.map((event) => (
              <li key={event.cursor} className="text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="font-mono text-[10px]">{formatEventTime(event.createdAt)}</span>
                  <span className="uppercase tracking-[0.06em]">{event.type}</span>
                  {event.stage ? <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] text-secondary-foreground">{event.stage}</span> : null}
                </div>
                {event.title ? <p className="font-medium text-foreground">{event.title}</p> : null}
                {event.detail ? <p className="text-foreground/90">{event.detail}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
