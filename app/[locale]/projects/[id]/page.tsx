import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/components/projects/ProjectDetailClient';
import { cookies } from 'next/headers';
import { getWebFeatureFlags } from '@/lib/feature-flags';
import { getServerAppBaseUrl } from '@/lib/server-app-base-url';

type DebugMockMode = 'seeded' | 'empty';

function resolveDebugMockMode(value: unknown): DebugMockMode | null {
    if (typeof value !== 'string') return null;
    if (value === 'seeded' || value === 'empty') return value;
    return null;
}

function buildDebugMockProject(id: string, mode: DebugMockMode) {
    const base = {
        id,
        name: 'Debug Project',
        crop: 'Tomato',
        variety: 'Momotaro',
        startDate: '2026-02-10',
        targetHarvestDate: '2026-06-10',
        status: 'active',
        notes: 'Debug mock project for local E2E route tests',
        primaryFieldId: 'field-1',
        schedulingPreferences: {
            maxTasksPerDay: 4,
        },
    };

    if (mode === 'empty') {
        return {
            ...base,
            tasks: [],
        };
    }

    return {
        ...base,
        tasks: [
            {
                id: 'task-debug-completed',
                title: 'Completed baseline task',
                dueDate: '2026-02-15T06:00:00.000Z',
                status: 'completed',
            },
            {
                id: 'task-debug-open',
                title: 'Open baseline task',
                dueDate: '2026-02-16T06:00:00.000Z',
                status: 'pending',
            },
        ],
    };
}

async function getProject(id: string) {
    const appBaseUrl = await getServerAppBaseUrl();
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${appBaseUrl}/api/v1/projects/${id}`, {
        cache: 'no-store',
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
    });

    if (!res.ok) {
        return null;
    }

    return res.json();
}

export default async function ProjectDetailPage(props: {
    params: Promise<{ locale: string; id: string }>;
    searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
    const params = await props.params;
    const searchParams = props.searchParams ? await props.searchParams : {};
    const { locale, id } = params;
    const debugMockMode = resolveDebugMockMode(searchParams?.debugMockProject);
    const data = await getProject(id);

  if (!data || !data.project) {
    if (process.env.NODE_ENV !== 'production' && debugMockMode) {
      const featureFlags = getWebFeatureFlags();
      return (
        <ProjectDetailClient
          project={buildDebugMockProject(id, debugMockMode)}
          locale={locale}
          chatCockpitStandoutEnabled={featureFlags.chatCockpitStandout}
        />
      );
    }
    notFound();
  }

  const featureFlags = getWebFeatureFlags();

  return (
    <ProjectDetailClient
      project={data.project}
      locale={locale}
      chatCockpitStandoutEnabled={featureFlags.chatCockpitStandout}
    />
  );
}
