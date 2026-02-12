'use client';

import { useEffect, useRef, useState } from 'react';
import { googleMapsLoader } from '@/lib/google-maps';

type LatLngPoint = { lat: number; lng: number };

interface FieldMapEditorProps {
    onFieldChange: (data: { area: number; polygon: any; location: any }) => void;
    initialPolygon?: any;
}

function parseInitialPolygon(input: unknown): LatLngPoint[] {
    if (!input) return [];

    if (typeof input === 'string') {
        try {
            const parsed = JSON.parse(input) as unknown;
            return parseInitialPolygon(parsed);
        } catch {
            return [];
        }
    }

    if (!Array.isArray(input)) return [];

    return input
        .map((point) => {
            if (!point || typeof point !== 'object') return null;
            const candidate = point as { lat?: unknown; lng?: unknown };
            if (typeof candidate.lat !== 'number' || typeof candidate.lng !== 'number') return null;
            return { lat: candidate.lat, lng: candidate.lng };
        })
        .filter((point): point is LatLngPoint => Boolean(point));
}

export default function FieldMapEditor({ onFieldChange, initialPolygon }: FieldMapEditorProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [drawingManager, setDrawingManager] = useState<google.maps.drawing.DrawingManager | null>(null);
    const [currentPolygon, setCurrentPolygon] = useState<google.maps.Polygon | null>(null);

    useEffect(() => {
        const initMap = async () => {
            const loader = googleMapsLoader;
            await loader.importLibrary('maps');
            await loader.importLibrary('drawing');
            await loader.importLibrary('geometry');
            await loader.importLibrary('places');

            if (!mapRef.current) return;

            const mapInstance = new google.maps.Map(mapRef.current, {
                center: { lat: 37.4, lng: 138.8 },
                zoom: 14,
                mapTypeId: 'hybrid',
                tilt: 0,
            });

            setMap(mapInstance);
        };

        void initMap();
    }, []);

    useEffect(() => {
        if (!map) return;

        if (searchInputRef.current) {
            const auto = new google.maps.places.Autocomplete(searchInputRef.current);
            auto.bindTo('bounds', map);

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

    useEffect(() => {
        if (!map || currentPolygon || !initialPolygon) return;

        const points = parseInitialPolygon(initialPolygon);
        if (!points.length) return;

        const polygon = new google.maps.Polygon({
            paths: points,
            fillColor: '#10B981',
            fillOpacity: 0.4,
            strokeWeight: 2,
            clickable: false,
            editable: true,
            zIndex: 1,
            map,
        });

        const bounds = new google.maps.LatLngBounds();
        points.forEach((point) => bounds.extend(point));
        map.fitBounds(bounds);
        setCurrentPolygon(polygon);
    }, [map, initialPolygon, currentPolygon]);

    useEffect(() => {
        if (!drawingManager) return;

        const updateFieldData = (polygon: google.maps.Polygon) => {
            const path = polygon.getPath();
            const areaM2 = google.maps.geometry.spherical.computeArea(path);
            const areaHa = areaM2 / 10000;

            const coordinates = path.getArray().map((point) => ({ lat: point.lat(), lng: point.lng() }));

            const bounds = new google.maps.LatLngBounds();
            path.forEach((point) => bounds.extend(point));
            const center = bounds.getCenter();

            onFieldChange({
                area: Number(areaHa.toFixed(2)),
                polygon: coordinates,
                location: center ? { lat: center.lat(), lng: center.lng() } : null,
            });
        };

        const attachPathListeners = (polygon: google.maps.Polygon) => {
            polygon.getPath().addListener('set_at', () => updateFieldData(polygon));
            polygon.getPath().addListener('insert_at', () => updateFieldData(polygon));
        };

        const handlePolygonComplete = (polygon: google.maps.Polygon) => {
            if (currentPolygon) {
                currentPolygon.setMap(null);
            }

            setCurrentPolygon(polygon);
            drawingManager.setDrawingMode(null);
            updateFieldData(polygon);
            attachPathListeners(polygon);
        };

        const listener = google.maps.event.addListener(drawingManager, 'polygoncomplete', handlePolygonComplete);

        if (currentPolygon) {
            updateFieldData(currentPolygon);
            attachPathListeners(currentPolygon);
        }

        return () => {
            google.maps.event.removeListener(listener);
        };
    }, [drawingManager, currentPolygon, onFieldChange]);

    useEffect(() => {
        return () => {
            if (currentPolygon) currentPolygon.setMap(null);
        };
    }, [currentPolygon]);

    const clearMap = () => {
        if (!currentPolygon) return;

        currentPolygon.setMap(null);
        setCurrentPolygon(null);
        if (drawingManager) drawingManager.setDrawingMode(google.maps.drawing.OverlayType.POLYGON);
        onFieldChange({ area: 0, polygon: null, location: null });
    };

    return (
        <div className="w-full space-y-3">
            <div className="relative">
                <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="住所や地名で検索 (例: 新潟県魚沼市)"
                    className="control-inset absolute left-2 top-2 z-10 w-64 px-4 py-2 text-sm"
                />

                <button
                    onClick={clearMap}
                    type="button"
                    className="absolute right-14 top-2 z-10 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10"
                >
                    書き直す
                </button>

                <div ref={mapRef} className="h-[400px] w-full rounded-xl border border-border" />
            </div>

            <p className="text-center text-xs text-muted-foreground">
                地図上の白枠内をタップして頂点を追加し、囲んでください
            </p>
        </div>
    );
}
