import { getTranslations } from 'next-intl/server';
import { DashboardCard } from '../../../components/DashboardCard';
import { CalendarView } from '../../../components/CalendarView';
import { ScheduleSidebar } from '../../../components/ScheduleSidebar';

async function getTasks() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
  try {
    const res = await fetch(`${baseUrl}/api/v1/tasks`, { cache: 'no-store' });
    if (!res.ok) {
      console.error('Failed to fetch tasks:', res.status);
      return [];
    }
    const data = await res.json();
    return data.tasks || [];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export default async function CalendarPage(props: { params: Promise<{ locale: string }> }) {
  const params = await props.params;
  const { locale } = params;
  const t = await getTranslations('calendar');
  const tasks = await getTasks();

  // Map API tasks to CalendarView expected format if needed
  // API returns { id, title, dueDate, status, ... }
  // CalendarView expects { id, title, dueAt: Date, ... }
  const formattedTasks = tasks.map((task: any) => ({
    ...task,
    dueAt: new Date(task.dueDate),
  }));

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('calendar.title')}</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <DashboardCard title={t('title')}>
            <CalendarView tasks={formattedTasks} locale={locale} />
          </DashboardCard>
        </div>

        <div>
          <DashboardCard title={t('schedule_activity')}>
            <ScheduleSidebar />
          </DashboardCard>

          <div className="mt-4">
            <button className="w-full py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined mr-2">add</span>
              {t('add_activity')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
