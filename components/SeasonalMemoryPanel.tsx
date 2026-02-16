'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import TrackedEventLink from './TrackedEventLink';
import { trackUXEvent } from '@/lib/analytics';
import type { FarmerUiMode } from '@/types/farmer-ui-mode';

type SeasonalMemoryKpi = 'seasonal_readiness' | 'schedule_reliability' | 'task_completion' | 'data_quality';

export type SeasonalMemoryInsight = {
  title: string;
  body: string;
  promptHref: string;
  promptLabel: string;
};

export type SeasonalMemoryReminder = {
  id: string;
  title: string;
  detail: string;
  href: string;
  ctaLabel: string;
  kpi: SeasonalMemoryKpi;
};

export default function SeasonalMemoryPanel({
  mode,
  insight,
  reminders,
  hasDataIssue = false,
  retryHref,
  seasonalMemoryCount,
  recentActivityCount,
}: {
  mode: FarmerUiMode;
  insight: SeasonalMemoryInsight;
  reminders: SeasonalMemoryReminder[];
  hasDataIssue?: boolean;
  retryHref?: string;
  seasonalMemoryCount: number;
  recentActivityCount: number;
}) {
  const t = useTranslations('dashboard');
  const impressionRef = useRef<string>('');

  useEffect(() => {
    const eventKey = [
      mode,
      hasDataIssue ? '1' : '0',
      reminders.length.toString(),
      seasonalMemoryCount.toString(),
      recentActivityCount.toString(),
    ].join(':');
    if (impressionRef.current === eventKey) return;
    impressionRef.current = eventKey;

    void trackUXEvent('seasonal_memory_panel_viewed', {
      mode,
      hasDataIssue,
      reminderCount: reminders.length,
      seasonalMemoryCount,
      recentActivityCount,
    });
  }, [hasDataIssue, mode, recentActivityCount, reminders.length, seasonalMemoryCount]);

  return (
    <section data-testid="seasonal-memory-panel" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">{t('seasonal_memory.title')}</h2>
          <p className="text-xs text-slate-500">{t('seasonal_memory.subtitle')}</p>
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
          {t('seasonal_memory.badge')}
        </span>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50/60 px-3 py-3">
        <p className="text-sm font-semibold text-blue-900">{insight.title}</p>
        <p className="mt-1 text-xs text-blue-800">{insight.body}</p>
        <TrackedEventLink
          href={insight.promptHref}
          eventName="seasonal_memory_prompt_clicked"
          eventProperties={{
            mode,
            hasDataIssue,
            seasonalMemoryCount,
            recentActivityCount,
          }}
          data-testid="seasonal-memory-prompt"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-800 hover:text-blue-950 hover:underline"
        >
          {insight.promptLabel}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </TrackedEventLink>
      </div>

      {hasDataIssue && retryHref ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{t('seasonal_memory.data_warning')}</p>
          <TrackedEventLink
            href={retryHref}
            eventName="seasonal_memory_retry_clicked"
            eventProperties={{ mode, surface: 'seasonal_memory_panel' }}
            data-testid="seasonal-memory-retry"
            className="mt-1 inline-flex font-semibold text-amber-800 hover:text-amber-950 hover:underline"
          >
            {t('seasonal_memory.retry')}
          </TrackedEventLink>
        </div>
      ) : null}

      {reminders.length > 0 ? (
        <div className="mt-3 space-y-2">
          {reminders.map((reminder) => (
            <div key={reminder.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{reminder.title}</p>
              <p className="mt-1 text-xs text-slate-600">{reminder.detail}</p>
              <TrackedEventLink
                href={reminder.href}
                eventName="seasonal_memory_reminder_clicked"
                eventProperties={{
                  mode,
                  reminderId: reminder.id,
                  kpi: reminder.kpi,
                  hasDataIssue,
                }}
                className="mt-2 inline-flex text-xs font-semibold text-slate-700 hover:text-slate-900 hover:underline"
              >
                {reminder.ctaLabel}
              </TrackedEventLink>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-600">{t('seasonal_memory.empty')}</p>
      )}
    </section>
  );
}
