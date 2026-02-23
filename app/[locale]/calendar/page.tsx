import { cookies } from 'next/headers';

import { CalendarView } from '../../../components/CalendarView';
import { resolveFarmerUiMode } from '../../../lib/farmerUiMode';
import { getServerAppBaseUrl } from '../../../lib/server-app-base-url';
import { getServerSessionFromToken } from '../../../lib/server-auth';
import type { FarmerUiMode } from '../../../types/farmer-ui-mode';
import type { CalendarFilterKey, StandaloneCalendarTask } from '../../../types/standalone-calendar';

export const dynamic = 'force-dynamic';

type BackendTask = {
  id: string;
  title: string;
  description?: string | null;
  dueAt: string;
  projectId?: string | null;
  projectName?: string | null;
  priority?: 'low' | 'medium' | 'high' | string;
  status?: string;
};

type DebugCalendarMode = 'seeded';

const FILTER_VALUES: CalendarFilterKey[] = ['all', 'overdue', 'today', 'next48h'];

function sanitizeDateParam(value?: string): string | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isFinite(parsed.getTime()) ? value : undefined;
}

function sanitizeFilterParam(value?: string): CalendarFilterKey {
  if (!value) return 'all';
  return FILTER_VALUES.includes(value as CalendarFilterKey)
    ? (value as CalendarFilterKey)
    : 'all';
}

function resolveDebugCalendarMode(value: unknown): DebugCalendarMode | null {
  if (typeof value !== 'string') return null;
  if (value === 'seeded') return value;
  return null;
}

function buildDebugCalendarTasks(): BackendTask[] {
  return [
    {
      id: 'task-debug-spray',
      title: 'Fungicide spraying',
      description: 'Sensitive spray pass for mildew control',
      dueAt: '2026-02-14T06:00:00.000Z',
      projectId: 'project-1',
      projectName: 'Debug Project',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'task-debug-scouting',
      title: 'Canopy scouting',
      description: 'Scout field health and photo notes',
      dueAt: '2026-02-15T06:00:00.000Z',
      projectId: 'project-1',
      projectName: 'Debug Project',
      priority: 'medium',
      status: 'pending',
    },
  ];
}

async function getTasks() {
  const appBaseUrl = await getServerAppBaseUrl();

  try {
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');

    const res = await fetch(`${appBaseUrl}/api/v1/tasks`, {
      cache: 'no-store',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!res.ok) {
      console.error('Failed to fetch tasks:', res.status);
      return [];
    }

    const data = await res.json();
    return (data.tasks || []) as BackendTask[];
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
}

export default async function CalendarPage(props: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ date?: string; filter?: string; project?: string; debugMockCalendar?: string }>;
}) {
  const params = await props.params;
  const searchParams = props.searchParams ? await props.searchParams : undefined;
  const { locale } = params;
  const debugMockCalendar = resolveDebugCalendarMode(searchParams?.debugMockCalendar);

  const session = await getServerSessionFromToken();
  const backendTasks = process.env.NODE_ENV !== 'production' && debugMockCalendar
    ? buildDebugCalendarTasks()
    : await getTasks();

  const user = (session?.user || {}) as {
    uiMode?: string | null;
    experienceLevel?: string | null;
  };

  const mode: FarmerUiMode = resolveFarmerUiMode(user.uiMode ?? null, user.experienceLevel ?? null);

  const tasks: StandaloneCalendarTask[] = backendTasks
    .filter((task) => task?.dueAt)
    .flatMap((task) => {
      const parsedDueAt = new Date(task.dueAt);
      if (!Number.isFinite(parsedDueAt.getTime())) {
        return [];
      }

      return [{
        id: task.id,
        title: task.title,
        description: task.description ?? undefined,
        dueAt: parsedDueAt.toISOString(),
        projectId: task.projectId ?? undefined,
        projectName: task.projectName ?? undefined,
        priority:
          task.priority === 'low' || task.priority === 'medium' || task.priority === 'high'
            ? task.priority
            : 'medium',
        status:
          task.status === 'completed' || task.status === 'scheduled' || task.status === 'cancelled'
            ? task.status
            : 'pending',
      }];
    });

  return (
    <section className="py-4 sm:py-6">
      <CalendarView
        mode={mode}
        locale={locale}
        tasks={tasks}
        initialDate={sanitizeDateParam(searchParams?.date)}
        initialFilter={sanitizeFilterParam(searchParams?.filter)}
        initialProjectId={searchParams?.project}
      />
    </section>
  );
}
