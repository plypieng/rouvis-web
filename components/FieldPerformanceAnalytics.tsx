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
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { DashboardCard } from './DashboardCard';

// Mock data for field performance analytics
const fieldPerformanceData = [
  { field: 'North Rice Field', area: 2.5, yield: 5.2, efficiency: 92, soilHealth: 85, irrigation: 88 },
  { field: 'South Rice Field', area: 1.8, yield: 4.8, efficiency: 85, soilHealth: 78, irrigation: 82 },
  { field: 'East Vegetable Garden', area: 0.8, yield: 75.3, efficiency: 95, soilHealth: 88, irrigation: 95 },
  { field: 'West Vegetable Plot', area: 0.6, yield: 68.7, efficiency: 88, soilHealth: 82, irrigation: 85 },
  { field: 'Fruit Orchard', area: 1.2, yield: 32.1, efficiency: 78, soilHealth: 75, irrigation: 72 },
  { field: 'Greenhouse A', area: 0.3, yield: 45.6, efficiency: 98, soilHealth: 92, irrigation: 100 },
];

const fieldComparisonData = [
  { field: 'North Rice Field', actual: 5.2, target: 5.5, previous: 4.9 },
  { field: 'South Rice Field', actual: 4.8, target: 5.0, previous: 4.6 },
  { field: 'East Vegetable Garden', actual: 75.3, target: 80.0, previous: 72.1 },
  { field: 'West Vegetable Plot', actual: 68.7, target: 70.0, previous: 65.8 },
  { field: 'Fruit Orchard', actual: 32.1, target: 35.0, previous: 30.2 },
  { field: 'Greenhouse A', actual: 45.6, target: 50.0, previous: 42.3 },
];

const soilHealthData = [
  { field: 'North Rice Field', ph: 6.8, organic: 3.2, nitrogen: 45, phosphorus: 32, potassium: 180 },
  { field: 'South Rice Field', ph: 6.5, organic: 2.8, nitrogen: 38, phosphorus: 28, potassium: 165 },
  { field: 'East Vegetable Garden', ph: 6.9, organic: 4.1, nitrogen: 52, phosphorus: 38, potassium: 195 },
  { field: 'West Vegetable Plot', ph: 6.7, organic: 3.8, nitrogen: 48, phosphorus: 35, potassium: 185 },
  { field: 'Fruit Orchard', ph: 6.4, organic: 2.5, nitrogen: 35, phosphorus: 25, potassium: 155 },
  { field: 'Greenhouse A', ph: 6.8, organic: 4.5, nitrogen: 58, phosphorus: 42, potassium: 210 },
];

const irrigationEfficiencyData = [
  { field: 'North Rice Field', efficiency: 88, waterUsage: 1200, cropWaterNeed: 950 },
  { field: 'South Rice Field', efficiency: 82, waterUsage: 980, cropWaterNeed: 850 },
  { field: 'East Vegetable Garden', efficiency: 95, waterUsage: 450, cropWaterNeed: 380 },
  { field: 'West Vegetable Plot', efficiency: 85, waterUsage: 380, cropWaterNeed: 320 },
  { field: 'Fruit Orchard', efficiency: 72, waterUsage: 680, cropWaterNeed: 520 },
  { field: 'Greenhouse A', efficiency: 100, waterUsage: 180, cropWaterNeed: 150 },
];

const cropDistributionData = [
  { name: 'Rice Fields', value: 4.3, color: '#4ade80' },
  { name: 'Vegetable Gardens', value: 1.4, color: '#fb923c' },
  { name: 'Fruit Orchard', value: 1.2, color: '#f87171' },
  { name: 'Greenhouse', value: 0.3, color: '#60a5fa' },
];

