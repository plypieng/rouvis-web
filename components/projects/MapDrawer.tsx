'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';
import { useTranslations } from 'next-intl';

interface MapDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (fieldData: { name: string; polygon: any; location: any; color: string; area: number }) => void;
}

export default function MapDrawer({ isOpen, onClose, onSave }: MapDrawerProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState('#10B981'); // Default Emerald
    const [area, setArea] = useState(0);

    // Load Map
    useEffect(() => {
        if (!isOpen) return;

        const initMap = async () => {
            const loader = googleMapsLoader;

            const { Map } = await loader.importLibrary('maps') as google.maps.MapsLibrary;
            const { DrawingManager } = await loader.importLibrary('drawing') as google.maps.DrawingLibrary;

            // Default center (Niigata, Japan) - In real app, use user location
            const defaultCenter = { lat: 37.4, lng: 138.8 };

            if (mapRef.current && !map) {
                const mapInstance = new Map(mapRef.current, {
                    center: defaultCenter,
                    zoom: 13,
                    mapTypeId: 'satellite',
                    disableDefaultUI: true,
                    zoomControl: true,
                });

                const manager = new DrawingManager({
                    drawingMode: google.maps.drawing.OverlayType.POLYGON,
                    drawingControl: true,
                    drawingControlOptions: {
                        position: google.maps.ControlPosition.TOP_CENTER,
                        drawingModes: [google.maps.drawing.OverlayType.POLYGON],
                    },
                    polygonOptions: {
                        fillColor: color,
                        fillOpacity: 0.5,
                        strokeWeight: 2,
                        clickable: true,
                        editable: true,
                        draggable: false,
                    },
                });

                manager.setMap(mapInstance);
                setMap(mapInstance);
                setDrawingManager(manager);

                // Event Listener for Polygon Complete
                google.maps.event.addListener(manager, 'polygoncomplete', (polygon: google.maps.Polygon) => {
                    // Remove previous polygon if exists (enforce single field per creation)
                    if (currentPolygon) {
                        currentPolygon.setMap(null);
                    }

                    setCurrentPolygon(polygon);
                    manager.setDrawingMode(null); // Stop drawing mode

                    // Calculate Area
                    const path = polygon.getPath();
                    const areaSqm = google.maps.geometry.spherical.computeArea(path);
                    setArea(Math.round(areaSqm));

                    // Listen for edits to update area
                    google.maps.event.addListener(polygon.getPath(), 'set_at', () => {
                        const newArea = google.maps.geometry.spherical.computeArea(polygon.getPath());
                        setArea(Math.round(newArea));
                    });
                    google.maps.event.addListener(polygon.getPath(), 'insert_at', () => {
                        const newArea = google.maps.geometry.spherical.computeArea(polygon.getPath());
                        setArea(Math.round(newArea));
                    });
                });
            }
        };

        initMap();
    }, [isOpen]);

    // Update polygon color when color picker changes
    useEffect(() => {
        if (currentPolygon) {
            currentPolygon.setOptions({ fillColor: color, strokeColor: color });
        }
        if (drawingManager) {
            drawingManager.setOptions({
                polygonOptions: {
                    fillColor: color,
                    fillOpacity: 0.5,
                    strokeWeight: 2,
                    editable: true,
                }
            });
        }
    }, [color, currentPolygon, drawingManager]);

    const handleSave = () => {
        if (!currentPolygon || !name) return;

        const path = currentPolygon.getPath().getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));

        // Calculate center roughly
        let latSum = 0, lngSum = 0;
        path.forEach(p => { latSum += p.lat; lngSum += p.lng; });
        const center = { lat: latSum / path.length, lng: lngSum / path.length };

        onSave({
            name,
            polygon: path, // Array of {lat, lng}
            location: center,
            color,
            area
        });

        // Reset
        setName('');
        setArea(0);
        currentPolygon.setMap(null);
        setCurrentPolygon(null);
        if (drawingManager) drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 w-full max-w-4xl h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Draw New Field</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Map Area */}
                <div className="flex-1 relative">
                    <div ref={mapRef} className="w-full h-full" />

                    {/* Instructions Overlay */}
                    {!currentPolygon && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-2 rounded-full shadow text-sm font-medium text-gray-700 pointer-events-none">
                            Click on the map to draw the field boundaries
                        </div>
                    )}
                </div>

                {/* Footer / Form */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Field Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. North Rice Paddy"
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Color Code</label>
                            <div className="flex gap-2">
                                {['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6'].map(c => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Area</label>
                            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-mono">
                                {area > 0 ? `${(area / 10000).toFixed(2)} ha (${area.toLocaleString()} m²)` : '-'}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!name || !currentPolygon}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Save Field
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
