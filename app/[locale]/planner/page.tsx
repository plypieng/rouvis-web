'use client';

import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { MapPlanner } from '../../../components/MapPlanner';
import { CropSelectionPanel } from '../../../components/CropSelectionPanel';
import { OptimizationSettings } from '../../../components/OptimizationSettings';

export default function PlannerPage() {
  const t = useTranslations();
  
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <DashboardHeader title={t('planner.title')} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DashboardCard title={t('planner.interactive_map')}>
            <MapPlanner />
          </DashboardCard>
        </div>
        
        <div className="space-y-6">
          <DashboardCard title={t('planner.select_crops')}>
            <CropSelectionPanel />
          </DashboardCard>
          
          <DashboardCard title={t('planner.optimization_settings')}>
            <OptimizationSettings />
          </DashboardCard>
          
          <div className="flex flex-col space-y-3">
            <button className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              {t('planner.generate_plan')}
            </button>
            
            <button className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              {t('planner.save_plan')}
            </button>
            
            <button className="w-full py-3 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
              {t('planner.reset')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
