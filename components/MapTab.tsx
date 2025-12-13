'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';

type LatLng = { lat: number; lng: number };

interface Field {
    id: string;
    name: string;
    crop?: string;
    polygon?: string | LatLng[];
    location?: string | LatLng;
    color?: string;
}

export default function MapTab() {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [fields, setFields] = useState<Field[]>([]);
    const [selectedField, setSelectedField] = useState<Field | null>(null);

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

            const { Map } = await loader.importLibrary('maps') as google.maps.MapsLibrary;

            // Default center (Niigata, Japan)
            const defaultCenter = { lat: 37.4, lng: 138.8 };

            if (mapRef.current) {
                const mapInstance = new Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 10,
                    mapTypeId: 'satellite',
                    disableDefaultUI: true, // Clean UI
                    zoomControl: true,
                });
                setMap(mapInstance);
            }
        };

        initMap();
    }, []);

    // Draw Fields and Fit Bounds
    useEffect(() => {
        if (!map || fields.length === 0) return;

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
                });

                polygon.addListener('click', () => {
                    setSelectedField(field);
                    if (field.location) {
                        let loc: LatLng | null = null;
                        if (typeof field.location === 'string') {
                            try { loc = JSON.parse(field.location) as LatLng; } catch { }
                        } else {
                            loc = field.location;
                        }
                        if (loc) {
                            map.panTo(loc);
                            map.setZoom(16);
                        }
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

    }, [map, fields]);

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
        <div className="relative h-[calc(100vh-112px)] w-full">
            {/* Map Container */}
            <div ref={mapRef} className="h-full w-full" />

            {/* Bottom Sheet (Selected Field) */}
            {selectedField && (
                <div className="absolute bottom-4 left-4 right-4 bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 transition-transform transform translate-y-0">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{selectedField.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{selectedField.crop || 'No Crop'}</p>
                        </div>
                        <button
                            onClick={() => setSelectedField(null)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex gap-2 mt-4">
                        <button className="flex-1 bg-emerald-600 text-white py-2 rounded-lg font-medium hover:bg-emerald-700">
                            View Details
                        </button>
                        <button className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300">
                            <span className="material-symbols-outlined">directions</span>
                        </button>
                    </div>
                </div>
            )}

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
    );
}
