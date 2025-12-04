'use client';

import { useState, useEffect } from 'react';
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
} from 'recharts';

type ChartType = 'yield' | 'profit';

export function FarmMetricsChart() {
  const t = useTranslations();
  const [activeChart, setActiveChart] = useState<ChartType>('yield');
  const [seasonalData, setSeasonalData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/v1/analytics/financial');
        if (res.ok) {
          const data = await res.json();
          setSeasonalData(data.seasonal || []);
          setProfitData(data.profit || []);
        }
      } catch (error) {
        console.error('Failed to fetch financial analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="h-96 flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="h-96">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveChart('yield')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${activeChart === 'yield'
              ? 'bg-primary-50 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
          >
            {t('metrics.crop_yield')}
          </button>
          <button
            onClick={() => setActiveChart('profit')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${activeChart === 'profit'
              ? 'bg-primary-50 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
          >
            {t('metrics.profit_margin')}
          </button>
        </div>
        <div>
          <select className="text-sm border border-gray-300 rounded-md p-2">
            <option>2025 ({t('metrics.current_year')})</option>
            <option>2024</option>
            <option>2023</option>
          </select>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        {activeChart === 'yield' ? (
          <BarChart
            data={seasonalData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="rice" stackId="a" fill="#16a34a" name={t('metrics.rice_kg')} />
            <Bar dataKey="vegetables" stackId="a" fill="#84cc16" name={t('metrics.vegetables_kg')} />
            <Bar dataKey="fruits" stackId="a" fill="#eab308" name={t('metrics.fruits_kg')} />
          </BarChart>
        ) : (
          <LineChart
            data={profitData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="revenue" stroke="#16a34a" name={t('metrics.revenue_yen')} />
            <Line type="monotone" dataKey="expenses" stroke="#ef4444" name={t('metrics.expenses_yen')} />
            <Line type="monotone" dataKey="profit" stroke="#3b82f6" name={t('metrics.profit_yen')} strokeWidth={2} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
