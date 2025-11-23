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
  ScatterChart,
  Scatter,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

// Mock data for yield analytics
const yieldTrendData = [
  { month: 'Jan', rice: 4.2, vegetables: 3.1, fruits: 2.5, target: 4.0 },
  { month: 'Feb', rice: 4.5, vegetables: 3.4, fruits: 2.7, target: 4.2 },
  { month: 'Mar', rice: 4.1, vegetables: 3.7, fruits: 3.0, target: 4.1 },
  { month: 'Apr', rice: 4.7, vegetables: 3.9, fruits: 3.2, target: 4.3 },
  { month: 'May', rice: 5.0, vegetables: 4.2, fruits: 3.5, target: 4.5 },
  { month: 'Jun', rice: 5.3, vegetables: 4.5, fruits: 3.8, target: 4.8 },
  { month: 'Jul', rice: 5.1, vegetables: 4.3, fruits: 3.6, target: 4.6 },
  { month: 'Aug', rice: 4.8, vegetables: 4.0, fruits: 3.3, target: 4.4 },
  { month: 'Sep', rice: 4.6, vegetables: 3.8, fruits: 3.1, target: 4.2 },
  { month: 'Oct', rice: 4.4, vegetables: 3.6, fruits: 2.9, target: 4.0 },
  { month: 'Nov', rice: 4.2, vegetables: 3.4, fruits: 2.7, target: 3.8 },
  { month: 'Dec', rice: 4.0, vegetables: 3.2, fruits: 2.5, target: 3.6 },
];

const yieldVariabilityData = [
  { crop: 'Rice', min: 3.8, max: 5.5, avg: 4.6, target: 5.0 },
  { crop: 'Tomatoes', min: 65, max: 85, avg: 75, target: 80 },
  { crop: 'Cucumbers', min: 55, max: 75, avg: 65, target: 70 },
  { crop: 'Edamame', min: 8.5, max: 12.5, avg: 10.5, target: 11.0 },
  { crop: 'Sweet Potatoes', min: 28, max: 38, avg: 33, target: 35 },
];

const yieldFactorsData = [
  { factor: 'Soil Quality', impact: 85, correlation: 0.78 },
  { factor: 'Irrigation', impact: 72, correlation: 0.65 },
  { factor: 'Fertilization', impact: 68, correlation: 0.62 },
  { factor: 'Weather', impact: 91, correlation: 0.84 },
  { factor: 'Pest Control', impact: 45, correlation: 0.38 },
  { factor: 'Timing', impact: 78, correlation: 0.71 },
];

