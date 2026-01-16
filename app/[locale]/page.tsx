import { getServerSessionFromToken } from '../../lib/server-auth';
import DashboardProjectList from '@/components/DashboardProjectList';
import LandingPage from '@/components/LandingPage';

import { Suspense } from 'react';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const { locale } = params;
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
      <DashboardProjectList locale={locale} userId={userId} />
    </main>
  );
}

