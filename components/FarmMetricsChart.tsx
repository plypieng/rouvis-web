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
} from 'recharts';

// Mock data for demonstration
const seasonalData = [
  { month: 'Jan', rice: 0, vegetables: 120, fruits: 50 },
  { month: 'Feb', rice: 0, vegetables: 180, fruits: 40 },
  { month: 'Mar', rice: 0, vegetables: 250, fruits: 30 },
  { month: 'Apr', rice: 100, vegetables: 300, fruits: 20 },
  { month: 'May', rice: 350, vegetables: 270, fruits: 10 },
  { month: 'Jun', rice: 650, vegetables: 200, fruits: 30 },
  { month: 'Jul', rice: 950, vegetables: 150, fruits: 90 },
  { month: 'Aug', rice: 1200, vegetables: 100, fruits: 160 },
  { month: 'Sep', rice: 850, vegetables: 80, fruits: 220 },
  { month: 'Oct', rice: 400, vegetables: 120, fruits: 180 },
  { month: 'Nov', rice: 0, vegetables: 160, fruits: 100 },
  { month: 'Dec', rice: 0, vegetables: 140, fruits: 60 },
];

const profitData = [
  { month: 'Jan', revenue: 5200, expenses: 3800, profit: 1400 },
  { month: 'Feb', revenue: 6100, expenses: 4100, profit: 2000 },
  { month: 'Mar', revenue: 7500, expenses: 4700, profit: 2800 },
  { month: 'Apr', revenue: 9200, expenses: 5300, profit: 3900 },
  { month: 'May', revenue: 10800, expenses: 6200, profit: 4600 },
  { month: 'Jun', revenue: 12500, expenses: 7100, profit: 5400 },
  { month: 'Jul', revenue: 15000, expenses: 8400, profit: 6600 },
  { month: 'Aug', revenue: 16700, expenses: 9200, profit: 7500 },
  { month: 'Sep', revenue: 14300, expenses: 8100, profit: 6200 },
  { month: 'Oct', revenue: 11900, expenses: 6800, profit: 5100 },
  { month: 'Nov', revenue: 9600, expenses: 5900, profit: 3700 },
  { month: 'Dec', revenue: 7800, expenses: 4900, profit: 2900 },
];

type ChartType = 'yield' | 'profit';

export function FarmMetricsChart() {
  const t = useTranslations();
  const [activeChart, setActiveChart] = useState<ChartType>('yield');

  return (
    <div className="h-96">
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveChart('yield')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeChart === 'yield'
                ? 'bg-primary-50 text-primary-700'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('metrics.crop_yield')}
          </button>
          <button
            onClick={() => setActiveChart('profit')}
            className={`px-4 py-2 text-sm font-medium rounded-lg ${
              activeChart === 'profit'
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
