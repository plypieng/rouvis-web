'use client';

import { useTranslations } from 'next-intl';

type ProjectType = 'new' | 'existing';

export default function ProjectTypeSelector({
    onSelect
}: {
    onSelect: (type: ProjectType) => void
}) {
    const t = useTranslations('projects.typeSelection');

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">{t('title')}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* New Plant Option */}
                <button
                    onClick={() => onSelect('new')}
                    className="flex flex-col items-center p-8 bg-white border-2 border-green-100 rounded-2xl hover:border-green-500 hover:shadow-xl transition-all group"
                >
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-green-200 group-hover:scale-110 transition-all">
                        <span className="material-symbols-outlined text-4xl text-green-700">eco</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('newPlant')}</h3>
                    <p className="text-sm text-gray-600 text-center">{t('newPlantDesc')}</p>
                </button>

                {/* Already Planted Option */}
                <button
                    onClick={() => onSelect('existing')}
                    className="flex flex-col items-center p-8 bg-white border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all group"
                >
                    <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 group-hover:scale-110 transition-all">
                        <span className="material-symbols-outlined text-4xl text-blue-700">park</span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{t('alreadyPlanted')}</h3>
                    <p className="text-sm text-gray-600 text-center">{t('alreadyPlantedDesc')}</p>
                </button>
            </div>
        </div>
    );
}