export function YieldAnalytics() {
  const t = useTranslations();
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [timeRange, setTimeRange] = useState('12months');
  const [chartType, setChartType] = useState<'trend' | 'comparison' | 'factors'>('trend');

  const renderTrendChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={yieldTrendData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area
          type="monotone"
          dataKey="rice"
          stackId="1"
          stroke="#4ade80"
          fill="#4ade80"
          fillOpacity={0.6}
          name={t('community.category.rice')}
        />
        <Area
          type="monotone"
          dataKey="vegetables"
          stackId="1"
          stroke="#fb923c"
          fill="#fb923c"
          fillOpacity={0.6}
          name={t('community.category.vegetables')}
        />
        <Area
          type="monotone"
          dataKey="fruits"
          stackId="1"
          stroke="#60a5fa"
          fill="#60a5fa"
          fillOpacity={0.6}
          name={t('community.category.fruits')}
        />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="5 5"
          name={t('analytics.target_yield')}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderComparisonChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={yieldVariabilityData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="crop" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="min" name={t('analytics.min_yield')} fill="#f87171" />
        <Bar dataKey="avg" name={t('analytics.avg_yield')} fill="#4ade80" />
        <Bar dataKey="max" name={t('analytics.max_yield')} fill="#60a5fa" />
        <Line
          type="monotone"
          dataKey="target"
          stroke="#ef4444"
          strokeWidth={2}
          name={t('analytics.target_yield')}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderFactorsChart = () => (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart data={yieldFactorsData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          type="number"
          dataKey="correlation"
          domain={[0, 1]}
          label={{ value: t('analytics.correlation'), position: 'insideBottom', offset: -5 }}
        />
        <YAxis
          type="number"
          dataKey="impact"
          domain={[0, 100]}
          label={{ value: t('analytics.impact_percent'), angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          formatter={(value, name) => [
            name === 'correlation' ? `${value}` : `${value}%`,
            name === 'correlation' ? t('analytics.correlation') : t('analytics.impact')
          ]}
          labelFormatter={(label) => `${t('analytics.factor')}: ${label}`}
        />
        <Scatter
          name={t('analytics.yield_factors')}
          dataKey="impact"
          fill="#4ade80"
        />
      </ScatterChart>
    </ResponsiveContainer>
  );

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.crop_filter')}
            </label>
            <select
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('analytics.all_crops')}</option>
              <option value="rice">{t('community.category.rice')}</option>
              <option value="vegetables">{t('community.category.vegetables')}</option>
              <option value="fruits">{t('community.category.fruits')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.time_range')}
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="3months">{t('analytics.last_3_months')}</option>
              <option value="6months">{t('analytics.last_6_months')}</option>
              <option value="12months">{t('analytics.last_12_months')}</option>
              <option value="2years">{t('analytics.last_2_years')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.chart_type')}
            </label>
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as any)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="trend">{t('analytics.yield_trends')}</option>
              <option value="comparison">{t('analytics.yield_comparison')}</option>
              <option value="factors">{t('analytics.yield_factors')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Chart */}
      <DashboardCard title={
        chartType === 'trend' ? t('analytics.yield_trends') :
        chartType === 'comparison' ? t('analytics.yield_comparison') :
        t('analytics.yield_factors_analysis')
      }>
        <div className="h-96">
          {chartType === 'trend' && renderTrendChart()}
          {chartType === 'comparison' && renderComparisonChart()}
          {chartType === 'factors' && renderFactorsChart()}
        </div>
      </DashboardCard>

      {/* Yield Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.yield_insights')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">{t('analytics.best_performing_crop')}</p>
                <p className="text-lg font-bold text-green-900">{t('community.category.rice')}</p>
              </div>
              <div className="text-2xl">🌾</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">{t('analytics.highest_variability')}</p>
                <p className="text-lg font-bold text-blue-900">{t('analytics.sweet_potatoes')}</p>
              </div>
              <div className="text-2xl">🥔</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-yellow-800">{t('analytics.target_achievement')}</p>
                <p className="text-lg font-bold text-yellow-900">87%</p>
              </div>
              <div className="text-2xl">🎯</div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('analytics.recommendations')}>
          <div className="space-y-3">
            <div className="p-3 border-l-4 border-green-500 bg-green-50">
              <p className="text-sm text-green-800">
                <strong>{t('analytics.optimize_irrigation')}:</strong> {t('analytics.irrigation_recommendation')}
              </p>
            </div>

            <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
              <p className="text-sm text-blue-800">
                <strong>{t('analytics.timing_optimization')}:</strong> {t('analytics.timing_recommendation')}
              </p>
            </div>

            <div className="p-3 border-l-4 border-orange-500 bg-orange-50">
              <p className="text-sm text-orange-800">
                <strong>{t('analytics.soil_management')}:</strong> {t('analytics.soil_recommendation')}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Performance Summary */}
      <DashboardCard title={t('analytics.performance_summary')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.crop')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.avg_yield')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.target')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.achievement')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.trend')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {yieldVariabilityData.map((crop, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {crop.crop}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {crop.avg} {crop.crop === 'Rice' ? 'tons/ha' : 'tons/ha'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {crop.target} {crop.crop === 'Rice' ? 'tons/ha' : 'tons/ha'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (crop.avg / crop.target) >= 0.95 ? 'bg-green-100 text-green-800' :
                      (crop.avg / crop.target) >= 0.85 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round((crop.avg / crop.target) * 100)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="text-green-600">↗ {t('analytics.improving')}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}