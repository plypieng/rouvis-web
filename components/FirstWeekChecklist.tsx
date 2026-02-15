'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

import TrackedEventLink from './TrackedEventLink';
import { trackUXEvent } from '@/lib/analytics';

export type ChecklistItem = {
  id: string;
  label: string;
  done: boolean;
  href: string;
};

export default function FirstWeekChecklist({
  items,
  show,
  hasDataIssue = false,
  retryHref,
  completionHref,
}: {
  items: ChecklistItem[];
  show: boolean;
  hasDataIssue?: boolean;
  retryHref?: string;
  completionHref: string;
}) {
  const t = useTranslations('dashboard');
  const completed = items.filter((item) => item.done).length;
  const total = items.length;
  const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);
  const allDone = total > 0 && completed === total;
  const impressionRef = useRef<string>('');

  useEffect(() => {
    if (!show) return;

    const eventKey = `${completed}/${total}:${hasDataIssue ? '1' : '0'}:${allDone ? '1' : '0'}`;
    if (impressionRef.current === eventKey) return;
    impressionRef.current = eventKey;

    void trackUXEvent('first_week_checklist_viewed', {
      completed,
      total,
      progressPercent,
      hasDataIssue,
      allDone,
    });

    if (allDone) {
      void trackUXEvent('first_week_checklist_completed', {
        completed,
        total,
      });
    }
  }, [allDone, completed, hasDataIssue, progressPercent, show, total]);

  if (!show) return null;

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4" data-testid="first-week-checklist">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-indigo-900">{t('checklist_panel.title')}</h2>
          <p className="text-xs text-indigo-700">{t('checklist_panel.subtitle', { percent: progressPercent })}</p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-indigo-700">
          {completed}/{total}
        </span>
      </div>

      {hasDataIssue ? (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p>{t('checklist_panel.data_warning')}</p>
          {retryHref ? (
            <TrackedEventLink
              href={retryHref}
              eventName="first_week_checklist_retry_clicked"
              eventProperties={{ surface: 'first_week_checklist' }}
              className="mt-1 inline-flex font-semibold text-amber-800 hover:text-amber-950 hover:underline"
            >
              {t('checklist_panel.retry')}
            </TrackedEventLink>
          ) : null}
        </div>
      ) : null}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-sm ${
              item.done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-white bg-white text-gray-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden="true">{item.done ? '✓' : '○'}</span>
              <span>{item.label}</span>
            </span>
            {!item.done ? (
              <TrackedEventLink
                href={item.href}
                eventName="first_week_checklist_item_clicked"
                eventProperties={{
                  stepId: item.id,
                  completed,
                  total,
                }}
                className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:underline"
              >
                {t('checklist_panel.action')}
              </TrackedEventLink>
            ) : null}
          </li>
        ))}
      </ul>

      {allDone ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
          <p className="font-semibold">{t('checklist_panel.all_done_title')}</p>
          <p className="mt-1 text-xs">{t('checklist_panel.all_done_body')}</p>
          <TrackedEventLink
            href={completionHref}
            eventName="first_week_checklist_all_done_cta_clicked"
            eventProperties={{ completed, total }}
            className="mt-2 inline-flex text-xs font-semibold text-emerald-800 hover:text-emerald-950 hover:underline"
          >
            {t('checklist_panel.all_done_action')}
          </TrackedEventLink>
        </div>
      ) : null}
    </section>
  );
}
