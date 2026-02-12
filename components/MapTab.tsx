'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';
import { useTranslations } from 'next-intl';
import FieldMapEditor from './fields/FieldMapEditor';
import { SeasonRail } from '@/components/workflow/SeasonRail';
import { buildSeasonRailState } from '@/lib/workflow-ui';

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

interface FieldFormData {
    name: string;
    crop: string;
    color: string;
    area: number;
    polygon?: string | LatLng[] | null;
    location?: string | LatLng | null;
}

export default function MapTab() {
    const t = useTranslations('fields');
    const tw = useTranslations('workflow');
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const polygonsRef = useRef<{ [key: string]: google.maps.Polygon }>({});
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    // const [selectedField, setSelectedField] = useState<Field | null>(null);

    // Edit/Add Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingField, setEditingField] = useState<Field | null>(null);
    const [formData, setFormData] = useState<FieldFormData>({ name: '', crop: '', color: '#10B981', area: 0 });
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
                area: field.area || 0,
                polygon: field.polygon || null,
                location: field.location || null
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
                polygon: formData.polygon ?? editingField?.polygon ?? null,
                location: formData.location ?? editingField?.location ?? null,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error(t('save_error'));

            await refreshFields();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving field:', error);
            alert(t('save_error'));
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

    const mappedFields = fields.filter((field) => !!field.polygon).length;
    const seasonState = buildSeasonRailState({
        stage: mappedFields > 0 ? 'vegetative' : 'seedling',
        progress: Math.round((mappedFields / Math.max(fields.length, 1)) * 100),
        dayCount: mappedFields,
        totalDays: Math.max(fields.length, 1),
        dayLabel: tw('day_progress_with_total', { current: mappedFields, total: Math.max(fields.length, 1) }),
        milestoneLabels: {
            seedling: tw('milestones.seedling'),
            vegetative: tw('milestones.vegetative'),
            flowering: tw('milestones.flowering'),
            harvest: tw('milestones.harvest'),
        },
        windowLabel: t('title'),
        risk: fields.length === 0 ? 'watch' : mappedFields < fields.length ? 'warning' : 'safe',
        note: fields.length === 0
            ? t('map_draw_first_note')
            : t('map_boundaries_note', { mapped: mappedFields, total: fields.length }),
    });

    return (
        <div className="w-full space-y-5 p-4">
            <SeasonRail state={seasonState} />

            <div className="surface-raised relative h-[calc(100vh-140px)] w-full overflow-hidden">
                {/* Map Container */}
                <div ref={mapRef} className="h-full w-full" />

                {/* Empty State / Instructions if no fields */}
                {fields.length === 0 && (
                    <div className="absolute left-4 right-4 top-4 rounded-lg border border-border bg-card/90 p-3 text-center shadow-lift1 backdrop-blur">
                        <p className="text-sm text-muted-foreground">{t('no_fields_mapped')}</p>
                    </div>
                )}

                {/* Recenter Button */}
                <button
                    onClick={handleRecenter}
                    className="touch-target absolute right-4 top-4 rounded-full border border-border bg-card p-2 text-foreground shadow-lift1 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    title={t('recenter_map')}
                >
                    <span className="material-symbols-outlined">my_location</span>
                </button>
            </div>

            {/* Field List */}
            <div className="w-full mt-2">
                <div className="mb-4 flex items-center justify-between px-1">
                    <h3 className="text-lg font-semibold text-foreground">{t('title')}</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Add Field Button */}
                    <button
                        onClick={() => handleOpenModal()}
                        className="surface-base group flex min-h-[140px] flex-col items-center justify-center border-2 border-dashed p-8 text-muted-foreground transition hover:border-brand-seedling/60 hover:bg-secondary/35 hover:text-foreground"
                    >
                        <span className="material-symbols-outlined mb-2 cursor-pointer text-4xl transition group-hover:scale-110">add_circle</span>
                        <span className="font-medium">{t('add_new')}</span>
                    </button>

                    {fields.map((field) => (
                        <div
                            key={field.id}
                            className="surface-base group relative p-4 transition hover:border-brand-seedling/40"
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
                                    <h3 className="font-semibold text-foreground group-hover:text-brand-seedling transition">{field.name}</h3>
                                </div>

                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <div className="flex justify-between">
                                        <span>{t('crop')}:</span>
                                        <span className="font-medium text-foreground">{field.crop || '-'}</span>
                                    </div>
                                    {field.area !== undefined && (
                                        <div className="flex justify-between">
                                            <span>{t('area')}:</span>
                                            <span className="font-medium text-foreground">
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
                                className="touch-target absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
                    <div className="surface-overlay relative max-h-[90vh] w-full max-w-2xl overflow-y-auto p-6">
                        <h2 className="mb-4 text-xl font-semibold text-foreground">
                            {editingField ? t('edit_field') : t('add_new')}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('name_label')}</label>
                                <input
                                    type="text"
                                    required
                                    className="control-inset w-full px-3 py-2"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder={t('name_placeholder')}
                                />
                            </div>

                            {/* Map Editor */}
                            <div className="overflow-hidden rounded-xl border border-border">
                                <FieldMapEditor
                                    initialPolygon={editingField?.polygon}
                                    onFieldChange={(data) => {
                                        setFormData(prev => ({
                                            ...prev,
                                            area: data.area,
                                            polygon: data.polygon,
                                            location: data.location
                                        }));
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('area_label')} (ha)</label>
                                    <input
                                        type="number"
                                        className="control-inset w-full bg-secondary px-3 py-2"
                                        value={formData.area}
                                        readOnly
                                        placeholder={t('auto_calculated')}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('crop_label')}</label>
                                    <input
                                        type="text"
                                        className="control-inset w-full px-3 py-2"
                                        value={formData.crop}
                                        onChange={e => setFormData({ ...formData, crop: e.target.value })}
                                        placeholder={t('crop_placeholder')}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium text-muted-foreground">{t('color_label')}</label>
                                <div className="flex gap-2 mt-1">
                                    {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'].map(color => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, color })}
                                            className={`h-8 w-8 rounded-full border-2 transition ${formData.color === color ? 'scale-110 border-foreground/60' : 'border-transparent'}`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                >
                                    {t('cancel')}
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
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
