import { getServerSessionFromToken } from '../../lib/server-auth';
import DashboardProjectList from '@/components/DashboardProjectList';
import LandingPage from '@/components/LandingPage';

import { Suspense } from 'react';

export default async function DashboardPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ debugDataError?: string }>;
}) {
  const params = await props.params;
  const { locale } = params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const debugDataError = process.env.NODE_ENV !== 'production' && searchParams?.debugDataError === '1';
  const session = await getServerSessionFromToken();

  const userId = session?.user?.id;
  if (!userId) {
    return (
      <Suspense>
        <LandingPage locale={locale} />
      </Suspense>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardProjectList locale={locale} userId={userId} forceDataError={debugDataError} />
    </main>
  );
}
