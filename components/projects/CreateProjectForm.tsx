'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

import FieldSelector from './FieldSelector';
import { toastError, toastSuccess } from '@/lib/feedback';
import { trackUXEvent } from '@/lib/analytics';

interface InitialProjectData {
    name?: string;
    crop?: string;
    variety?: string;
    startDate?: string;
    targetHarvestDate?: string;
    notes?: string;
    fieldId?: string;
}

type NoticeState = {
    type: 'error' | 'success';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
} | null;

export default function CreateProjectForm({ locale, initialData }: { locale: string; initialData?: InitialProjectData }) {
    const t = useTranslations('projects.create');
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [suggesting, setSuggesting] = useState(false);
    const [notice, setNotice] = useState<NoticeState>(null);
    const [formData, setFormData] = useState({
        name: initialData?.name || (initialData?.crop ? `${initialData.crop} ${new Date().getFullYear()}` : ''),
        crop: initialData?.crop || '',
        variety: initialData?.variety || '',
        startDate: initialData?.startDate || new Date().toISOString().split('T')[0],
        targetHarvestDate: initialData?.targetHarvestDate || '',
        notes: initialData?.notes || '',
        fieldId: initialData?.fieldId || '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFieldChange = (fieldId: string) => {
        setFormData(prev => ({ ...prev, fieldId }));
    };

    const handleSuggest = async () => {
        if (!formData.crop) return;
        setSuggesting(true);
        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/agents/recommend`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ crop: formData.crop }),
            });
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    variety: data.variety || prev.variety,
                    startDate: data.startDate || prev.startDate,
                    targetHarvestDate: data.targetHarvestDate || prev.targetHarvestDate,
                    notes: data.notes || prev.notes,
                }));
            }
        } catch (error) {
            console.error('Suggestion error:', error);
        } finally {
            setSuggesting(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setNotice(null);

        if (!formData.fieldId) {
            const message = '圃場を選択してください。';
            setNotice({ type: 'error', message });
            toastError(message);
            return;
        }

        setLoading(true);

        try {
            const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000';
            const res = await fetch(`${baseUrl}/api/v1/projects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                throw new Error('Failed to create project');
            }

            const data = await res.json();
            const successMessage = t('success');
            setNotice({ type: 'success', message: successMessage });
            toastSuccess(successMessage);
            void trackUXEvent('project_created', {
                flow: 'manual_form',
                hasField: Boolean(formData.fieldId),
            });
            router.push(`/${locale}/projects/${data.project.id}`);
            router.refresh();
        } catch (error) {
            console.error('Error creating project:', error);
            const message = t('error');
            setNotice({
                type: 'error',
                message,
                actionLabel: '再試行',
                onAction: () => {
                    const form = document.getElementById('create-project-form') as HTMLFormElement | null;
                    form?.requestSubmit();
                },
            });
            toastError(message, {
                label: '再試行',
                onClick: () => {
                    const form = document.getElementById('create-project-form') as HTMLFormElement | null;
                    form?.requestSubmit();
                },
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <form id="create-project-form" onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            {notice && (
                <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                        notice.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <span>{notice.message}</span>
                        {notice.actionLabel && notice.onAction && (
                            <button
                                type="button"
                                onClick={notice.onAction}
                                className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                                disabled={loading}
                            >
                                {notice.actionLabel}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Field Selector Section */}
            <div>
                <FieldSelector
                    selectedFieldId={formData.fieldId}
                    onChange={handleFieldChange}
                />
            </div>

            <hr className="border-gray-100" />

            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">{t('name_label')}</label>
                <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder={t('name_placeholder')}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="crop" className="block text-sm font-medium text-gray-700 mb-1">{t('crop_label')}</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="crop"
                            name="crop"
                            required
                            value={formData.crop}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                            placeholder={t('crop_placeholder')}
                        />
                        <button
                            type="button"
                            onClick={handleSuggest}
                            disabled={!formData.crop || suggesting}
                            className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition disabled:opacity-50 whitespace-nowrap"
                        >
                            {suggesting ? '...' : 'AI'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{t('ai_suggest_button')}</p>
                </div>
                <div>
                    <label htmlFor="variety" className="block text-sm font-medium text-gray-700 mb-1">{t('variety_label')}</label>
                    <input
                        type="text"
                        id="variety"
                        name="variety"
                        value={formData.variety}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                        placeholder={t('variety_placeholder')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">{t('start_date_label')}</label>
                    <input
                        type="date"
                        id="startDate"
                        name="startDate"
                        required
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    />
                </div>
                <div>
                    <label htmlFor="targetHarvestDate" className="block text-sm font-medium text-gray-700 mb-1">{t('target_harvest_date_label')}</label>
                    <input
                        type="date"
                        id="targetHarvestDate"
                        name="targetHarvestDate"
                        value={formData.targetHarvestDate}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    />
                </div>
            </div>

            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">{t('notes_label')}</label>
                <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                    placeholder={t('notes_placeholder')}
                />
            </div>

            <div className="flex justify-end pt-4">
                <button
                    type="button"
                    onClick={() => router.back()}
                    className="mr-4 px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {loading ? t('creating') : t('submit_button')}
                </button>
            </div>
        </form>
    );
}
