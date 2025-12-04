import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth-config';
import DashboardProjectList from '@/components/DashboardProjectList';
import LandingPage from '@/components/LandingPage';

export default async function DashboardPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const { locale } = params;
  const session = await getServerSession(authOptions);

  if (!session) {
    return <LandingPage locale={locale} />;
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <DashboardProjectList locale={locale} />
    </main>
  );
}