export function FieldPerformanceAnalytics() {
  const t = useTranslations();
  const [selectedView, setSelectedView] = useState<'overview' | 'comparison' | 'soil' | 'irrigation'>('overview');
  const [selectedField, setSelectedField] = useState('all');

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Field Performance Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.total_fields')}</p>
              <p className="text-2xl font-bold text-gray-900">6</p>
              <p className="text-sm text-green-600">{t('analytics.active')}</p>
            </div>
            <div className="text-3xl">🏗️</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.total_area')}</p>
              <p className="text-2xl font-bold text-gray-900">7.2</p>
              <p className="text-sm text-gray-500">hectares</p>
            </div>
            <div className="text-3xl">📐</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.avg_efficiency')}</p>
              <p className="text-2xl font-bold text-gray-900">89%</p>
              <p className="text-sm text-green-600">+5% {t('analytics.from_last_year')}</p>
            </div>
            <div className="text-3xl">⚡</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('analytics.top_performer')}</p>
              <p className="text-lg font-bold text-gray-900">{t('analytics.greenhouse_a')}</p>
              <p className="text-sm text-green-600">98% {t('analytics.efficiency')}</p>
            </div>
            <div className="text-3xl">🏆</div>
          </div>
        </div>
      </div>

      {/* Field Performance Chart */}
      <DashboardCard title={t('analytics.field_performance_overview')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fieldPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="yield" fill="#4ade80" name={t('analytics.yield_tons_ha')} />
              <Bar dataKey="efficiency" fill="#60a5fa" name={t('analytics.efficiency_percent')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      {/* Crop Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.crop_distribution')}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {cropDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} ha`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title={t('analytics.field_health_status')}>
          <div className="space-y-4">
            {fieldPerformanceData.map((field, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">{field.field}</p>
                  <div className="flex items-center space-x-4 mt-1">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{t('analytics.soil')}: {field.soilHealth}%</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-600">{t('analytics.irrigation')}: {field.irrigation}%</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    field.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                    field.efficiency >= 80 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {field.efficiency}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  );

  const renderComparison = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.field_performance_comparison')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fieldComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="previous" fill="#e5e7eb" name={t('analytics.previous_year')} />
              <Bar dataKey="actual" fill="#4ade80" name={t('analytics.current_year')} />
              <Bar dataKey="target" fill="#60a5fa" name={t('analytics.target')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.performance_metrics_table')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.field')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.actual')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.target')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.achievement')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.improvement')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fieldComparisonData.map((field, index) => {
                const achievement = (field.actual / field.target) * 100;
                const improvement = ((field.actual - field.previous) / field.previous) * 100;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.actual}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.target}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        achievement >= 95 ? 'bg-green-100 text-green-800' :
                        achievement >= 85 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {achievement.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );

  const renderSoilAnalysis = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.soil_health_analysis')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.field')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  pH
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.organic_matter')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.nitrogen')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.phosphorus')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.potassium')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {soilHealthData.map((field, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {field.field}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.ph}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.organic}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.nitrogen} ppm
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.phosphorus} ppm
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {field.potassium} ppm
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.soil_health_recommendations')}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.fruit_orchard_soil')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.fruit_orchard_soil_recommendation')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.vegetable_garden_ph')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.vegetable_garden_ph_recommendation')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h4 className="font-medium text-orange-800">{t('analytics.organic_matter_boost')}</h4>
            <p className="text-sm text-orange-700 mt-1">
              {t('analytics.organic_matter_boost_recommendation')}
            </p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );

  const renderIrrigationAnalysis = () => (
    <div className="space-y-6">
      <DashboardCard title={t('analytics.irrigation_efficiency_analysis')}>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={irrigationEfficiencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="field" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="efficiency" fill="#60a5fa" name={t('analytics.efficiency_percent')} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.irrigation_performance_details')}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.field')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.efficiency')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.water_usage')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.crop_water_need')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('analytics.waste')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {irrigationEfficiencyData.map((field, index) => {
                const waste = field.waterUsage - field.cropWaterNeed;
                const wastePercent = (waste / field.waterUsage) * 100;
                return (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {field.field}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        field.efficiency >= 90 ? 'bg-green-100 text-green-800' :
                        field.efficiency >= 80 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {field.efficiency}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.waterUsage} L/ha
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {field.cropWaterNeed} L/ha
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {waste} L/ha ({wastePercent.toFixed(1)}%)
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title={t('analytics.irrigation_optimization_suggestions')}>
        <div className="space-y-4">
          <div className="p-4 border-l-4 border-blue-500 bg-blue-50">
            <h4 className="font-medium text-blue-800">{t('analytics.drip_irrigation_upgrade')}</h4>
            <p className="text-sm text-blue-700 mt-1">
              {t('analytics.drip_irrigation_recommendation')}
            </p>
            <p className="text-sm font-medium text-blue-800 mt-2">
              {t('analytics.potential_savings')}: 25% {t('analytics.water_savings')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-green-500 bg-green-50">
            <h4 className="font-medium text-green-800">{t('analytics.smart_irrigation_system')}</h4>
            <p className="text-sm text-green-700 mt-1">
              {t('analytics.smart_irrigation_recommendation')}
            </p>
            <p className="text-sm font-medium text-green-800 mt-2">
              {t('analytics.potential_savings')}: 30% {t('analytics.water_savings')}
            </p>
          </div>

          <div className="p-4 border-l-4 border-orange-500 bg-orange-50">
            <h4 className="font-medium text-orange-800">{t('analytics.soil_moisture_monitoring')}</h4>
            <p className="text-sm text-orange-700 mt-1">
              {t('analytics.soil_moisture_recommendation')}
            </p>
            <p className="text-sm font-medium text-orange-800 mt-2">
              {t('analytics.potential_savings')}: 20% {t('analytics.water_savings')}
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
              { id: 'comparison', label: 'analytics.comparison' },
              { id: 'soil', label: 'analytics.soil_analysis' },
              { id: 'irrigation', label: 'analytics.irrigation_analysis' }
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
              {t('analytics.field_filter')}
            </label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">{t('analytics.all_fields')}</option>
              {fieldPerformanceData.map((field, index) => (
                <option key={index} value={field.field}>{field.field}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('analytics.time_period')}
            </label>
            <select className="w-full p-2 border border-gray-300 rounded-lg text-sm">
              <option value="current">{t('analytics.current_season')}</option>
              <option value="2024">{t('analytics.year_2024')}</option>
              <option value="2023">{t('analytics.year_2023')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {selectedView === 'overview' && renderOverview()}
      {selectedView === 'comparison' && renderComparison()}
      {selectedView === 'soil' && renderSoilAnalysis()}
      {selectedView === 'irrigation' && renderIrrigationAnalysis()}
    </div>
  );
}