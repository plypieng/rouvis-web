'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlertTriangle, CloudSnow, TrendingUp } from 'lucide-react';

type AdvisorKPI = {
  label: string;
  value: number;
  unit?: string;
};

type AdvisorState = {
  frostTempC?: number;
  kpi?: AdvisorKPI;
  nextTask?: string;
};

export function AdvisorStrip({ className = '' }: { className?: string }) {
  const t = useTranslations();
  const [state, setState] = useState<AdvisorState>({});

  useEffect(() => {
    // TODO: Integrate GET /v1/weather/alerts for Niigata area (frost/typhoon/heavy rain)
    // Example mock: Frost alert forecast 2°C tonight for Nagaoka
    const frostTempC = 2;

    // TODO: Integrate GET /v1/analytics/overview for farm KPIs (e.g., water management adherence)
    const kpi: AdvisorKPI = {
      label: 'water_management', // semantic key; UI uses localized chip below
      value: 84,
      unit: '%',
    };

    // TODO: Integrate GET /v1/tasks?date=today to derive highest-priority next task
    const nextTask = 'A圃場に水やり（30分）'; // JP-first mock; localization handled via wrapper text

    // Simulate async load
    const timer = setTimeout(() => {
      setState({ frostTempC, kpi, nextTask });
    }, 250);

    return () => clearTimeout(timer);
  }, []);

  const frostText =
    typeof state.frostTempC === 'number'
      ? t('today.advisor_strip.frost_alert', { temp: state.frostTempC })
      : null;

  const kpiText =
    state.kpi != null
      ? t('today.advisor_strip.kpi_chip', { value: state.kpi.value })
      : null;

  const nextTaskText =
    state.nextTask != null
      ? t('today.advisor_strip.next_task', { task: state.nextTask })
      : null;

  return (
    <section
      role="region"
      aria-live="polite"
      aria-label={t('today.advisor_strip.title')}
      className={`
        w-full rounded-xl border border-emerald-200 bg-gradient-to-r from-sky-50 to-emerald-50
        shadow-sm p-4 md:p-5 ${className}
      `}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <h1 className="text-base md:text-lg font-semibold text-gray-900">
          {t('today.advisor_strip.title')}
        </h1>
        <Link
          href="analytics"
          className="text-xs md:text-sm text-green-700 hover:text-green-800 hover:underline underline-offset-2"
          aria-label={t('today.advisor_strip.view_details')}
        >
          {t('today.advisor_strip.view_details')}
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Frost / Weather alert chip */}
        <div className="flex items-center gap-2 rounded-lg bg-white/70 backdrop-blur-sm border border-blue-200 px-3 py-2">
          <CloudSnow className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span className="text-sm text-gray-900">
            {frostText ?? '—'}
          </span>
        </div>

        {/* KPI chip */}
        <div className="flex items-center gap-2 rounded-lg bg-white/70 backdrop-blur-sm border border-emerald-200 px-3 py-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          <span className="text-sm text-gray-900">
            {kpiText ?? '—'}
          </span>
        </div>

        {/* Next task summary */}
        <div className="flex items-center justify-between gap-2 rounded-lg bg-white/70 backdrop-blur-sm border border-gray-200 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />
            <span className="text-sm text-gray-900 truncate">
              {nextTaskText ?? '—'}
            </span>
          </div>
          <Link
            href={{ pathname: 'chat', query: { prompt: t('today.prompts.today') } }}
            className="text-xs text-green-700 hover:text-green-800 whitespace-nowrap"
            aria-label={t('today.prompts.today')}
          >
            Chat →
          </Link>
        </div>
      </div>

      {/* TODO: When SSE for citations is wired, surface trust indicators inline here if relevant */}
    </section>
  );
}