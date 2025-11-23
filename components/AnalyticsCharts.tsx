'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

type AnalyticsChartsProps = {
  chartType: 'yield' | 'climate' | 'revenue';
};

// Mock data for demonstration
const yieldData = [
  { year: '2020', rice: 4.2, vegetables: 3.1, fruits: 2.5, average: 3.8 },
  { year: '2021', rice: 4.5, vegetables: 3.4, fruits: 2.7, average: 4.0 },
  { year: '2022', rice: 4.1, vegetables: 3.7, fruits: 3.0, average: 3.9 },
  { year: '2023', rice: 4.7, vegetables: 3.9, fruits: 3.2, average: 4.2 },
  { year: '2024', rice: 5.0, vegetables: 4.2, fruits: 3.5, average: 4.5 },
  { year: '2025', rice: 5.3, vegetables: 4.5, fruits: 3.8, average: 4.8 },
];

const climateData = [
  { month: 'Jan', temperature: 2, rainfall: 80, humidity: 75 },
  { month: 'Feb', temperature: 4, rainfall: 75, humidity: 73 },
  { month: 'Mar', temperature: 8, rainfall: 120, humidity: 76 },
  { month: 'Apr', temperature: 14, rainfall: 150, humidity: 78 },
  { month: 'May', temperature: 18, rainfall: 170, humidity: 80 },
  { month: 'Jun', temperature: 22, rainfall: 180, humidity: 82 },
  { month: 'Jul', temperature: 26, rainfall: 200, humidity: 85 },
  { month: 'Aug', temperature: 25, rainfall: 190, humidity: 84 },
  { month: 'Sep', temperature: 21, rainfall: 160, humidity: 82 },
  { month: 'Oct', temperature: 16, rainfall: 140, humidity: 79 },
  { month: 'Nov', temperature: 10, rainfall: 100, humidity: 77 },
  { month: 'Dec', temperature: 5, rainfall: 90, humidity: 76 },
];

export function AnalyticsCharts({ chartType }: AnalyticsChartsProps) {
  const t = useTranslations();
  const [dataView, setDataView] = useState<'annual' | 'seasonal'>('annual');

  return (
    <div className="h-full">
      {chartType === 'yield' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="flex space-x-2">
              <button
                onClick={() => setDataView('annual')}
                className={`px-3 py-1 text-xs rounded-lg ${
                  dataView === 'annual'
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('analytics.annual')}
              </button>
              <button
                onClick={() => setDataView('seasonal')}
                className={`px-3 py-1 text-xs rounded-lg ${
                  dataView === 'seasonal'
                    ? 'bg-primary-50 text-primary-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {t('analytics.seasonal')}
              </button>
            </div>
            <div className="text-sm text-gray-500">{t('analytics.yield_in_tons')}</div>
          </div>

          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={yieldData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="rice" name={t('community.category.rice')} fill="#4ade80" />
              <Bar dataKey="vegetables" name={t('community.category.vegetables')} fill="#fb923c" />
              <Bar dataKey="fruits" name={t('community.category.fruits')} fill="#60a5fa" />
              <Line
                type="monotone"
                dataKey="average"
                name={t('analytics.avg_yield')}
                stroke="#ef4444"
                strokeWidth={2}
              />
            </BarChart>
          </ResponsiveContainer>
        </>
      )}

      {chartType === 'climate' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-500">
              {t('analytics.climate_influence')}
            </div>
            <div className="text-sm text-gray-500">{t('analytics.current_year_data')}</div>
          </div>

          <ResponsiveContainer width="100%" height="90%">
            <LineChart data={climateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name={t('analytics.temperature_c')}
                stroke="#ef4444"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="rainfall"
                name={t('analytics.rainfall_mm')}
                stroke="#60a5fa"
                strokeWidth={2}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name={t('analytics.humidity_percent')}
                stroke="#4ade80"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}
