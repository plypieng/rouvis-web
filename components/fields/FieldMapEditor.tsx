'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';
import { useTranslations } from 'next-intl';

interface FieldMapEditorProps {
    onFieldChange: (data: { area: number; polygon: any; location: any }) => void;
    initialPolygon?: any;
}

export default function FieldMapEditor({ onFieldChange, initialPolygon }: FieldMapEditorProps) {
    const t = useTranslations('fields.editor'); // Ensure you have translations or fallback strings
    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);
    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    // Initial Map Setup
    useEffect(() => {
        const initMap = async () => {
            const loader = googleMapsLoader;
            await loader.importLibrary('maps');
            await loader.importLibrary('drawing');
            await loader.importLibrary('geometry');
            await loader.importLibrary('places');

            if (mapRef.current) {
                const mapInstance = new google.maps.Map(mapRef.current, {
                    center: { lat: 37.4, lng: 138.8 }, // Default to Niigata
                    zoom: 14,
                    mapTypeId: 'hybrid', // Satellite with labels
                    tilt: 0, // No 45deg imagery for easier drawing
                });
                setMap(mapInstance);
            }
        };
        initMap();
    }, []);

    // Setup Drawing Manager & Search
    useEffect(() => {
        if (!map) return;

        // Search Box
        if (searchInputRef.current) {
            const auto = new google.maps.places.Autocomplete(searchInputRef.current);
            auto.bindTo('bounds', map);
            setAutocomplete(auto);

            auto.addListener('place_changed', () => {
                const place = auto.getPlace();
                if (!place.geometry || !place.geometry.location) return;

                if (place.geometry.viewport) {
                    map.fitBounds(place.geometry.viewport);
                } else {
                    map.setCenter(place.geometry.location);
                    map.setZoom(17);
                }
            });
        }

        // Drawing Manager
        const manager = new google.maps.drawing.DrawingManager({
            drawingMode: google.maps.drawing.OverlayType.POLYGON,
            drawingControl: true,
            drawingControlOptions: {
                position: google.maps.ControlPosition.TOP_CENTER,
                drawingModes: [google.maps.drawing.OverlayType.POLYGON],
            },
            polygonOptions: {
                fillColor: '#10B981',
                fillOpacity: 0.4,
                strokeWeight: 2,
                clickable: false,
                editable: true,
                zIndex: 1,
            },
        });
        manager.setMap(map);
        setDrawingManager(manager);

        return () => {
            manager.setMap(null);
        };
    }, [map]);

    // Handle Drawing Events
    useEffect(() => {
        if (!drawingManager) return;

        const updateFieldData = (poly: google.maps.Polygon) => {
            const path = poly.getPath();
            const areaM2 = google.maps.geometry.spherical.computeArea(path);
            const areaHa = areaM2 / 10000; // Convert sq meters to hectares

            // Get Polygon Coords
            const coords = path.getArray().map(p => ({ lat: p.lat(), lng: p.lng() }));

            // Get Center
            const bounds = new google.maps.LatLngBounds();
            path.forEach(p => bounds.extend(p));
            const center = bounds.getCenter();

            onFieldChange({
                area: parseFloat(areaHa.toFixed(2)), // 2 decimal places
                polygon: coords,
                location: { lat: center?.lat(), lng: center?.lng() },
            });
        };

        const handlePolygonComplete = (poly: google.maps.Polygon) => {
            // Remove previous polygon if exists (Single field mode)
            if (currentPolygon) {
                currentPolygon.setMap(null);
            }
            setCurrentPolygon(poly);

            // Turn off drawing mode
            drawingManager.setDrawingMode(null);

            // Initial calc
            updateFieldData(poly);

            // Listen for edits
            poly.getPath().addListener('set_at', () => updateFieldData(poly));
            poly.getPath().addListener('insert_at', () => updateFieldData(poly));
        };

        const listener = google.maps.event.addListener(drawingManager, 'polygoncomplete', handlePolygonComplete);

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [drawingManager, currentPolygon, onFieldChange]);

    // Cleanup current polygon on unmount
    useEffect(() => {
        return () => {
            if (currentPolygon) currentPolygon.setMap(null);
        };
    }, [currentPolygon]);

    const clearMap = () => {
        if (currentPolygon) {
            currentPolygon.setMap(null);
            setCurrentPolygon(null);
            if (drawingManager) drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
            onFieldChange({ area: 0, polygon: null, location: null });
        }
    };

    return (
        <div className="w-full space-y-3">
            <div className="relative">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="住所や地名で検索 (例: 新潟県魚沼市)"
                    className="absolute top-2 left-2 z-10 w-64 px-4 py-2 bg-white shadow-md rounded-lg text-sm border border-gray-200 outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                    onClick={clearMap}
                    type="button"
                    className="absolute top-2 right-14 z-10 px-3 py-2 bg-white shadow-md rounded-lg text-xs font-medium text-red-600 hover:bg-red-50 border border-gray-200"
                >
                    書き直す
                </button>

                <div
                    ref={mapRef}
                    className="w-full h-[400px] rounded-xl border border-gray-200 shadow-inner"
                />
            </div>
            <p className="text-xs text-gray-500 text-center">
                地図上の白枠内をタップして頂点を追加し、囲んでください
            </p>
        </div>
    );
}
