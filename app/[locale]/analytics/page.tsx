'use client';

import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { AnalyticsFilters } from '../../../components/AnalyticsFilters';
import { AnalyticsCharts } from '../../../components/AnalyticsCharts';
import { CostRevenueAnalysis } from '../../../components/CostRevenueAnalysis';
import { YieldComparisonTable } from '../../../components/YieldComparisonTable';

export default function AnalyticsPage() {
  const t = useTranslations();
  
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <DashboardHeader title={t('analytics.title')} />
      <AnalyticsFilters />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title={t('analytics.yield_comparison')}>
          <AnalyticsCharts chartType="yield" />
        </DashboardCard>
        
        <DashboardCard title={t('analytics.cost_revenue')}>
          <CostRevenueAnalysis />
        </DashboardCard>
      </div>
      
      <DashboardCard title={t('analytics.detailed_metrics')}>
        <YieldComparisonTable />
        
        <div className="mt-4 flex justify-end">
          <button className="py-2 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('analytics.export_data')}
          </button>
        </div>
      </DashboardCard>
    </div>
  );
}
