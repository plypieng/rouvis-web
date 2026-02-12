'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { toastError, toastSuccess } from '@/lib/feedback';

interface TaskCreateModalProps {
    projectId: string;
    isOpen: boolean;
    onClose: () => void;
    initialDate?: Date;
    initialData?: {
        title?: string;
        description?: string;
        priority?: string;
    };
}

export default function TaskCreateModal({ projectId, isOpen, onClose, initialDate, initialData }: TaskCreateModalProps) {
    const t = useTranslations('projects.task_create');
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(prev => ({
                ...prev,
                title: initialData?.title || '',
                description: initialData?.description || '',
                priority: initialData?.priority || 'medium',
                dueDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : prev.dueDate,
            }));
        }
    }, [isOpen, initialDate, initialData]);

    const handleSave = async () => {
        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.title.trim()) {
            newErrors.title = 'Title is required'; // Fallback if translation missing
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSaving(true);
        try {
            const dueAt = formData.dueDate
                ? new Date(`${formData.dueDate}T12:00:00`).toISOString()
                : undefined;

            const res = await fetch('/api/v1/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId,
                    title: formData.title.trim(),
                    description: formData.description || null,
                    dueAt,
                    priority: formData.priority,
                }),
            });

            if (!res.ok) {
                throw new Error(t('error'));
            }

            // Refresh and close
            router.refresh();
            onClose();
            toastSuccess(t('success'));
            // Reset form
            setFormData({
                title: '',
                description: '',
                dueDate: initialDate ? format(initialDate, 'yyyy-MM-dd') : '',
                priority: 'medium',
            });
        } catch (error) {
            console.error('Create error:', error);
            toastError(t('error'), {
                label: '再試行',
                onClick: () => {
                    void handleSave();
                },
            });
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('title')}</h2>

                <div className="space-y-4">
                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('task_title')} *
                        </label>
                        <input
                            type="text"
                            value={formData.title}
                            onChange={(e) => {
                                setFormData({ ...formData, title: e.target.value });
                                setErrors({ ...errors, title: '' });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${errors.title ? 'border-red-500' : 'border-gray-300'
                                }`}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('description')}
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                        />
                    </div>

                    <div className="flex gap-4">
                        {/* Due Date */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('due_date')}
                            </label>
                            <input
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            />
                        </div>

                        {/* Priority */}
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {t('priority')}
                            </label>
                            <select
                                value={formData.priority}
                                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none bg-white"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-6">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400"
                    >
                        {saving ? t('creating') : t('create')}
                    </button>
                </div>
            </div>
        </div>
    );
}
