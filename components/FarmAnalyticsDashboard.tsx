'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { DashboardCard } from './DashboardCard';
import { AnalyticsCharts } from './AnalyticsCharts';
import { CostRevenueAnalysis } from './CostRevenueAnalysis';
import { YieldComparisonTable } from './YieldComparisonTable';
import { AnalyticsFilters } from './AnalyticsFilters';

// Mock data for key metrics
const keyMetrics = [
  {
    title: 'analytics.total_yield',
    value: '1,247',
    unit: 'tons',
    change: '+12.5%',
    changeType: 'positive' as const,
    icon: '🌾'
  },
  {
    title: 'analytics.total_revenue',
    value: '¥2,450,000',
    unit: '',
    change: '+8.3%',
    changeType: 'positive' as const,
    icon: '💰'
  },
  {
    title: 'analytics.total_costs',
    value: '¥1,680,000',
    unit: '',
    change: '-5.2%',
    changeType: 'positive' as const,
    icon: '📊'
  },
  {
    title: 'analytics.profit_margin',
    value: '31.4%',
    unit: '',
    change: '+15.7%',
    changeType: 'positive' as const,
    icon: '📈'
  }
];

const weatherImpactData = [
  { factor: 'analytics.temperature', impact: 85, color: '#ef4444' },
  { factor: 'analytics.rainfall', impact: 72, color: '#60a5fa' },
  { factor: 'analytics.humidity', impact: 68, color: '#4ade80' },
  { factor: 'analytics.wind_speed', impact: 45, color: '#f87171' }
];

export function FarmAnalyticsDashboard() {
  const t = useTranslations();
  const [selectedView, setSelectedView] = useState<'overview' | 'yield' | 'costs' | 'weather' | 'fields' | 'activities'>(('overview'));

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {keyMetrics.map((metric, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{t(metric.title)}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {metric.value}
                  {metric.unit && <span className="text-sm font-normal text-gray-500 ml-1">{metric.unit}</span>}
                </p>
                <p className={`text-sm font-medium ${metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                  {metric.change} {t('analytics.from_last_year')}
                </p>
              </div>
              <div className="text-3xl">{metric.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.yield_trends')}>
          <AnalyticsCharts chartType="yield" />
        </DashboardCard>

        <DashboardCard title={t('analytics.cost_revenue_analysis')}>
          <CostRevenueAnalysis />
        </DashboardCard>
      </div>

      {/* Weather Impact */}
      <DashboardCard title={t('analytics.weather_impact_summary')}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {weatherImpactData.map((item, index) => (
              <div key={index} className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-2">
                  <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="2"
                    />
                    <path
                      d="m18,2.0845 a 15.9155,15.9155 0 0,1 0,31.831 a 15.9155,15.9155 0 0,1 0,-31.831"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="2"
                      strokeDasharray={`${item.impact}, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-medium">{item.impact}%</span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900">{t(item.factor)}</p>
                <p className="text-xs text-gray-500">{t('analytics.impact_on_yield')}</p>
              </div>
            ))}
          </div>
        </div>
      </DashboardCard>
    </div>
  );

  const renderYieldAnalytics = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.yield_analytics')}>
        <AnalyticsCharts chartType="yield" />
      </DashboardCard>
      <DashboardCard title={t('analytics.yield_comparison_table')}>
        <YieldComparisonTable />
      </DashboardCard>
    </div>
  );

  const renderCostAnalytics = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.cost_revenue_analysis')}>
        <CostRevenueAnalysis />
      </DashboardCard>
    </div>
  );

  const renderWeatherAnalytics = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.weather_impact_analysis')}>
        <AnalyticsCharts chartType="climate" />
      </DashboardCard>
      <DashboardCard title={t('analytics.weather_factors_impact')}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {weatherImpactData.map((item, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{t(item.factor)}</h4>
                <span className="text-sm font-medium text-gray-600">{item.impact}% {t('analytics.impact')}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all duration-300"
                  style={{ width: `${item.impact}%`, backgroundColor: item.color }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {t(`analytics.${item.factor.toLowerCase().replace(' ', '_')}_description`)}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );

  const renderFieldAnalytics = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.field_performance_overview')}>
        <div className="text-center py-8 text-gray-500">
          {t('analytics.field_performance_content')}
        </div>
      </DashboardCard>
    </div>
  );

  const renderActivityAnalytics = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.activity_completion_analytics')}>
        <div className="text-center py-8 text-gray-500">
          {t('analytics.activity_analytics_content')}
        </div>
      </DashboardCard>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'overview', label: 'analytics.overview' },
              { id: 'yield', label: 'analytics.yield' },
              { id: 'costs', label: 'analytics.costs' },
              { id: 'weather', label: 'analytics.weather' },
              { id: 'fields', label: 'analytics.fields' },
              { id: 'activities', label: 'analytics.activities' }
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
      <AnalyticsFilters />

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'yield' && renderYieldAnalytics()}
      {selectedView === 'costs' && renderCostAnalytics()}
      {selectedView === 'weather' && renderWeatherAnalytics()}
      {selectedView === 'fields' && renderFieldAnalytics()}
      {selectedView === 'activities' && renderActivityAnalytics()}
    </div>
  );
}