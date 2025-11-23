'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

// Mock data for cost analysis
const monthlyCostData = [
  { month: 'Jan', revenue: 120000, totalCosts: 70000, labor: 20000, materials: 15000, equipment: 25000, other: 10000 },
  { month: 'Feb', revenue: 130000, totalCosts: 72000, labor: 21000, materials: 16000, equipment: 26000, other: 9000 },
  { month: 'Mar', revenue: 150000, totalCosts: 75000, labor: 22000, materials: 17000, equipment: 27000, other: 9000 },
  { month: 'Apr', revenue: 170000, totalCosts: 78000, labor: 23000, materials: 18000, equipment: 28000, other: 9000 },
  { month: 'May', revenue: 210000, totalCosts: 85000, labor: 25000, materials: 20000, equipment: 30000, other: 10000 },
  { month: 'Jun', revenue: 250000, totalCosts: 95000, labor: 28000, materials: 22000, equipment: 32000, other: 13000 },
  { month: 'Jul', revenue: 280000, totalCosts: 100000, labor: 30000, materials: 24000, equipment: 33000, other: 13000 },
  { month: 'Aug', revenue: 300000, totalCosts: 105000, labor: 32000, materials: 25000, equipment: 34000, other: 14000 },
  { month: 'Sep', revenue: 250000, totalCosts: 95000, labor: 28000, materials: 22000, equipment: 32000, other: 13000 },
  { month: 'Oct', revenue: 220000, totalCosts: 90000, labor: 26000, materials: 21000, equipment: 31000, other: 12000 },
  { month: 'Nov', revenue: 180000, totalCosts: 85000, labor: 24000, materials: 19000, equipment: 29000, other: 13000 },
  { month: 'Dec', revenue: 150000, totalCosts: 80000, labor: 22000, materials: 18000, equipment: 28000, other: 12000 },
];

const costBreakdownData = [
  { name: 'Labor', value: 30, color: '#4ade80', amount: 288000 },
  { name: 'Materials', value: 25, color: '#fb923c', amount: 240000 },
  { name: 'Equipment', value: 28, color: '#f87171', amount: 336000 },
  { name: 'Other', value: 17, color: '#60a5fa', amount: 163200 },
];

const profitabilityData = [
  { crop: 'Rice', revenue: 850000, costs: 480000, profit: 370000, margin: 43.5 },
  { crop: 'Tomatoes', revenue: 320000, costs: 180000, profit: 140000, margin: 43.8 },
  { crop: 'Cucumbers', revenue: 280000, costs: 160000, profit: 120000, margin: 42.9 },
  { crop: 'Edamame', revenue: 150000, costs: 90000, profit: 60000, margin: 40.0 },
  { crop: 'Sweet Potatoes', revenue: 120000, costs: 75000, profit: 45000, margin: 37.5 },
];

const costTrendsData = [
  { month: 'Jan', budgeted: 65000, actual: 70000, variance: -5000 },
  { month: 'Feb', budgeted: 68000, actual: 72000, variance: -4000 },
  { month: 'Mar', budgeted: 72000, actual: 75000, variance: -3000 },
  { month: 'Apr', budgeted: 75000, actual: 78000, variance: -3000 },
  { month: 'May', budgeted: 80000, actual: 85000, variance: -5000 },
  { month: 'Jun', budgeted: 90000, actual: 95000, variance: -5000 },
  { month: 'Jul', budgeted: 95000, actual: 100000, variance: -5000 },
  { month: 'Aug', budgeted: 98000, actual: 105000, variance: -7000 },
  { month: 'Sep', budgeted: 92000, actual: 95000, variance: -3000 },
  { month: 'Oct', budgeted: 88000, actual: 90000, variance: -2000 },
  { month: 'Nov', budgeted: 82000, actual: 85000, variance: -3000 },
  { month: 'Dec', budgeted: 78000, actual: 80000, variance: -2000 },
];

