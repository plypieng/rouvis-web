'use client';

import { JMAData } from '@/types/chat';

interface JMAEvidenceCardProps {
  data: JMAData;
  className?: string;
}

export function JMAEvidenceCard({ data, className = '' }: JMAEvidenceCardProps) {
  // Calculate data freshness
  const getDataFreshness = () => {
    const now = new Date();
    const dataTime = new Date(data.timestamp);
    const diffMinutes = Math.floor((now.getTime() - dataTime.getTime()) / (1000 * 60));

    if (diffMinutes < 60) {
      return { text: `${diffMinutes}分前`, color: 'text-green-600' };
    } else if (diffMinutes < 180) {
      const hours = Math.floor(diffMinutes / 60);
      return { text: `${hours}時間前`, color: 'text-yellow-600' };
    } else {
      const hours = Math.floor(diffMinutes / 60);
      return { text: `${hours}時間前`, color: 'text-red-600' };
    }
  };

  const freshness = getDataFreshness();

  // Get warning severity
  const getWarningSeverity = (warning: string) => {
    if (warning.includes('警報') || warning.includes('特別')) {
      return { color: 'bg-red-100 border-red-400 text-red-800', icon: '🚨' };
    } else if (warning.includes('注意報')) {
      return { color: 'bg-yellow-100 border-yellow-400 text-yellow-800', icon: '⚠️' };
    }
    return { color: 'bg-blue-100 border-blue-400 text-blue-800', icon: 'ℹ️' };
  };

  return (
    <div className={`rounded-lg border-2 border-sky-200 bg-gradient-to-br from-sky-50 to-blue-50 p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🌤️</span>
          <div>
            <div className="font-semibold text-gray-900">
              気象庁 (JMA) データ
            </div>
            <div className="text-xs text-gray-600">
              {data.location}
            </div>
          </div>
        </div>
        <div className={`text-xs font-medium ${freshness.color}`}>
          {freshness.text}
        </div>
      </div>

      {/* Forecast */}
      <div className="mb-3 p-3 bg-white rounded-lg shadow-sm">
        <div className="text-sm font-medium text-gray-700 mb-1">予報</div>
        <p className="text-sm text-gray-900">{data.forecast}</p>
      </div>

      {/* Temperature */}
      {data.temperature && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 mb-1">最高気温</div>
            <div className="text-lg font-bold text-red-600">
              {data.temperature.high}°C
            </div>
          </div>
          <div className="p-2 bg-white rounded-lg shadow-sm">
            <div className="text-xs text-gray-600 mb-1">最低気温</div>
            <div className="text-lg font-bold text-blue-600">
              {data.temperature.low}°C
            </div>
          </div>
        </div>
      )}

      {/* Precipitation */}
      {data.precipitation !== undefined && (
        <div className="mb-3 p-2 bg-white rounded-lg shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">降水確率</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold text-blue-700">
                {data.precipitation}%
              </span>
              {data.precipitation > 50 && <span>💧</span>}
            </div>
          </div>
        </div>
      )}

      {/* Warnings */}
      {data.warnings && data.warnings.length > 0 && (
        <div className="space-y-2 mb-3">
          <div className="text-xs font-medium text-gray-700">警報・注意報</div>
          {data.warnings.map((warning, index) => {
            const severity = getWarningSeverity(warning);
            return (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded-lg border ${severity.color}`}
              >
                <span className="text-lg">{severity.icon}</span>
                <span className="text-sm font-medium flex-1">{warning}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Source Badge */}
      <div className="flex items-center justify-between pt-2 border-t border-sky-200">
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-sky-600 text-white text-xs font-medium rounded-full">
            JMA
          </div>
          <span className="text-xs text-gray-600">
            気象庁公式データ
          </span>
        </div>
        <a
          href={data.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-sky-600 hover:text-sky-800 font-medium flex items-center gap-1 transition-colors"
        >
          詳細を見る
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}
