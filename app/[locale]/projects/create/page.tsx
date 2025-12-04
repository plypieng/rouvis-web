import { getTranslations } from 'next-intl/server';
import ProjectWizard from '../../../../components/projects/ProjectWizard';

export default async function CreateProjectPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations('projects.create');

    return (
        <div className="container mx-auto px-4 py-8 max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>
            <ProjectWizard locale={locale} />
        </div>
    );
}
