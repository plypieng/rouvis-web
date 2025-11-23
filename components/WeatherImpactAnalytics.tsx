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
  ScatterChart,
  Scatter,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

// Mock data for weather impact analytics
const weatherYieldCorrelationData = [
  { month: 'Jan', temperature: 2, rainfall: 80, yield: 4.2, correlation: 0.75 },
  { month: 'Feb', temperature: 4, rainfall: 75, yield: 4.5, correlation: 0.78 },
  { month: 'Mar', temperature: 8, rainfall: 120, yield: 4.1, correlation: 0.82 },
  { month: 'Apr', temperature: 14, rainfall: 150, yield: 4.7, correlation: 0.85 },
  { month: 'May', temperature: 18, rainfall: 170, yield: 5.0, correlation: 0.88 },
  { month: 'Jun', temperature: 22, rainfall: 180, yield: 5.3, correlation: 0.91 },
  { month: 'Jul', temperature: 26, rainfall: 200, yield: 5.1, correlation: 0.87 },
  { month: 'Aug', temperature: 25, rainfall: 190, yield: 4.8, correlation: 0.83 },
  { month: 'Sep', temperature: 21, rainfall: 160, yield: 4.6, correlation: 0.79 },
  { month: 'Oct', temperature: 16, rainfall: 140, yield: 4.4, correlation: 0.76 },
  { month: 'Nov', temperature: 10, rainfall: 100, yield: 4.2, correlation: 0.74 },
  { month: 'Dec', temperature: 5, rainfall: 90, yield: 4.0, correlation: 0.72 },
];

const weatherEventImpactData = [
  { event: 'Heavy Rain', date: '2024-06-15', impact: -15, duration: 3, crop: 'Rice' },
  { event: 'Heat Wave', date: '2024-07-20', impact: -22, duration: 5, crop: 'Tomatoes' },
  { event: 'Drought', date: '2024-08-10', impact: -18, duration: 7, crop: 'Rice' },
  { event: 'Late Frost', date: '2024-04-05', impact: -12, duration: 2, crop: 'Vegetables' },
  { event: 'Typhoon', date: '2024-09-18', impact: -25, duration: 4, crop: 'Rice' },
  { event: 'Cold Snap', date: '2024-11-12', impact: -8, duration: 3, crop: 'Edamame' },
];

const weatherFactorAnalysisData = [
  { factor: 'Temperature', optimal: 20, current: 22, impact: 85, risk: 'Medium' },
  { factor: 'Rainfall', optimal: 150, current: 180, impact: 72, risk: 'High' },
  { factor: 'Humidity', optimal: 65, current: 78, impact: 68, risk: 'Low' },
  { factor: 'Wind Speed', optimal: 5, current: 12, impact: 45, risk: 'Medium' },
  { factor: 'Sunlight', optimal: 8, current: 7, impact: 91, risk: 'Low' },
  { factor: 'Soil Moisture', optimal: 60, current: 75, impact: 78, risk: 'Medium' },
];

const seasonalWeatherPatternsData = [
  { season: 'Spring', avgTemp: 12, avgRainfall: 120, yieldImpact: 88, riskLevel: 'Low' },
  { season: 'Summer', avgTemp: 25, avgRainfall: 180, yieldImpact: 75, riskLevel: 'High' },
  { season: 'Fall', avgTemp: 18, avgRainfall: 140, yieldImpact: 82, riskLevel: 'Medium' },
  { season: 'Winter', avgTemp: 5, avgRainfall: 90, yieldImpact: 65, riskLevel: 'High' },
];

