import { useTranslations } from 'next-intl';

export default function TermsOfServicePage() {
    const t = useTranslations('terms_of_service');
    const sections = ['sections.0', 'sections.1', 'sections.2', 'sections.3', 'sections.4'];

    return (
        <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            <div className="bg-white shadow sm:rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('title')}</h1>
                    <p className="text-sm text-gray-500 mb-8">{t('last_updated')}</p>

                    <div className="space-y-8">
                        {sections.map((sectionKey, index) => (
                            <section key={index}>
                                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                                    {t(`${sectionKey}.heading`)}
                                </h2>
                                <div className="prose text-gray-600">
                                    <p>{t(`${sectionKey}.content`)}</p>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
