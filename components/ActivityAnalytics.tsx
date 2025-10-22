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

// Mock data for activity analytics
const activityCompletionData = [
  { month: 'Jan', completed: 145, planned: 150, onTime: 132, delayed: 13 },
  { month: 'Feb', completed: 138, planned: 145, onTime: 125, delayed: 13 },
  { month: 'Mar', completed: 152, planned: 155, onTime: 140, delayed: 12 },
  { month: 'Apr', completed: 167, planned: 170, onTime: 155, delayed: 12 },
  { month: 'May', completed: 189, planned: 185, onTime: 175, delayed: 14 },
  { month: 'Jun', completed: 203, planned: 200, onTime: 190, delayed: 13 },
  { month: 'Jul', completed: 218, planned: 215, onTime: 205, delayed: 13 },
  { month: 'Aug', completed: 225, planned: 220, onTime: 210, delayed: 15 },
  { month: 'Sep', completed: 198, planned: 200, onTime: 185, delayed: 13 },
  { month: 'Oct', completed: 175, planned: 180, onTime: 165, delayed: 10 },
  { month: 'Nov', completed: 152, planned: 155, onTime: 145, delayed: 7 },
  { month: 'Dec', completed: 138, planned: 140, onTime: 130, delayed: 8 },
];

const activityTypeData = [
  { type: 'Watering', completed: 245, planned: 250, efficiency: 98 },
  { type: 'Fertilizing', completed: 189, planned: 195, efficiency: 97 },
  { type: 'Harvesting', completed: 156, planned: 160, efficiency: 98 },
  { type: 'Planting', completed: 134, planned: 140, efficiency: 96 },
  { type: 'Maintenance', completed: 98, planned: 105, efficiency: 93 },
  { type: 'Monitoring', completed: 167, planned: 170, efficiency: 98 },
];

const activityStatusData = [
  { name: 'Completed', value: 89, color: '#4ade80' },
  { name: 'In Progress', value: 8, color: '#fbbf24' },
  { name: 'Overdue', value: 3, color: '#f87171' },
];

const fieldActivityData = [
  { field: 'North Rice Field', activities: 45, completed: 43, avgTime: 2.3 },
  { field: 'South Rice Field', activities: 38, completed: 36, avgTime: 2.1 },
  { field: 'East Vegetable Garden', activities: 52, completed: 51, avgTime: 1.8 },
  { field: 'West Vegetable Plot', activities: 41, completed: 39, avgTime: 1.9 },
  { field: 'Fruit Orchard', activities: 28, completed: 26, avgTime: 3.2 },
  { field: 'Greenhouse A', activities: 35, completed: 35, avgTime: 1.5 },
];

const timeEfficiencyData = [
  { day: 'Mon', avgTime: 2.1, targetTime: 2.0, activities: 25 },
  { day: 'Tue', avgTime: 2.3, targetTime: 2.0, activities: 28 },
  { day: 'Wed', avgTime: 1.9, targetTime: 2.0, activities: 22 },
  { day: 'Thu', avgTime: 2.4, targetTime: 2.0, activities: 30 },
  { day: 'Fri', avgTime: 2.2, targetTime: 2.0, activities: 26 },
  { day: 'Sat', avgTime: 2.6, targetTime: 2.5, activities: 18 },
  { day: 'Sun', avgTime: 2.8, targetTime: 2.5, activities: 15 },
];

