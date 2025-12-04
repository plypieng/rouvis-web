'use client';

import { useTranslations } from 'next-intl';

interface ArchiveConfirmationProps {
    projectName: string;
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export default function ArchiveConfirmation({
    projectName,
    isOpen,
    onConfirm,
    onCancel,
    isLoading = false
}: ArchiveConfirmationProps) {
    const t = useTranslations('projects');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-blue-600 text-2xl">archive</span>
                    </div>

                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                        {t('confirm_archive_title')}
                    </h2>

                    <p className="text-gray-700 mb-2">
                        {t('confirm_archive_message', { name: projectName })}
                    </p>

                    <p className="text-sm text-gray-500 mb-6">
                        {t('confirm_archive_description')}
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400"
                    >
                        {isLoading ? t('archiving_progress') : t('archive')}
                    </button>
                </div>
            </div>
        </div>
    );
}
