import { notFound } from 'next/navigation';
import ProjectDetailClient from '@/components/projects/ProjectDetailClient';

async function getProject(id: string) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/projects/${id}`, {
        cache: 'no-store',
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
