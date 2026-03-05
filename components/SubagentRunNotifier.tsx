'use client';

import { useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toastError, toastSuccess } from '@/lib/feedback';

type SubagentRunState = 'queued' | 'running' | 'succeeded' | 'failed';

type SubagentRun = {
  id: string;
  state: SubagentRunState;
  intent?: string | null;
  summary?: string | null;
  error?: string | null;
  threadId?: string | null;
};

type SubagentRunsResponse = {
  runs?: SubagentRun[];
};

const POLL_INTERVAL_MS = 5_000;

function isActiveState(state: SubagentRunState): boolean {
  return state === 'queued' || state === 'running';
}

function isTerminalState(state: SubagentRunState): boolean {
  return state === 'succeeded' || state === 'failed';
}

function buildChatThreadHref(locale: string, threadId: string): string {
  const params = new URLSearchParams({ threadId });
  return `/${locale}/chat?${params.toString()}`;
}

function toRunArray(payload: unknown): SubagentRun[] {
  const typed = payload as SubagentRunsResponse;
  return Array.isArray(typed?.runs) ? typed.runs : [];
}

function toIntentLabel(intent: string | null | undefined, isJapanese: boolean): string {
  if (intent === 'run_reschedule_planner') {
    return isJapanese ? '予定調整ラン' : 'Reschedule run';
  }
  if (intent === 'run_plant_doctor') {
    return isJapanese ? '診断ラン' : 'Diagnosis run';
  }
  if (intent === 'run_activity_analyzer') {
    return isJapanese ? '記録整理ラン' : 'Activity run';
  }
  return isJapanese ? 'サブエージェント実行' : 'Delegated run';
}

function toSuccessMessage(run: SubagentRun, isJapanese: boolean): string {
  const summary = run.summary?.trim();
  if (summary) return summary;
  const label = toIntentLabel(run.intent, isJapanese);
  return isJapanese ? `${label}が完了しました。` : `${label} completed.`;
}

function toErrorMessage(run: SubagentRun, isJapanese: boolean): string {
  const label = toIntentLabel(run.intent, isJapanese);
  const detail = run.error?.trim();
  if (!detail) {
    return isJapanese ? `${label}が失敗しました。` : `${label} failed.`;
  }
  return isJapanese
    ? `${label}が失敗しました: ${detail}`
    : `${label} failed: ${detail}`;
}

export default function SubagentRunNotifier() {
  const { status } = useSession();
  const router = useRouter();
  const locale = useLocale();
  const statesRef = useRef<Map<string, SubagentRunState>>(new Map());
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
        const response = await fetch('/api/v1/agents/subagents/status?limit=24&refresh=1', {
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
