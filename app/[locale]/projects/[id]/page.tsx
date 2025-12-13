import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/components/projects/ProjectDetailClient';
import { cookies } from 'next/headers';

async function getProject(id: string) {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
    const cookieStore = await cookies();
    const cookieHeader = cookieStore.getAll().map(c => `${c.name}=${c.value}`).join('; ');
    const res = await fetch(`${baseUrl}/api/v1/projects/${id}`, {
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

    return <ProjectDetailClient project={data.project} locale={locale} />;
}
