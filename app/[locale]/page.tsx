import { getTranslations } from 'next-intl/server';

import { getServerSessionFromToken } from '../../lib/server-auth';
import DashboardInferenceFallback from '@/components/DashboardInferenceFallback';
import DashboardProjectList from '@/components/DashboardProjectList';
import LandingPage from '@/components/LandingPage';

import { Suspense } from 'react';

function parseDebugDelayMs(raw: string | undefined): number | undefined {
  if (process.env.NODE_ENV === 'production' || !raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined;
  return Math.min(parsed, 10000);
}

export default async function DashboardPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    debugDataError?: string;
    debugDashboardDelayMs?: string;
    activation?: string;
    projectId?: string;
    taskId?: string;
  }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const debugDataError = process.env.NODE_ENV !== 'production' && searchParams?.debugDataError === '1';
  const debugDashboardDelayMs = parseDebugDelayMs(searchParams?.debugDashboardDelayMs);
  const session = await getServerSessionFromToken();

  const userId = session?.user?.id;
  if (!userId) {
    return (
      <Suspense>
        <LandingPage locale={locale} />
      </Suspense>
    );
  }

  const loadingCopy = await getTranslations({ locale, namespace: 'dashboard.loading' });

  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense
        fallback={(
          <div className="container mx-auto max-w-7xl space-y-8 px-4 py-8">
            <DashboardInferenceFallback
              inferenceTitle={loadingCopy('inference_title')}
              inferenceBody={loadingCopy('inference_body')}
            />
          </div>
        )}
      >
        <DashboardProjectList
          locale={locale}
          forceDataError={debugDataError}
          debugDelayMs={debugDashboardDelayMs}
          sessionUiMode={session?.user?.uiMode}
          activationContext={{
            enabled: searchParams?.activation === '1',
            projectId: searchParams?.projectId,
            taskId: searchParams?.taskId,
          }}
        />
      </Suspense>
    </main>
  );
}
