'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import TrackedEventLink from './TrackedEventLink';
import { trackUXEvent } from '@/lib/analytics';
import { toastError, toastSuccess } from '@/lib/feedback';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';

export type TodayCommandTask = {
  id: string;
  title: string;
  dueAt: string;
  projectId?: string;
  projectName?: string;
};

type NextBestActionTone = 'safe' | 'watch' | 'warning' | 'critical';

export type TodayNextBestAction = {
  scenario: 'data_recovery' | 'overdue_recovery' | 'weather_guard' | 'due_soon' | 'setup' | 'momentum';
  riskTone: NextBestActionTone;
  riskLabel: string;
  title: string;
  summary: string;
  reasons: string[];
  contextLine: string;
  recoveryHint?: string;
  kpi: 'task_completion' | 'schedule_reliability' | 'first_week_activation';
  overdueCount: number;
  dueIn48hCount: number;
  weatherAlertCount: number;
  hasDataIssue: boolean;
  primary: {
    href: string;
    label: string;
  };
  secondary?: {
    href: string;
    label: string;
  };
};

type NoticeState = {
  type: 'success' | 'error';
  message: string;
  retryTask?: TodayCommandTask;
};

function toEpoch(raw: string | undefined): number {
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
}

function buildTodayChatHref(locale: string, prompt: string): string {
  const query = new URLSearchParams({
    intent: 'today',
    prompt,
  });
  return `/${locale}/chat?${query.toString()}`;
}

function toDueLabel(task: TodayCommandTask, locale: string, overdueLabel: string, dateUnknownLabel: string): string {
  const dueEpoch = toEpoch(task.dueAt);
  if (!Number.isFinite(dueEpoch)) return dateUnknownLabel;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (dueEpoch < todayStart.getTime()) return overdueLabel;

  return new Date(dueEpoch).toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
}

function nextBestActionPanelClass(tone: NextBestActionTone): string {
  if (tone === 'critical') return 'border-red-200 bg-red-50/70';
  if (tone === 'warning') return 'border-amber-200 bg-amber-50/70';
  if (tone === 'watch') return 'border-blue-200 bg-blue-50/70';
  return 'border-emerald-200 bg-emerald-50/70';
}

function nextBestActionBadgeClass(tone: NextBestActionTone): string {
  if (tone === 'critical') return 'border-red-300 bg-red-100 text-red-800';
  if (tone === 'warning') return 'border-amber-300 bg-amber-100 text-amber-800';
  if (tone === 'watch') return 'border-blue-300 bg-blue-100 text-blue-800';
  return 'border-emerald-300 bg-emerald-100 text-emerald-800';
}

