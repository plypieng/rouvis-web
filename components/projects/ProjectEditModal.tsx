'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';

interface ProjectEditModalProps {
    project: {
        id: string;
        name: string;
        variety?: string;
        targetHarvestDate?: string;
        notes?: string;
    };
    isOpen: boolean;
    onClose: () => void;
}

export default function ProjectEditModal({ project, isOpen, onClose }: ProjectEditModalProps) {
    const t = useTranslations('projects');
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: project.name,
        variety: project.variety || '',
        targetHarvestDate: project.targetHarvestDate || '',
        notes: project.notes || '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleSave = async () => {
        // Validation
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) {
            newErrors.name = t('validation.name_required');
        }
        if (formData.name.length > 100) {
            newErrors.name = t('validation.name_too_long');
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setSaving(true);
        try {
            const res = await fetch(`/api/v1/projects/${project.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    variety: formData.variety || null,
                    targetHarvestDate: formData.targetHarvestDate || null,
                    notes: formData.notes || null,
                }),
            });

            if (!res.ok) {
                throw new Error(t('update_failed'));
            }

            // Show success message
            alert(t('updated_success'));

            // Refresh and close
            router.refresh();
            onClose();
        } catch (error) {
            console.error('Update error:', error);
            alert(t('update_failed'));
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
                <h2 className="text-xl font-bold text-gray-900 mb-4">{t('edit_project')}</h2>

                <div className="space-y-4">
                    {/* Project Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('project_name')} *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => {
                                setFormData({ ...formData, name: e.target.value });
                                setErrors({ ...errors, name: '' });
                            }}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none ${errors.name ? 'border-red-500' : 'border-gray-300'
                                }`}
                        />
                        {errors.name && (
                            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                    </div>

                    {/* Variety */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('variety')}
                        </label>
                        <input
                            type="text"
                            value={formData.variety}
                            onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                            placeholder={t('placeholder_variety')}
                        />
                    </div>

                    {/* Target Harvest Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('target_harvest_date')}
                        </label>
                        <input
                            type="date"
                            value={formData.targetHarvestDate}
                            onChange={(e) => setFormData({ ...formData, targetHarvestDate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {t('notes')}
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none"
                            placeholder={t('placeholder_notes')}
                        />
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
                        {saving ? t('saving') : t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
}
