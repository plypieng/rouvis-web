'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toastError, toastSuccess } from '@/lib/feedback';

type BackgroundWorkerRunState = 'queued' | 'running' | 'succeeded' | 'failed';

type BackgroundWorkerRun = {
  id: string;
  state: BackgroundWorkerRunState;
  title?: string | null;
  summary?: string | null;
  errorMessage?: string | null;
  threadId?: string | null;
};

type BackgroundRunsResponse = {
  runs?: BackgroundWorkerRun[];
};

const POLL_INTERVAL_MS = 5_000;

function isActiveState(state: BackgroundWorkerRunState): boolean {
  return state === 'queued' || state === 'running';
}

function isTerminalState(state: BackgroundWorkerRunState): boolean {
  return state === 'succeeded' || state === 'failed';
}

function buildChatThreadHref(locale: string, threadId: string): string {
  const params = new URLSearchParams({ threadId });
  return `/${locale}/chat?${params.toString()}`;
}

function toRunArray(payload: unknown): BackgroundWorkerRun[] {
  const typed = payload as BackgroundRunsResponse;
  return Array.isArray(typed?.runs) ? typed.runs : [];
}

function toSuccessMessage(run: BackgroundWorkerRun, isJapanese: boolean): string {
  const title = run.title?.trim();
  if (title) {
    return isJapanese ? `${title} が完了しました。` : `${title} completed.`;
  }
  return isJapanese ? 'バックグラウンドタスクが完了しました。' : 'Background task completed.';
}

function toErrorMessage(run: BackgroundWorkerRun, isJapanese: boolean): string {
  const title = run.title?.trim() || (isJapanese ? 'バックグラウンドタスク' : 'Background task');
  const detail = run.errorMessage?.trim();
  if (!detail) {
    return isJapanese ? `${title} が失敗しました。` : `${title} failed.`;
  }
  return isJapanese
    ? `${title} が失敗しました: ${detail}`
    : `${title} failed: ${detail}`;
}

export default function BackgroundWorkerNotifier() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const statesRef = useRef<Map<string, BackgroundWorkerRunState>>(new Map());
  const transitionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (status !== 'authenticated') {
      statesRef.current.clear();
      transitionsRef.current.clear();
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const isJapanese = locale.toLowerCase().startsWith('ja');

    const pollRuns = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const response = await fetch('/api/v1/agents/background-workers/runs?limit=24&refresh=1', {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
        });
        if (!response.ok) return;

        const payload = await response.json().catch(() => ({}));
        const runs = toRunArray(payload);
        const seenRunIds = new Set<string>();

        for (const run of runs) {
          if (!run?.id) continue;
          seenRunIds.add(run.id);

          const previousState = statesRef.current.get(run.id);
          statesRef.current.set(run.id, run.state);

          if (!previousState || !isActiveState(previousState) || !isTerminalState(run.state)) {
            continue;
          }

          const transitionKey = `${run.id}:${run.state}`;
          if (transitionsRef.current.has(transitionKey)) {
            continue;
          }
          transitionsRef.current.add(transitionKey);

          const action = run.threadId
            ? {
                label: isJapanese ? 'チャットを開く' : 'Open chat',
                onClick: () => router.push(buildChatThreadHref(locale, run.threadId as string)),
              }
            : undefined;

          if (run.state === 'succeeded') {
            toastSuccess(toSuccessMessage(run, isJapanese), action);
          } else {
            toastError(toErrorMessage(run, isJapanese), action);
          }
        }

        for (const runId of statesRef.current.keys()) {
          if (!seenRunIds.has(runId)) {
            statesRef.current.delete(runId);
          }
        }
      } catch {
        // Best-effort polling only; ignore transient fetch errors.
      } finally {
        inFlight = false;
      }
    };

    void pollRuns();
    const interval = window.setInterval(() => {
      void pollRuns();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [locale, router, status]);

  return null;
}
