'use client';

import { useState, useEffect } from 'react';
import MapDrawer from './MapDrawer';
import { toastError, toastSuccess } from '@/lib/feedback';

interface Field {
    id: string;
    name: string;
    crop?: string;
    area?: number;
    color?: string;
}

interface FieldSelectorProps {
    selectedFieldId: string;
    onChange: (fieldId: string) => void;
}

type LatLng = { lat: number; lng: number };
type NewFieldData = {
    name: string;
    polygon: LatLng[];
    location: LatLng;
    color: string;
    area: number;
};

export default function FieldSelector({ selectedFieldId, onChange }: FieldSelectorProps) {
    const [fields, setFields] = useState<Field[]>([]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [notice, setNotice] = useState<{
        type: 'error' | 'success';
        message: string;
        retry?: () => void;
    } | null>(null);

    // Fetch Fields
    const fetchFields = async () => {
        try {
            // Use local API proxy to avoid cross-origin auth issues
            const res = await fetch('/api/v1/fields');
            if (res.ok) {
                const data = await res.json();
                setFields(data.fields || []);
                return;
            }
            const payload = await res.json().catch(() => ({}));
            throw new Error(payload?.error || '圃場一覧の取得に失敗しました');
        } catch (error) {
            console.error('Failed to fetch fields', error);
            const message = error instanceof Error ? error.message : '圃場一覧の取得に失敗しました';
            setNotice({
                type: 'error',
                message,
                retry: () => { void fetchFields(); },
            });
            toastError(message, {
                label: '再試行',
                onClick: () => { void fetchFields(); },
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const handleSaveNewField = async (fieldData: NewFieldData) => {
        try {
            setNotice(null);
            // Use local API proxy to avoid cross-origin auth issues
            const res = await fetch('/api/v1/fields', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: fieldData.name,
                    area: fieldData.area,
                    color: fieldData.color,
                    polygon: fieldData.polygon,
                    location: fieldData.location,
                }),
            });

            if (res.ok) {
                const data = await res.json();
                // Refresh list and select new field
                await fetchFields();
                onChange(data.field.id);
                setIsDrawerOpen(false);
                setNotice({
                    type: 'success',
                    message: '圃場を保存しました',
                });
                toastSuccess('圃場を保存しました');
            } else {
                const payload = await res.json().catch(() => ({}));
                throw new Error(payload?.error || '圃場の保存に失敗しました');
            }
        } catch (error) {
            console.error('Error saving field', error);
            const message = error instanceof Error ? error.message : '圃場の保存に失敗しました';
            setNotice({
                type: 'error',
                message,
                retry: () => {
                    void handleSaveNewField(fieldData);
                },
            });
            toastError(message, {
                label: '再試行',
                onClick: () => {
                    void handleSaveNewField(fieldData);
                },
            });
        }
    };

    if (loading) return <div className="animate-pulse h-24 bg-gray-100 rounded-xl"></div>;

    return (
        <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">Select Field (Location)</label>

            {notice && (
                <div
                    className={`rounded-lg border px-3 py-2 text-sm ${
                        notice.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                    }`}
                >
                    <div className="flex items-center justify-between gap-3">
                        <span>{notice.message}</span>
                        {notice.retry && (
                            <button
                                type="button"
                                onClick={notice.retry}
                                className="rounded-md border border-current px-2 py-1 text-xs font-semibold hover:bg-white/40"
                            >
                                再試行
                            </button>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {/* Existing Fields */}
                {fields.map((field) => (
                    <button
                        key={field.id}
                        type="button"
                        onClick={() => onChange(field.id)}
                        className={`relative p-3 rounded-xl border-2 text-left transition-all ${selectedFieldId === field.id
                            ? 'border-green-500 bg-green-50 ring-1 ring-green-500'
                            : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: field.color || '#ccc' }}
                            />
                            <span className="font-medium text-gray-900 truncate">{field.name}</span>
                        </div>
                        <div className="text-xs text-gray-500">
                            {field.area ? `${(field.area / 10000).toFixed(2)} ha` : 'No area'}
                        </div>
                        {selectedFieldId === field.id && (
                            <div className="absolute top-2 right-2 text-green-600">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                            </div>
                        )}
                    </button>
                ))}

                {/* Add New Button */}
                <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-500 hover:border-green-500 hover:text-green-600 hover:bg-green-50 transition-all gap-1"
                >
                    <span className="material-symbols-outlined">add_location_alt</span>
                    <span className="text-sm font-medium">Draw New Field</span>
                </button>
            </div>

            {/* Map Drawer Modal */}
            <MapDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                onSave={handleSaveNewField}
            />
        </div>
    );
}
