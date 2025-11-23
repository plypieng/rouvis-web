'use client';

import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { CalendarView } from '../../../components/CalendarView';
import { ScheduleSidebar } from '../../../components/ScheduleSidebar';

export default function CalendarPage() {
  const t = useTranslations();
  
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <DashboardHeader title={t('calendar.title')} />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DashboardCard title={t('calendar.monthly_view')}>
            <CalendarView />
          </DashboardCard>
        </div>
        
        <div>
          <DashboardCard title={t('calendar.schedule_activity')}>
            <ScheduleSidebar />
          </DashboardCard>
          
          <div className="mt-4">
            <button className="w-full py-3 px-4 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              {t('calendar.add_activity')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