export default function TodayCommandCenter({
  locale,
  mode,
  todayTasks,
  recommendedTask: initialRecommendedTask,
  todayProgressDone,
  todayProgressTotal,
  hasCompletedTaskInitially = false,
  nextBestAction,
}: {
  locale: string;
  mode: FarmerUiMode;
  todayTasks: TodayCommandTask[];
  recommendedTask?: TodayCommandTask | null;
  todayProgressDone: number;
  todayProgressTotal: number;
  hasCompletedTaskInitially?: boolean;
  nextBestAction?: TodayNextBestAction | null;
}) {
  const router = useRouter();
  const t = useTranslations('dashboard');
  const [tasks, setTasks] = useState<TodayCommandTask[]>(todayTasks);
  const [recommendedTask, setRecommendedTask] = useState<TodayCommandTask | null>(initialRecommendedTask || null);
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [hasCompletedTask, setHasCompletedTask] = useState(hasCompletedTaskInitially);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const nextBestActionImpressionRef = useRef<string>('');

  useEffect(() => {
    setTasks(todayTasks);
  }, [todayTasks]);

  useEffect(() => {
    setRecommendedTask(initialRecommendedTask || null);
  }, [initialRecommendedTask]);

  useEffect(() => {
    if (!nextBestAction) return;

    const impressionKey = [
      mode,
      nextBestAction.scenario,
      nextBestAction.riskTone,
      nextBestAction.primary.href,
      nextBestAction.kpi,
      nextBestAction.hasDataIssue ? '1' : '0',
    ].join(':');
    if (nextBestActionImpressionRef.current === impressionKey) return;
    nextBestActionImpressionRef.current = impressionKey;

    void trackUXEvent('dashboard_next_best_action_viewed', {
      mode,
      scenario: nextBestAction.scenario,
      riskTone: nextBestAction.riskTone,
      kpi: nextBestAction.kpi,
      hasDataIssue: nextBestAction.hasDataIssue,
      overdueCount: nextBestAction.overdueCount,
      dueIn48hCount: nextBestAction.dueIn48hCount,
      weatherAlertCount: nextBestAction.weatherAlertCount,
    });
  }, [mode, nextBestAction]);

  const todayChatHref = buildTodayChatHref(locale, t('chat_prompts.today_priority'));
  const todayProgressPercent = todayProgressTotal === 0
    ? 0
    : Math.min(100, Math.round((todayProgressDone / todayProgressTotal) * 100));

  const sortedTasks = useMemo(
    () => [...tasks].sort((left, right) => toEpoch(left.dueAt) - toEpoch(right.dueAt)),
    [tasks],
  );
  const queueTasks = sortedTasks.slice(0, 5);
  const oneTapTask = recommendedTask || queueTasks[0] || null;

  const overdueCount = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartEpoch = todayStart.getTime();

    return tasks.filter((task) => {
      const dueEpoch = toEpoch(task.dueAt);
      return Number.isFinite(dueEpoch) && dueEpoch < todayStartEpoch;
    }).length;
  }, [tasks]);

  const modeTestId = mode === 'new_farmer' ? 'today-command-center-new' : 'today-command-center-veteran';

  const veteranPrimaryAction = tasks.length > 0
    ? {
      label: t('command_center.veteran.actions.open_calendar', { count: tasks.length }),
      href: `/${locale}/calendar`,
      eventName: 'today_command_center_veteran_open_calendar',
      helper: t('command_center.veteran.helpers.open_calendar'),
      className: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    }
    : todayProgressDone > 0
      ? {
        label: t('command_center.veteran.actions.log_activity'),
        href: `/${locale}/records?action=log`,
        eventName: 'today_command_center_veteran_log',
        helper: t('command_center.veteran.helpers.log_activity'),
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
      }
      : {
        label: t('command_center.veteran.actions.ask_ai'),
        href: todayChatHref,
        eventName: 'today_command_center_veteran_ai',
        helper: t('command_center.veteran.helpers.ask_ai'),
        className: 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100',
      };

  const completeTask = async (task: TodayCommandTask, surface: 'primary' | 'queue') => {
    if (!task.id || completingTaskId) return;

    setNotice(null);
    setCompletingTaskId(task.id);

    try {
      const res = await fetch(`/api/v1/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || t('command_center.notice.update_failed'));
      }

      let nextTasks: TodayCommandTask[] = [];
      setTasks((prev) => {
        nextTasks = prev.filter((current) => current.id !== task.id);
        return nextTasks;
      });
      setRecommendedTask((current) => {
        if (current && current.id !== task.id) return current;
        return nextTasks[0] || null;
      });

      const successMessage = t('command_center.notice.completed', { task: task.title });
      setNotice({
        type: 'success',
        message: successMessage,
      });
      toastSuccess(successMessage);

      void trackUXEvent('task_completed', {
        surface: `today_command_center_${surface}`,
        taskId: task.id,
      });

      if (!hasCompletedTask) {
        setHasCompletedTask(true);
        void trackUXEvent('first_task_completed', {
          surface: `today_command_center_${surface}`,
          taskId: task.id,
        });
      }

      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : t('command_center.notice.update_failed');
      setNotice({
        type: 'error',
        message,
        retryTask: task,
      });

      toastError(message, {
        label: t('command_center.retry'),
        onClick: () => {
          void completeTask(task, surface);
        },
      });
    } finally {
      setCompletingTaskId(null);
    }
  };

  return (
    <section data-testid="today-command-center" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div data-testid={modeTestId}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">{t('command_center.title')}</h2>
          {mode === 'veteran_farmer' ? (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
              {t('command_center.veteran.progress', { done: todayProgressDone, total: todayProgressTotal || 0 })}
            </span>
          ) : (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              {t('command_center.new.badge')}
            </span>
          )}
        </div>

        {notice && (
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span>{notice.message}</span>
              {notice.retryTask && (
                <button
                  type="button"
                  onClick={() => {
                    void completeTask(notice.retryTask as TodayCommandTask, 'primary');
                  }}
                  className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                >
                  {t('command_center.retry')}
                </button>
              )}
            </div>
          </div>
        )}

        {nextBestAction && (
          <div
            data-testid="dashboard-next-best-action"
            className={`mb-4 rounded-xl border px-3 py-3 ${nextBestActionPanelClass(nextBestAction.riskTone)}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                  {t('next_best_action.badge')}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{nextBestAction.title}</p>
                <p className="mt-1 text-xs text-slate-700">{nextBestAction.summary}</p>
              </div>
              <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${nextBestActionBadgeClass(nextBestAction.riskTone)}`}>
                {nextBestAction.riskLabel}
              </span>
            </div>

            <p className="mt-2 text-xs text-slate-700">{nextBestAction.contextLine}</p>

            {nextBestAction.reasons.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-slate-700">
                {nextBestAction.reasons.map((reason, index) => (
                  <li key={`${nextBestAction.scenario}-${index.toString()}`}>{reason}</li>
                ))}
              </ul>
            )}

            {nextBestAction.recoveryHint ? (
              <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                {nextBestAction.recoveryHint}
              </p>
            ) : null}

            <div className="mt-3 flex flex-wrap gap-2">
              <TrackedEventLink
                href={nextBestAction.primary.href}
                eventName="dashboard_next_best_action_primary_clicked"
                eventProperties={{
                  mode,
                  scenario: nextBestAction.scenario,
                  riskTone: nextBestAction.riskTone,
                  kpi: nextBestAction.kpi,
                  hasDataIssue: nextBestAction.hasDataIssue,
                  overdueCount: nextBestAction.overdueCount,
                  dueIn48hCount: nextBestAction.dueIn48hCount,
                  weatherAlertCount: nextBestAction.weatherAlertCount,
                }}
                data-testid="dashboard-next-best-action-primary"
                className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {nextBestAction.primary.label}
              </TrackedEventLink>

              {nextBestAction.secondary ? (
                <TrackedEventLink
                  href={nextBestAction.secondary.href}
                  eventName="dashboard_next_best_action_secondary_clicked"
                  eventProperties={{
                    mode,
                    scenario: nextBestAction.scenario,
                    riskTone: nextBestAction.riskTone,
                    kpi: nextBestAction.kpi,
                  }}
                  data-testid="dashboard-next-best-action-secondary"
                  className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  {nextBestAction.secondary.label}
                </TrackedEventLink>
              ) : null}
            </div>
          </div>
        )}

        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {t('command_center.quick_actions_title')}
          </p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => {
                if (!oneTapTask) return;
                void trackUXEvent('today_command_center_mark_done_clicked', {
                  mode,
                  taskId: oneTapTask.id,
                  surface: 'quick_actions',
                });
                void completeTask(oneTapTask, 'primary');
              }}
              disabled={!oneTapTask || Boolean(completingTaskId)}
              data-testid="today-command-center-one-tap-complete"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {completingTaskId
                ? t('command_center.completing')
                : oneTapTask
                  ? t('command_center.mark_done')
                  : t('command_center.mark_done_disabled')}
            </button>
            <TrackedEventLink
              href={`/${locale}/records?action=log`}
              eventName="today_command_center_log_clicked"
              eventProperties={{ surface: 'today_command_center_quick_actions', mode }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
            >
              {t('command_center.log_activity')}
            </TrackedEventLink>
            <TrackedEventLink
              href={`/${locale}/records?action=voice`}
              eventName="today_command_center_voice_log_clicked"
              eventProperties={{ surface: 'today_command_center_quick_actions', mode }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-teal-200 bg-white px-3 py-2 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
            >
              {t('command_center.voice_log')}
            </TrackedEventLink>
            <TrackedEventLink
              href={todayChatHref}
              eventName="today_command_center_ai_clicked"
              eventProperties={{ surface: 'today_command_center_quick_actions', mode }}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-amber-200 bg-white px-3 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-50"
            >
              {t('command_center.ask_ai')}
            </TrackedEventLink>
          </div>
        </div>

        {mode === 'new_farmer' ? (
          <>
            <p className="text-sm text-slate-600">{t('command_center.new.helper')}</p>

            {recommendedTask ? (
              <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">
                  {t('command_center.new.recommended_label')}
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">{recommendedTask.title}</p>
                <p className="mt-1 text-xs text-slate-600">
                  {(recommendedTask.projectName || t('ops_window.unassigned_project'))}
                  {' · '}
                  {toDueLabel(recommendedTask, locale, t('overdue'), t('project_ops.date_unknown'))}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void completeTask(recommendedTask, 'primary');
                    }}
                    disabled={completingTaskId === recommendedTask.id}
                    data-testid="today-command-center-primary-complete"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {completingTaskId === recommendedTask.id
                      ? t('command_center.completing')
                      : t('command_center.new.complete_action')}
                  </button>
                  {recommendedTask.projectId && (
                    <Link
                      href={`/${locale}/projects/${recommendedTask.projectId}`}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {t('command_center.open_project')}
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-700">
                <p className="font-semibold">{t('command_center.new.empty_title')}</p>
                <p className="mt-1 text-xs text-slate-600">{t('command_center.new.empty_body')}</p>
              </div>
            )}

            <details className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-800">
                {t('command_center.new.why_disclosure')}
              </summary>
              <p className="mt-1 text-xs text-slate-600">{t('command_center.new.why_helper')}</p>
              {queueTasks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {queueTasks.slice(0, 3).map((task) => (
                    <div key={task.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                      <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {(task.projectName || t('ops_window.unassigned_project'))}
                        {' · '}
                        {toDueLabel(task, locale, t('overdue'), t('project_ops.date_unknown'))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </details>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-[11px] text-slate-500">{t('command_center.veteran.remaining')}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{tasks.length}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-[11px] text-slate-500">{t('command_center.veteran.overdue')}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{overdueCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
                <p className="text-[11px] text-slate-500">{t('command_center.veteran.done')}</p>
                <p className="mt-1 text-lg font-bold text-slate-900">{todayProgressDone}</p>
              </div>
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${todayProgressPercent}%` }}
              />
            </div>

            <p className="mt-3 text-sm text-slate-700">{veteranPrimaryAction.helper}</p>
            <TrackedEventLink
              href={veteranPrimaryAction.href}
              eventName={veteranPrimaryAction.eventName}
              className={`mt-2 inline-flex min-h-[44px] items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition ${veteranPrimaryAction.className}`}
            >
              {veteranPrimaryAction.label}
            </TrackedEventLink>

            {queueTasks.length > 0 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {t('command_center.veteran.queue_title')}
                </p>
                {queueTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{task.title}</p>
                      <p className="truncate text-xs text-slate-600">
                        {(task.projectName || t('ops_window.unassigned_project'))}
                        {' · '}
                        {toDueLabel(task, locale, t('overdue'), t('project_ops.date_unknown'))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        void completeTask(task, 'queue');
                      }}
                      disabled={completingTaskId === task.id}
                      className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {completingTaskId === task.id ? t('command_center.completing') : t('command_center.complete_short')}
                    </button>
                    {task.projectId && (
                      <Link
                        href={`/${locale}/projects/${task.projectId}`}
                        className="inline-flex min-h-[40px] items-center justify-center rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                      >
                        {t('command_center.open_project_short')}
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-emerald-700">{t('command_center.veteran.empty')}</p>
            )}

          </>
        )}
      </div>
    </section>
  );
}
