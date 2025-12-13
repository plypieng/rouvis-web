import { getTranslations } from 'next-intl/server';
import { DashboardCard } from '../../../components/DashboardCard';
import { CalendarView } from '../../../components/CalendarView';
import { cookies } from 'next/headers';
import { getServerSessionFromToken } from '../../../lib/server-auth';

export const dynamic = 'force-dynamic';

type BackendTask = {
  id: string;
  title: string;
  description?: string | null;
  dueDate: string;
  priority?: 'low' | 'medium' | 'high' | string;
  status?: string;
};

type BackendProject = {
  id: string;
  name: string;
  tasks?: BackendTask[];
};

async function getProjects(userId?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');

    const res = await fetch(`${baseUrl}/api/v1/projects`, {
      cache: 'no-store',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        ...(userId ? { 'x-user-id': userId } : {}),
      },
    });
    if (!res.ok) {
      console.error('Failed to fetch projects:', res.status);
      return [];
    }
    const data = await res.json();
    return (data.projects || []) as BackendProject[];
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}

export default async function CalendarPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations({ locale, namespace: 'calendar' });
  const session = await getServerSessionFromToken();
  const projects = await getProjects(session?.user?.id);

  const tasks = projects.flatMap((project) => {
    const projectTasks = Array.isArray(project.tasks) ? project.tasks : [];
    return projectTasks
      .filter((task) => task?.dueDate)
      .filter((task) => task.status !== 'completed')
      .map((task) => ({
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        dueAt: new Date(task.dueDate),
        projectId: project.id,
        projectName: project.name,
        priority: (task.priority === 'low' || task.priority === 'medium' || task.priority === 'high')
          ? task.priority
          : 'medium',
        status: (task.status === 'scheduled' || task.status === 'cancelled') ? task.status : 'pending',
      }));
  });

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
      </div>

      <DashboardCard title={t('title')}>
        <CalendarView tasks={tasks} locale={locale} />
      </DashboardCard>
    </div>
  );
}
