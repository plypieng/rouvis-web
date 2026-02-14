'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RiskSeverity } from './types';

type WeatherPanelState = {
  loading: boolean;
  error: string | null;
  summary: string;
  severity: RiskSeverity;
  confidence: number;
  location: string;
  alerts: number;
};

type FieldWeatherPanelProps = {
  fieldId: string | null;
  onSeverityChange?: (severity: RiskSeverity) => void;
};

function severityFromRisks(risks: any[]): RiskSeverity {
  if (risks.some((risk) => risk?.severity === 'critical')) return 'critical';
  if (risks.some((risk) => risk?.severity === 'warning')) return 'warning';
  if (risks.some((risk) => risk?.severity === 'watch')) return 'watch';
  return 'safe';
}

function toneClass(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'watch':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  }
}

export default function FieldWeatherPanel({ fieldId, onSeverityChange }: FieldWeatherPanelProps) {
  const [state, setState] = useState<WeatherPanelState>({
    loading: false,
    error: null,
    summary: '圃場を選択すると気象リスクを表示します。',
    severity: 'safe',
    confidence: 0,
    location: '-',
    alerts: 0,
  });

  useEffect(() => {
    if (!fieldId) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        summary: '圃場を選択すると気象リスクを表示します。',
        severity: 'safe',
        confidence: 0,
        location: '-',
        alerts: 0,
      }));
      return;
    }

    let active = true;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    const load = async () => {
      try {
        const [overviewRes, risksRes] = await Promise.all([
          fetch(`/api/weather/overview?fieldId=${encodeURIComponent(fieldId)}`, { cache: 'no-store' }),
          fetch(`/api/weather/risks/scheduling?fieldId=${encodeURIComponent(fieldId)}`, { cache: 'no-store' }),
        ]);

        if (!overviewRes.ok || !risksRes.ok) {
          throw new Error('weather_unavailable');
        }

        const overview = await overviewRes.json();
        const riskPayload = await risksRes.json();
        const risks = Array.isArray(riskPayload?.risks) ? riskPayload.risks : [];
        const severity = severityFromRisks(risks);
        const topRisk = risks[0];
        const confidence = typeof topRisk?.confidence === 'number' ? topRisk.confidence : 1;

        if (!active) return;

        setState({
          loading: false,
          error: null,
          severity,
          confidence,
          location: overview?.location?.label || '-',
          alerts: Array.isArray(overview?.alerts) ? overview.alerts.length : 0,
          summary: topRisk?.reason || '直近の重大リスクは検知されていません。',
        });
        onSeverityChange?.(severity);
      } catch (error) {
        if (!active) return;
        setState((prev) => ({
          ...prev,
          loading: false,
          error: '天気情報の取得に失敗しました。',
          summary: '現在は天気情報を取得できません。',
          severity: 'watch',
          confidence: 0,
        }));
        onSeverityChange?.('watch');
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [fieldId, onSeverityChange]);

  const confidenceText = useMemo(() => `${Math.round(state.confidence * 100)}%`, [state.confidence]);

  return (
    <section className={`surface-base border ${toneClass(state.severity)} p-3`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em]">Weather Lens</p>
          <h3 className="text-sm font-semibold">圃場ピンポイント気象</h3>
        </div>
        {state.loading ? (
          <span className="text-xs font-semibold">Loading...</span>
        ) : (
          <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-semibold">
            confidence {confidenceText}
          </span>
        )}
      </div>

      <p className="mb-2 text-xs leading-relaxed">{state.summary}</p>
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <span className="rounded-full border border-current/40 px-2 py-0.5">{state.location}</span>
        <span className="rounded-full border border-current/40 px-2 py-0.5">alerts {state.alerts}</span>
      </div>

      {state.error ? <p className="mt-2 text-xs font-semibold">{state.error}</p> : null}
    </section>
  );
}