export function WeatherImpactAnalytics() {
  const t = useTranslations();
  const [selectedView, setSelectedView] = useState<'correlation' | 'events' | 'factors' | 'seasonal'>('correlation');
  const [selectedCrop, setSelectedCrop] = useState('all');

  const renderCorrelationAnalysis = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.weather_yield_correlation')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={weatherYieldCorrelationData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="temperature" fill="#ef4444" name={t('analytics.temperature_c')} />
              <Bar yAxisId="right" dataKey="rainfall" fill="#60a5fa" name={t('analytics.rainfall_mm')} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="yield"
                stroke="#4ade80"
                strokeWidth={3}
                name={t('analytics.yield_tons_ha')}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.correlation_strength')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-blue-800">{t('analytics.temperature_yield_corr')}</p>
                <p className="text-lg font-bold text-blue-900">0.78</p>
              </div>
              <div className="text-2xl">🌡️</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-green-800">{t('analytics.rainfall_yield_corr')}</p>
                <p className="text-lg font-bold text-green-900">0.65</p>
              </div>
              <div className="text-2xl">🌧️</div>
            </div>

            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-yellow-800">{t('analytics.humidity_yield_corr')}</p>
                <p className="text-lg font-bold text-yellow-900">0.62</p>
              </div>
              <div className="text-2xl">💧</div>
            </div>
          </div>
        </DashboardCard>

        <DashboardCard title={t('analytics.weather_impact_summary')}>
          <div className="space-y-3">
            <div className="p-3 border-l-4 border-green-500 bg-green-50">
              <p className="text-sm text-green-800">
                <strong>{t('analytics.positive_weather_impact')}:</strong> {t('analytics.optimal_conditions_june')}
              </p>
            </div>

            <div className="p-3 border-l-4 border-red-500 bg-red-50">
              <p className="text-sm text-red-800">
                <strong>{t('analytics.negative_weather_impact')}:</strong> {t('analytics.excessive_rainfall_july')}
              </p>
            </div>

            <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
              <p className="text-sm text-blue-800">
                <strong>{t('analytics.weather_prediction_accuracy')}:</strong> {t('analytics.prediction_accuracy_85')}
              </p>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );

  const renderWeatherEvents = () => (
    <div className="space-y-6">
      <DashboardCard title={t('.analytics.weather_events_impact')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.event_type')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.date')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.crop_affected')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.duration_days')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.yield_impact')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weatherEventImpactData.map((event, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.event}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.date}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.crop}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {event.duration}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {event.impact}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.weather_event_frequency')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weatherEventImpactData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="event" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="impact" fill="#f87171" name={t('analytics.yield_impact_percent')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>
    </div>
  );

  const renderWeatherFactors = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.weather_factors_analysis')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.weather_factor')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.optimal')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.current')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.impact_score')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.risk_level')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {weatherFactorAnalysisData.map((factor, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {factor.factor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {factor.optimal}{factor.factor === 'Temperature' ? '°C' : factor.factor === 'Rainfall' ? 'mm' : factor.factor === 'Humidity' || factor.factor === 'Soil Moisture' ? '%' : factor.factor === 'Wind Speed' ? 'km/h' : 'hrs'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {factor.current}{factor.factor === 'Temperature' ? '°C' : factor.factor === 'Rainfall' ? 'mm' : factor.factor === 'Humidity' || factor.factor === 'Soil Moisture' ? '%' : factor.factor === 'Wind Speed' ? 'km/h' : 'hrs'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      factor.impact >= 80 ? 'bg-green-100 text-green-800' :
                      factor.impact >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {factor.impact}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      factor.risk === 'Low' ? 'bg-green-100 text-green-800' :
                      factor.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {factor.risk}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.weather_risk_assessment')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weatherFactorAnalysisData.map((factor, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">{factor.factor}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  factor.risk === 'Low' ? 'bg-green-100 text-green-800' :
                  factor.risk === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {factor.risk}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all duration-300 ${
                    factor.risk === 'Low' ? 'bg-green-500' :
                    factor.risk === 'Medium' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${factor.impact}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600">
                {t('analytics.optimal')}: {factor.optimal} | {t('analytics.current')}: {factor.current}
              </p>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );

  const renderSeasonalAnalysis = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.seasonal_weather_patterns')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={seasonalWeatherPatternsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="season" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="avgTemp" fill="#ef4444" name={t('analytics.avg_temperature_c')} />
              <Bar yAxisId="right" dataKey="avgRainfall" fill="#60a5fa" name={t('analytics.avg_rainfall_mm')} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="yieldImpact"
                stroke="#4ade80"
                strokeWidth={3}
                name={t('analytics.yield_impact_percent')} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.seasonal_risk_assessment')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {seasonalWeatherPatternsData.map((season, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">{season.season}</h4>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  season.riskLevel === 'Low' ? 'bg-green-100 text-green-800' :
                  season.riskLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {season.riskLevel} {t('analytics.risk')}
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('analytics.avg_temperature')}:</span>
                  <span className="font-medium">{season.avgTemp}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('analytics.avg_rainfall')}:</span>
                  <span className="font-medium">{season.avgRainfall}mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('analytics.yield_impact')}:</span>
                  <span className="font-medium">{season.yieldImpact}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.weather_adaptation_strategies')} snake-case={{ snakeCase: 'analytics.temperature_c' }}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.summer_risk_mitigation')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.summer_risk_description')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.winter_protection')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.winter_protection_description')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h4 className="font-medium text-orange-800">{t('analytics.rainfall_management')}</h4>
            <p className="text-sm text-orange-700 mt-1">
              {t('analytics.rainfall_management_description')}
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
              { id: 'correlation', label: 'analytics.correlation' },
              { id: 'events', label: 'analytics.weather_events' },
              { id: 'factors', label: 'analytics.weather_factors' },
              { id: 'seasonal', label: 'analytics.seasonal_analysis' }
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
              {t('analytics.time_period')}
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
              <option value="2024">{t('analytics.year_2024')}</option>
              <option value="2023">{t('analytics.year_2023')}</option>
              <option value="5years">{t('analytics.last_5_years')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {selectedView === 'correlation' && renderCorrelationAnalysis()}
      {selectedView === 'events' && renderWeatherEvents()}
      {selectedView === 'factors' && renderWeatherFactors()}
      {selectedView === 'seasonal' && renderSeasonalAnalysis()}
    </div>
  );
}