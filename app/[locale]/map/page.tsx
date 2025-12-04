import { getTranslations } from 'next-intl/server';
import MapTab from '../../../components/MapTab';

export default async function MapPage(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: 'dashboard' });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <MapTab locale={locale} />
        </div>
    );
}