export function CostAnalysis() {
  const t = useTranslations();
  const [selectedView, setSelectedView] = useState<'overview' | 'breakdown' | 'trends' | 'profitability'>('overview');
  const [timeRange, setTimeRange] = useState('12months');

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.total_revenue')}</p>
              <p className="text-2xl font-bold text-gray-900">¥2,360,000</p>
              <p className="text-sm text-green-600">+8.3% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">💰</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.total_costs')}</p>
              <p className="text-2xl font-bold text-gray-900">¥1,027,200</p>
              <p className="text-red-600">-5.2% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.net_profit')}</p>
              <p className="text-2xl font-bold text-gray-900">¥1,332,800</p>
              <p className="text-green-600">+15.7% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.profit_margin')}</p>
              <p className="text-2xl font-bold text-gray-900">56.5%</p>
              <p className="text-green-600">+2.1% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">🎯</div>
          </div>
        </div>
      </div>

      {/* Revenue vs Costs Chart */}
      <DashboardCard title={t('analytics.revenue_vs_costs')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Area
                type="monotone"
                dataKey="revenue"
                stackId="1"
                stroke="#4ade80"
                fill="#4ade80"
                fillOpacity={0.6}
                name={t('analytics.revenue')}
              />
              <Area
                type="monotone"
                dataKey="totalCosts"
                stackId="2"
                stroke="#f87171"
                fill="#f87171"
                fillOpacity={0.6}
                name={t('analytics.total_costs')}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </div>
  );

  const renderBreakdown = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.cost_breakdown')}>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costBreakdownData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {costBreakdownData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title={t('analytics.cost_categories')}>
          <div className="space-y-4">
            {costBreakdownData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-600">{item.value}% of total costs</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">¥{item.amount.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title={t('analytics.monthly_cost_trends')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyCostData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="labor" stackId="a" fill="#4ade80" name={t('analytics.labor')} />
              <Bar dataKey="materials" stackId="a" fill="#fb923c" name={t('analytics.materials')} />
              <Bar dataKey="equipment" stackId="a" fill="#f87171" name={t('analytics.equipment')} />
              <Bar dataKey="other" stackId="a" fill="#60a5fa" name={t('analytics.other')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </div>
  );

  const renderTrends = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.budget_vs_actual')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={costTrendsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => `¥${value.toLocaleString()}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="budgeted"
                stroke="#4ade80"
                strokeWidth={2}
                name={t('analytics.budgeted')}
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#f87171"
                strokeWidth={2}
                name={t('analytics.actual')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.variance_analysis')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.month')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.budgeted')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.actual')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.variance')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.variance_percent')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {costTrendsData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ¥{item.budgeted.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ¥{item.actual.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {item.variance > 0 ? '+' : ''}¥{item.variance.toLocaleString()}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    item.variance > 0 ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {((item.variance / item.budgeted) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );

  const renderProfitability = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.profitability_by_crop')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.crop')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.revenue')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.costs')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.profit')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.margin')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {profitabilityData.map((item, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.crop}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ¥{item.revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    ¥{item.costs.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    ¥{item.profit.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      item.margin >= 40 ? 'bg-green-100 text-green-800' :
                      item.margin >= 30 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {item.margin}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.cost_optimization_opportunities')}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.labor_cost_optimization')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.labor_cost_recommendation')}
            </p>
            <p className="text-sm font-medium text-green-800 mt-2">
              {t('analytics.potential_savings')}: ¥45,000 ({t('analytics.per_month')})
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.equipment_maintenance')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.equipment_maintenance_recommendation')}
            </p>
            <p className="text-sm font-medium text-blue-800 mt-2">
              {t('analytics.potential_savings')}: ¥28,000 ({t('analytics.per_month')})
            </p>
          </div>

          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h4 className="font-medium text-orange-800">{t('analytics.material_bulk_purchasing')}</h4>
            <p className="text-sm text-orange-700 mt-1">
              {t('analytics.material_bulk_recommendation')}
            </p>
            <p className="text-sm font-medium text-orange-800 mt-2">
              {t('analytics.potential_savings')}: ¥32,000 ({t('analytics.per_month')})
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'analytics.overview' },
              { id: 'breakdown', label: 'analytics.breakdown' },
              { id: 'trends', label: 'analytics.trends' },
              { id: 'profitability', label: 'analytics.profitability' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  selectedView === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {t(tab.label)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Time Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">{t('analytics.time_range')}:</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="3months">{t('analytics.last_3_months')}</option>
            <option value="6months">{t('analytics.last_6_months')}</option>
            <option value="12months">{t('analytics.last_12_months')}</option>
            <option value="2years">{t('analytics.last_2_years')}</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'breakdown' && renderBreakdown()}
      {selectedView === 'trends' && renderTrends()}
      {selectedView === 'profitability' && renderProfitability()}
    </div>
  );
}