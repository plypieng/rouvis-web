'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type SchedulerAsyncRunState = 'queued' | 'running' | 'merged' | 'skipped' | 'failed';

type SchedulerAsyncRun = {
  id: string;
  jobId: string;
  state: SchedulerAsyncRunState;
  resultStatus?: string;
  summary?: string;
  error?: string;
  queuedAt: string;
  startedAt?: string;
  completedAt?: string;
  retryOfRunId?: string;
};

type LifecycleResponse = {
  lifecycleRuns?: SchedulerAsyncRun[];
  queueDepth?: number;
};

function formatDate(value?: string): string {
  if (!value) return '-';
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) return value;
  return new Date(parsed).toLocaleString();
}

function stateClass(state: SchedulerAsyncRunState): string {
  if (state === 'queued') return 'bg-amber-100 text-amber-800';
  if (state === 'running') return 'bg-blue-100 text-blue-800';
  if (state === 'merged') return 'bg-emerald-100 text-emerald-800';
  if (state === 'skipped') return 'bg-slate-100 text-slate-700';
  return 'bg-rose-100 text-rose-800';
}

export function SchedulerRunLifecyclePanel() {
  const apiBase = useMemo(() => process.env.NEXT_PUBLIC_API_BASE_URL || '', []);
  const [jobId, setJobId] = useState('');
  const [runs, setRuns] = useState<SchedulerAsyncRun[]>([]);
  const [queueDepth, setQueueDepth] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/agents/scheduler/job-runs?limit=30&refresh=1`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error(`Failed to load scheduler runs (${response.status})`);
      }
      const data = await response.json() as LifecycleResponse;
      setRuns(Array.isArray(data.lifecycleRuns) ? data.lifecycleRuns : []);
      setQueueDepth(typeof data.queueDepth === 'number' ? data.queueDepth : 0);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load runs');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    void refreshRuns();
  }, [refreshRuns]);

  useEffect(() => {
    const hasActive = runs.some(run => run.state === 'queued' || run.state === 'running');
    if (!hasActive) return;

    const interval = setInterval(() => {
      void refreshRuns();
    }, 4000);
    return () => clearInterval(interval);
  }, [runs, refreshRuns]);

  const queueRun = useCallback(async () => {
    const trimmed = jobId.trim();
    if (!trimmed) {
      setError('Enter a scheduler job ID first.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/agents/scheduler/run-now`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ jobId: trimmed, mode: 'async' }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Failed to queue run (${response.status})`);
      }
      await refreshRuns();
    } catch (queueError) {
      setError(queueError instanceof Error ? queueError.message : 'Failed to queue run');
    } finally {
      setSubmitting(false);
    }
  }, [apiBase, jobId, refreshRuns]);

  const retryRun = useCallback(async (runId: string) => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch(`${apiBase}/api/v1/agents/scheduler/job-runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action: 'retry', runId }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Retry failed (${response.status})`);
      }
      await refreshRuns();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Retry failed');
    } finally {
      setSubmitting(false);
    }
  }, [apiBase, refreshRuns]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <label className="flex-1">
            <span className="mb-1 block text-sm font-medium text-gray-700">Scheduler Job ID</span>
            <input
              value={jobId}
              onChange={(event) => setJobId(event.target.value)}
              placeholder="job-uuid"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </label>
          <button
            onClick={() => void queueRun()}
            disabled={submitting}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Queue Run
          </button>
          <button
            onClick={() => void refreshRuns()}
            disabled={loading}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-600">Queue depth: {queueDepth}</div>
        {error ? <div className="mt-2 text-sm text-rose-700">{error}</div> : null}
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
            <tr>
              <th className="px-3 py-2">Run</th>
              <th className="px-3 py-2">State</th>
              <th className="px-3 py-2">Summary</th>
              <th className="px-3 py-2">Queued</th>
              <th className="px-3 py-2">Completed</th>
              <th className="px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {runs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                  {loading ? 'Loading scheduler runs...' : 'No scheduler runs yet.'}
                </td>
              </tr>
            ) : runs.map((run) => (
              <tr key={run.id} className="border-t border-gray-100 align-top">
                <td className="px-3 py-3">
                  <div className="font-mono text-xs text-gray-700">{run.id}</div>
                  <div className="mt-1 text-xs text-gray-500">job: {run.jobId}</div>
                  {run.retryOfRunId ? (
                    <div className="mt-1 text-xs text-gray-500">retry of: {run.retryOfRunId}</div>
                  ) : null}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${stateClass(run.state)}`}>
                    {run.state}
                  </span>
                  {run.resultStatus ? <div className="mt-1 text-xs text-gray-500">result: {run.resultStatus}</div> : null}
                </td>
                <td className="px-3 py-3 text-xs text-gray-700">
                  <div>{run.summary || '-'}</div>
                  {run.error ? <div className="mt-1 text-rose-700">{run.error}</div> : null}
                </td>
                <td className="px-3 py-3 text-xs text-gray-600">{formatDate(run.queuedAt)}</td>
                <td className="px-3 py-3 text-xs text-gray-600">{formatDate(run.completedAt)}</td>
                <td className="px-3 py-3">
                  <button
                    onClick={() => void retryRun(run.id)}
                    disabled={submitting || (run.state !== 'failed' && run.state !== 'skipped' && run.state !== 'merged')}
                    className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                  >
                    Retry
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
