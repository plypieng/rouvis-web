'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';

interface UndoSnackbarProps {
    message: string;
    onUndo: () => void;
    show: boolean;
    duration?: number;
}

export default function UndoSnackbar({
    message,
    onUndo,
    show,
    duration = 10000
}: UndoSnackbarProps) {
    const t = useTranslations('projects');

    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                // Auto-dismiss handled by parent
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [show, duration]);

    if (!show) return null;

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-up">
            <div className="bg-gray-900 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
                <span className="text-sm">{message}</span>
                <button
                    onClick={onUndo}
                    className="text-blue-400 hover:text-blue-300 font-medium text-sm transition"
                >
                    {t('undo_button')}
                </button>
            </div>
        </div>
    );
}
