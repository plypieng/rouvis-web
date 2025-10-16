'use client';

import { useTranslations } from 'next-intl';
import { DashboardHeader } from '../../../components/DashboardHeader';
import { DashboardCard } from '../../../components/DashboardCard';
import { ChatSidebar } from '../../../components/ChatSidebar';
import { RouvisChatKit } from '../../../components/RouvisChatKit';

export default function ChatPage() {
  const t = useTranslations();

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <DashboardHeader title={t('chat.title')} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DashboardCard title={t('chat.ai_assistant')}>
            <div className="h-[600px]">
              <RouvisChatKit />
            </div>
          </DashboardCard>
        </div>

        <div>
          <DashboardCard title={t('chat.suggested_topics')}>
            <ChatSidebar />
          </DashboardCard>

          <div className="mt-4">
            <button className="w-full py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {t('chat.clear')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}