export function ActivityAnalytics() {
  const t = useTranslations();
  const [selectedView, setSelectedView] = useState<'overview' | 'completion' | 'efficiency' | 'field'>('overview');
  const [selectedActivityType, setSelectedActivityType] = useState('all');

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.total_activities')}</p>
              <p className="text-2xl font-bold text-gray-900">1,847</p>
              <p className="text-sm text-green-600">+12.5% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">📋</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.completion_rate')}</p>
              <p className="text-2xl font-bold text-gray-900">96.8%</p>
              <p className="text-sm text-green-600">+2.1% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">✅</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.on_time_rate')}</p>
              <p className="text-2xl font-bold text-gray-900">92.3%</p>
              <p className="text-sm text-green-600">+1.8% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">⏰</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.avg_completion_time')}</p>
              <p className="text-2xl font-bold text-gray-900">2.2h</p>
              <p className="text-sm text-green-600">-8.3% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>
      </div>

      {/* Activity Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.activity_status_overview')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {activityStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title={t('analytics.monthly_completion_trend')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityCompletionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stackId="1"
                  stroke="#4ade80"
                  fill="#4ade80"
                  fillOpacity={0.6}
                  name={t('analytics.completed')}
                />
                <Area
                  type="monotone"
                  dataKey="planned"
                  stackId="2"
                  stroke="#60a5fa"
                  fill="#60a5fa"
                  fillOpacity={0.6}
                  name={t('analytics.planned')}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>
    </div>
  );

  const renderCompletion = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.activity_completion_analysis')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={activityCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="onTime" stackId="a" fill="#4ade80" name={t('analytics.on_time')} />
              <Bar dataKey="delayed" stackId="a" fill="#f87171" name={t('analytics.delayed')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.activity_type_performance')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.activity_type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.completed')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.planned')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.efficiency')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.performance')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activityTypeData.map((activity, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {activity.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.completed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.planned}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activity.efficiency >= 97 ? 'bg-green-100 text-green-800' :
                      activity.efficiency >= 95 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {activity.efficiency}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`font-medium ${
                      activity.efficiency >= 97 ? 'text-green-600' :
                      activity.efficiency >= 95 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {activity.efficiency >= 97 ? t('analytics.excellent') :
                       activity.efficiency >= 95 ? t('analytics.good') :
                       t('analytics.needs_improvement')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );

  const renderEfficiency = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.time_efficiency_analysis')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="avgTime"
                stroke="#4ade80"
                strokeWidth={2}
                name={t('analytics.avg_completion_time')}
              />
              <Line
                type="monotone"
                dataKey="targetTime"
                stroke="#f87171"
                strokeWidth={2}
                strokeDasharray="5 5"
                name={t('analytics.target_time')}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.efficiency_insights')}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.best_performance_day')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.wednesday_efficiency')}
            </p>
            <p className="text-sm font-medium text-green-800 mt-2">
              {t('analytics.time_savings')}: 5.2% {t('analytics.faster_than_target')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-red-500 bg-red-50">
            <h4 className="font-medium text-red-800">{t('analytics.needs_improvement')}</h4>
            <p className="text-sm text-red-700 mt-1">
              {t('analytics.sunday_efficiency')}
            </p>
            <p className="text-sm font-medium text-red-800 mt-2">
              {t('analytics.time_overrun')}: 12% {t('analytics.slower_than_target')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.peak_productivity_hours')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.morning_hours_recommendation')}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );

  const renderField = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.field_activity_distribution')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fieldActivityData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="activities" fill="#4ade80" name={t('analytics.total_activities')} />
              <Bar dataKey="completed" fill="#60a5fa" name={t('analytics.completed_activities')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.field_performance_details')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.field')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.total_activities')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.completion_rate')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.avg_time')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.performance')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldActivityData.map((field, index) => {
                const completionRate = (field.completed / field.activities) * 100;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.activities}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        completionRate >= 95 ? 'bg-green-100 text-green-800' :
                        completionRate >= 90 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.avgTime}h
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        completionRate >= 95 && field.avgTime <= 2.0 ? 'text-green-600' :
                        completionRate >= 90 || field.avgTime <= 2.5 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {completionRate >= 95 && field.avgTime <= 2.0 ? t('analytics.excellent') :
                         completionRate >= 90 || field.avgTime <= 2.5 ? t('analytics.good') :
                         t('analytics.needs_attention')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.field_optimization_recommendations')}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.greenhouse_excellence')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.greenhouse_recommendation')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h4 className="font-medium text-orange-800">{t('analytics.fruit_orchard_attention')}</h4>
            <p className="text-sm text-orange-700 mt-1">
              {t('analytics.fruit_orchard_recommendation')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.workflow_optimization')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.workflow_recommendation')}
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
           ={[
              { id: 'overview', label: 'analytics.overview' },
              { id: 'completion', label: 'analytics.completion' },
              { id: 'efficiency', label: 'analytics.efficiency' },
              { id: 'field', label: 'analytics.field_analysis' },
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

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.activity_type_filter')}
            </label>
            <select
              value={selectedActivityType}
              onChange={(e) => setSelectedActivityType(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('analytics.all_activities')}</option>
              <option value="watering">{t('activity_types.watering')}</option>
              <option value="fertilizing">{t('activity_types.fertilizing')}</option>
              <option value="harvesting">{t('activity_types.harvesting')}</option>
              <option value="planting">{t('activity_types.planting')}</option>
              <option value="maintenance">{t('activity_types.maintenance')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.time_period')}
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
              <option value="current">{t('analytics.current_month')}</option>
              <option value="3months">{t('analytics.last_3_months')}</option>
              <option value="6months">{t('analytics.last_6_months')}</option>
              <option value="12months">{t('analytics.last_12_months')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'completion' && renderCompletion()}
      {selectedView === 'efficiency' && renderEfficiency()}
      {selectedView === 'field' && renderField()}
    </div>
  );
}