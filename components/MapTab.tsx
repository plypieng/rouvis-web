'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';
import { useTranslations } from 'next-intl';

type LatLng = { lat: number; lng: number };

interface Field {
    id: string;
    name: string;
    crop?: string;
    polygon?: string | LatLng[];
    location?: string | LatLng;
    color?: string;
    area?: number;
}

export default function MapTab() {
    const t = useTranslations('fields');
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const polygonsRef = useRef<{ [key: string]: google.maps.Polygon }>({});
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    // const [selectedField, setSelectedField] = useState<Field | null>(null);

    // Edit/Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);
    const [formData, setFormData] = useState({ name: '', crop: '', color: '#10B981', area: 0 });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Refresh fields helper
    const refreshFields = async () => {
        try {
            const res = await fetch('/api/v1/fields');
            if (res.ok) {
                const data = await res.json();
                setFields(data.fields || []);
            }
        } catch (error) {
            console.error('Failed to refresh fields', error);
        }
    };

    const handleOpenModal = (field?: Field) => {
        if (field) {
            setEditingField(field);
            setFormData({
                name: field.name,
                crop: field.crop || '',
                color: field.color || '#10B981',
                area: field.area || 0
            });
        } else {
            setEditingField(null);
            setFormData({ name: '', crop: '', color: '#10B981', area: 0 });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const url = editingField ? `/api/v1/fields/${editingField.id}` : '/api/v1/fields';
            const method = editingField ? 'PUT' : 'POST';

            // For new fields without polygon, we might just send metadata
            // Ensure area is a number
            const payload = {
                ...formData,
                area: Number(formData.area),
                // Preserve existing polygon if editing, or null for new
                polygon: editingField?.polygon || null,
                location: editingField?.location || null,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error('Failed to save field');

            await refreshFields();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving field:', error);
            alert('Failed to save field');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Fetch fields
    useEffect(() => {
        const fetchFields = async () => {
            try {
                const res = await fetch('/api/v1/fields');
                if (res.ok) {
                    const data = await res.json();
                    setFields(data.fields || []);
                } else {
                    console.error('API Error:', res.status, res.statusText);
                }
            } catch (error) {
                console.error('Failed to fetch fields', error);
            }
        };
        fetchFields();
    }, []);

    // Initialize Map
    useEffect(() => {
        const initMap = async () => {
            const loader = googleMapsLoader;

            const { Map, InfoWindow } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

            // Default center (Niigata, Japan)
            const defaultCenter = { lat: 37.4, lng: 138.8 };

            if (mapRef.current) {
                const mapInstance = new Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 10,
                    mapTypeId: 'satellite',
                    disableDefaultUI: false, // Enable UI for better UX
                    zoomControl: true,
                    mapTypeControl: true,
                    streetViewControl: false,
                    fullscreenControl: true,
                    gestureHandling: 'greedy',
                });
                setMap(mapInstance);

                // Initialize InfoWindow
                infoWindowRef.current = new InfoWindow();
            }
        };

        initMap();
    }, []);

    // Draw Fields and Fit Bounds
    useEffect(() => {
        if (!map || fields.length === 0) return;

        // Clear existing polygons from map
        Object.values(polygonsRef.current).forEach(poly => poly.setMap(null));
        polygonsRef.current = {};

        const bounds = new google.maps.LatLngBounds();
        let hasValidBounds = false;

        fields.forEach((field) => {
            if (field.polygon) {
                // Parse polygon data
                let paths: LatLng[] = [];
                if (typeof field.polygon === 'string') {
                    try {
                        paths = JSON.parse(field.polygon) as LatLng[];
                    } catch (e) {
                        console.error('Error parsing polygon', e);
                        return;
                    }
                } else if (Array.isArray(field.polygon)) {
                    paths = field.polygon;
                }

                const polygon = new google.maps.Polygon({
                    paths: paths,
                    strokeColor: field.color || '#10B981', // Emerald-500 default
                    strokeOpacity: 0.8,
                    strokeWeight: 2,
                    fillColor: field.color || '#10B981',
                    fillOpacity: 0.35,
                    map: map,
                    clickable: true, // Ensure clickable
                });

                // Store in ref
                polygonsRef.current[field.id] = polygon;

                // Calculate center for InfoWindow
                const fieldBounds = new google.maps.LatLngBounds();
                paths.forEach(p => fieldBounds.extend(p));
                const center = fieldBounds.getCenter();

                polygon.addListener('click', () => {
                    // setSelectedField(field);

                    if (infoWindowRef.current) {
                        const content = `
                            <div style="padding: 4px; min-width: 200px;">
                                <h3 style="font-weight: bold; margin-bottom: 4px; font-size: 16px;">${field.name}</h3>
                                <div style="margin-bottom: 8px; color: #4b5563;">
                                    <span style="font-weight: 500;">${t('crop')}:</span> ${field.crop || '-'}
                                </div>
                                ${field.area ? `<div style="margin-bottom: 8px; color: #4b5563;">
                                    <span style="font-weight: 500;">${t('area')}:</span> ${(field.area / 10000).toFixed(2)} ha
                                </div>` : ''}
                                <button onclick="window.location.href='/fields?id=${field.id}'" style="
                                    background-color: #10B981; 
                                    color: white; 
                                    border: none; 
                                    padding: 6px 12px; 
                                    border-radius: 4px; 
                                    cursor: pointer; 
                                    font-size: 14px;
                                    width: 100%;
                                ">
                                    ${t('edit_field')}
                                </button>
                            </div>
                        `;
                        infoWindowRef.current.setContent(content);
                        infoWindowRef.current.setPosition(center);
                        infoWindowRef.current.open(map);
                    }

                    if (center) {
                        map.panTo(center);
                        // map.setZoom(16); // Optional: don't zoom automatically to avoid annoyance
                    }
                });

                // Extend bounds
                paths.forEach((p) => {
                    bounds.extend(p);
                    hasValidBounds = true;
                });
            }
        });

        // Fit bounds if we have valid field data
        if (hasValidBounds) {
            console.log('Fitting bounds to fields:', bounds.toJSON());
            map.fitBounds(bounds);

            // Adjust zoom if it's too zoomed in (e.g. single small field)
            const listener = google.maps.event.addListener(map, "idle", () => {
                if (map.getZoom()! > 16) map.setZoom(16);
                google.maps.event.removeListener(listener);
            });
        }

    }, [map, fields, t]);

    const handleRecenter = () => {
        if (!map || fields.length === 0) return;
        const bounds = new google.maps.LatLngBounds();
        let hasValidBounds = false;
        fields.forEach(f => {
            if (f.polygon) {
                let paths: LatLng[] = [];
                if (typeof f.polygon === 'string') {
                    try { paths = JSON.parse(f.polygon) as LatLng[]; } catch { }
                } else if (Array.isArray(f.polygon)) {
                    paths = f.polygon;
                }
                paths.forEach((p) => { bounds.extend(p); hasValidBounds = true; });
            }
        });
        if (hasValidBounds) map.fitBounds(bounds);
    };

    return (
        <div className="flex flex-col items-center p-4 w-full">
            <div className="relative h-[calc(100vh-140px)] w-full max-w-6xl rounded-2xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-gray-800/80 ring-1 ring-gray-900/5 transition-all">
                {/* Map Container */}
                <div ref={mapRef} className="h-full w-full" />

                {/* Empty State / Instructions if no fields */}
                {fields.length === 0 && (
                    <div className="absolute top-4 left-4 right-4 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded-lg p-3 shadow text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-300">No fields mapped yet.</p>
                    </div>
                )}

                {/* Recenter Button */}
                <button
                    onClick={handleRecenter}
                    className="absolute top-4 right-4 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Recenter Map"
                >
                    <span className="material-symbols-outlined">my_location</span>
                </button>
            </div>

            {/* Field List */}
            <div className="w-full max-w-6xl mt-6">
                <div className="flex justify-between items-center mb-4 px-1">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{t('title')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Field Button */}
                    <button
                        onClick={() => handleOpenModal()}
                        className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:border-green-500 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition group min-h-[140px]"
                    >
                        <span className="material-symbols-outlined text-4xl mb-2 group-hover:scale-110 transition cursor-pointer">add_circle</span>
                        <span className="font-medium">{t('add_new')}</span>
                    </button>

                    {fields.map((field) => (
                        <div
                            key={field.id}
                            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition group relative"
                        >
                            {/* Card Content Click Area - triggers Map Focus */}
                            <div
                                onClick={() => {
                                    // Trigger click on the map polygon to open info window and zoom
                                    const polygon = polygonsRef.current[field.id];
                                    if (polygon) {
                                        google.maps.event.trigger(polygon, 'click');
                                    }
                                }}
                                className="cursor-pointer"
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: field.color || '#10B981' }}
                                    />
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100 group-hover:text-green-600 transition">{field.name}</h3>
                                </div>

                                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                                    <div className="flex justify-between">
                                        <span>{t('crop')}:</span>
                                        <span className="font-medium text-gray-900 dark:text-gray-200">{field.crop || '-'}</span>
                                    </div>
                                    {field.area !== undefined && (
                                        <div className="flex justify-between">
                                            <span>{t('area')}:</span>
                                            <span className="font-medium text-gray-900 dark:text-gray-200">
                                                {(field.area / 10000).toFixed(2)} ha
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Edit Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenModal(field);
                                }}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700 p-1 rounded-full transition"
                                title={t('edit_field')}
                            >
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                            {editingField ? t('edit_field') : t('add_new')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('name_label')}</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('name_placeholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('crop_label')}</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                    value={formData.crop}
                                    onChange={e => setFormData({ ...formData, crop: e.target.value })}
                                    placeholder={t('crop_placeholder')}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('area_label')}</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 outline-none"
                                        value={formData.area}
                                        onChange={e => setFormData({ ...formData, area: parseFloat(e.target.value) || 0 })}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('color_label')}</label>
                                    <div className="flex gap-2 mt-1">
                                        {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setFormData({ ...formData, color })}
                                                className={`w-8 h-8 rounded-full border-2 transition ${formData.color === color ? 'border-gray-600 dark:border-gray-300 scale-110' : 'border-transparent'}`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition font-medium"
                                >
                                    {isSubmitting ? t('saving') : t('save')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
