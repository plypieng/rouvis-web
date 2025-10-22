'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { WeatherForecast } from './WeatherForecast';

type LogisticsItem = {
  id: string;
  text: string;
  eta?: string;
};

type CoopAnnouncement = {
  id: string;
  title: string;
  time?: string;
  url?: string;
};

export function InsightsStack({ className = '' }: { className?: string }) {
  const t = useTranslations();
  const [logistics, setLogistics] = useState<LogisticsItem[]>([]);
  const [announcements, setAnnouncements] = useState<CoopAnnouncement[]>([]);

  useEffect(() => {
    // TODO: Hook to /v1/logistics/stream (SSE) for live logistics updates
    // Simulated placeholder logistics
    const mock: LogisticsItem[] = [
      { id: 'l1', text: '肥料（有機・5kg）配送予定', eta: '本日 午後' },
      { id: 'l2', text: '乾燥機点検の訪問予約', eta: '明日 午前' },
    ];
    setLogistics(mock);

    // TODO: Hook to /v1/cooperative/announcements (SSE) for JA/cooperative callouts
    const mockAnnouncements: CoopAnnouncement[] = [
      { id: 'c1', title: 'JAから：今週の苗配布スケジュール', time: '2時間前', url: '#' },
      { id: 'c2', title: '共同購入：散布ノズルの共同発注受付', time: '昨日', url: '#' },
    ];
    setAnnouncements(mockAnnouncements);
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Weather & Logistics */}
      <section
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        role="region"
        aria-label={t('insights.weather_and_logistics')}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('insights.weather_and_logistics')}
          </h2>
          <span className="text-xs text-gray-500">{t('insights.latest')}</span>
        </div>
        <div className="p-4 space-y-4">
          {/* Weather Forecast (existing component) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">{t('dashboard.weather_forecast')}</h3>
              <span className="text-xs text-gray-500">{t('dashboard.location')}</span>
            </div>
            <WeatherForecast />
          </div>

          {/* Logistics stream (placeholder) */}
          <div aria-live="polite">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-800">{t('insights.logistics')}</h3>
              <span className="text-xs text-gray-500">{t('insights.latest')}</span>
            </div>
            {logistics.length === 0 ? (
              <div className="text-sm text-gray-500">—</div>
            ) : (
              <ul className="space-y-2">
                {logistics.map(item => (
                  <li key={item.id} className="flex items-center justify-between p-2 rounded border bg-gray-50 border-gray-200">
                    <span className="text-sm text-gray-800">{item.text}</span>
                    {item.eta && <span className="text-xs text-gray-500">{item.eta}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {/* Cooperative / Community Callouts */}
      <section
        className="bg-white rounded-lg shadow-sm border border-gray-200"
        role="region"
        aria-label={t('insights.cooperative_callouts')}
      >
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('insights.cooperative_callouts')}
          </h2>
          <span className="text-xs text-gray-500">{t('insights.latest')}</span>
        </div>
        <div className="p-4" aria-live="polite">
          {announcements.length === 0 ? (
            <div className="text-sm text-gray-500">—</div>
          ) : (
            <ul className="space-y-3">
              {announcements.map(a => (
                <li key={a.id} className="flex items-start justify-between gap-3 p-3 rounded border bg-gray-50 border-gray-200">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{a.title}</div>
                    {a.time && <div className="text-xs text-gray-500 mt-0.5">{a.time}</div>}
                  </div>
                  {a.url && (
                    <Link
                      href={a.url}
                      className="text-xs text-green-700 hover:text-green-800 whitespace-nowrap"
                    >
                      Open →
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* TODO: SSE subscription integration point for cooperative announcements */}
      </section>
    </div>
  );
}