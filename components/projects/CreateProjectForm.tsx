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
    fieldIds?: string[];
    primaryFieldId?: string;
}

type NoticeState = {
    type: 'error' | 'success';
    message: string;
    actionLabel?: string;
    onAction?: () => void;
} | null;

type ApiErrorPayload = {
    code?: string;
    message?: string;
    error?: string;
    details?: unknown;
};

type ParsedCreateProjectError = {
    message: string;
    isUpgradeRequired: boolean;
};

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
        fieldIds: Array.isArray(initialData?.fieldIds)
            ? initialData!.fieldIds.filter((id) => typeof id === 'string' && id.length > 0)
            : (initialData?.fieldId ? [initialData.fieldId] : []),
        primaryFieldId: initialData?.primaryFieldId || initialData?.fieldId || '',
    });

    const parseCreateProjectError = async (response: Response): Promise<ParsedCreateProjectError> => {
        const fallbackMessage = t('error');
        const payload = await response.json().catch(() => ({})) as ApiErrorPayload;
        const details = payload.details && typeof payload.details === 'object' && !Array.isArray(payload.details)
            ? payload.details as Record<string, unknown>
            : null;
        const upgradeHint = typeof details?.upgradeHint === 'string' ? details.upgradeHint : null;
        const isUpgradeRequired = payload.code === 'ENTITLEMENT_REQUIRED';
        const message = isUpgradeRequired
            ? (upgradeHint || payload.message || fallbackMessage)
            : (payload.message || payload.error || fallbackMessage);

        return {
            message,
            isUpgradeRequired,
        };
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFieldScopeChange = (scope: { fieldIds: string[]; primaryFieldId: string | null }) => {
        setFormData(prev => ({
            ...prev,
            fieldIds: scope.fieldIds,
            primaryFieldId: scope.primaryFieldId || '',
        }));
    };

    const handleSuggest = async () => {
        if (!formData.crop) return;
        setSuggesting(true);
        try {
            const res = await fetch('/api/v1/agents/recommend', {
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

        if (!formData.fieldIds.length || !formData.primaryFieldId) {
            const message = '圃場を1つ以上選択し、Primary圃場を設定してください。';
            setNotice({ type: 'error', message });
            toastError(message);
            return;
        }

        setLoading(true);

        try {
            const res = await fetch('/api/v1/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    fieldId: formData.primaryFieldId,
                }),
            });

            if (!res.ok) {
                const parsedError = await parseCreateProjectError(res);
                const error = new Error(parsedError.message) as Error & { isUpgradeRequired?: boolean };
                error.isUpgradeRequired = parsedError.isUpgradeRequired;
                throw error;
            }

            const data = await res.json();
            const successMessage = t('success');
            setNotice({ type: 'success', message: successMessage });
            toastSuccess(successMessage);
            const createdProjectId = typeof data?.project?.id === 'string' ? data.project.id : '';
            void trackUXEvent('project_created', {
                projectId: createdProjectId || null,
                flow: 'manual_form',
                hasField: formData.fieldIds.length > 0,
            });
            router.push(`/${locale}/projects/${data.project.id}`);
            router.refresh();
        } catch (error) {
            console.error('Error creating project:', error);
            const isUpgradeRequired = typeof error === 'object'
                && error !== null
                && 'isUpgradeRequired' in error
                && Boolean((error as { isUpgradeRequired?: boolean }).isUpgradeRequired);
            const message = error instanceof Error && error.message
                ? error.message
                : t('error');
            const actionLabel = isUpgradeRequired ? 'プランを確認' : '再試行';
            setNotice({
                type: 'error',
                message,
                actionLabel,
                onAction: () => {
                    if (isUpgradeRequired) {
                        router.push(`/${locale}/account`);
                        return;
                    }
                    const form = document.getElementById('create-project-form') as HTMLFormElement | null;
                    form?.requestSubmit();
                },
            });
            toastError(message, {
                label: actionLabel,
                onClick: () => {
                    if (isUpgradeRequired) {
                        router.push(`/${locale}/account`);
                        return;
                    }
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
                    value={{
                        fieldIds: formData.fieldIds,
                        primaryFieldId: formData.primaryFieldId || null,
                    }}
                    onChange={handleFieldScopeChange}
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
