import { SchedulerRunLifecyclePanel } from '@/components/SchedulerRunLifecyclePanel';
import { getTranslations } from 'next-intl/server';

export default async function SchedulerRunsPage() {
  const t = await getTranslations('pages.scheduler_runs');

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5">
        <h1 className="text-xl font-semibold text-gray-900">{t('title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          {t('description')}
        </p>
      </div>
      <SchedulerRunLifecyclePanel />
    </div>
  );
}
