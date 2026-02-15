import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/components/projects/ProjectDetailClient';
import { cookies } from 'next/headers';
import { getWebFeatureFlags } from '@/lib/feature-flags';
import { getServerAppBaseUrl } from '@/lib/server-app-base-url';

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

export default async function ProjectDetailPage(props: { params: Promise<{ locale: string; id: string }> }) {
    const params = await props.params;
    const { locale, id } = params;
    const data = await getProject(id);

  if (!data || !data.project) {
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
