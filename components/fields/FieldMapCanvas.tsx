'use client';

import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import type { FieldRecord, GeoJsonPolygon, FieldCentroid, RiskSeverity } from './types';

type DrawMode = 'none' | 'centroid' | 'polygon';

type FieldMapCanvasProps = {
  fields: FieldRecord[];
  selectedFieldId: string | null;
  draftGeometry: GeoJsonPolygon | null;
  draftCentroid: FieldCentroid | null;
  drawMode: DrawMode;
  riskByFieldId: Record<string, RiskSeverity>;
  onSelectField: (fieldId: string) => void;
  onDraftGeometryChange: (geometry: GeoJsonPolygon | null) => void;
  onDraftCentroidChange: (centroid: FieldCentroid | null) => void;
};

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    gsi: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'GSI',
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: 'gsi-base',
      type: 'raster',
      source: 'gsi',
    },
  ],
};

function riskColor(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical':
      return '#b91c1c';
    case 'warning':
      return '#d97706';
    case 'watch':
      return '#0369a1';
    default:
      return '#166534';
  }
}

function geometryRing(geometry: GeoJsonPolygon): Array<{ lat: number; lon: number }> {
  const ring = Array.isArray(geometry.coordinates[0]) ? geometry.coordinates[0] : [];
  return ring
    .map((pair) => ({ lon: pair[0], lat: pair[1] }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function featureCollection(fields: FieldRecord[], riskByFieldId: Record<string, RiskSeverity>) {
  return {
    type: 'FeatureCollection' as const,
    features: fields
      .filter((field) => field.geometry && field.geometry.type === 'Polygon')
      .map((field) => ({
        type: 'Feature' as const,
        geometry: field.geometry as GeoJsonPolygon,
        properties: {
          id: field.id,
          name: field.name,
          color: field.color || '#22c55e',
          severity: riskByFieldId[field.id] || 'safe',
        },
      })),
  };
}

function pointCollection(fields: FieldRecord[]) {
  return {
    type: 'FeatureCollection' as const,
    features: fields
      .filter((field) => field.centroid)
      .map((field) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [field.centroid!.lon, field.centroid!.lat],
        },
        properties: {
          id: field.id,
          name: field.name,
        },
      })),
  };
}

function draftFeature(geometry: GeoJsonPolygon | null) {
  if (!geometry) {
    return {
      type: 'FeatureCollection' as const,
      features: [],
    };
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry,
        properties: { id: 'draft' },
      },
    ],
  };
}

function draftCentroidFeature(centroid: FieldCentroid | null) {
  if (!centroid) {
    return {
      type: 'FeatureCollection' as const,
      features: [],
    };
  }

  return {
    type: 'FeatureCollection' as const,
    features: [
      {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [centroid.lon, centroid.lat],
        },
        properties: { id: 'draft-centroid' },
      },
    ],
  };
}

function withClosedRing(points: Array<{ lat: number; lon: number }>): Array<{ lat: number; lon: number }> {
  if (points.length < 3) return points;
  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first.lat - last.lat) < 1e-9 && Math.abs(first.lon - last.lon) < 1e-9) {
    return points;
  }
  return [...points, first];
}

function geometryFromPoints(points: Array<{ lat: number; lon: number }>): GeoJsonPolygon | null {
  if (points.length < 3) return null;
  const closed = withClosedRing(points);
  return {
    type: 'Polygon',
    coordinates: [closed.map((point) => [point.lon, point.lat])],
  };
}

function centroidFromGeometry(geometry: GeoJsonPolygon): FieldCentroid | null {
  const ring = geometryRing(geometry);
  if (ring.length < 4) return null;

  const inner = ring.slice(0, -1);
  if (!inner.length) return null;

  const lat = inner.reduce((sum, point) => sum + point.lat, 0) / inner.length;
  const lon = inner.reduce((sum, point) => sum + point.lon, 0) / inner.length;
  return { lat, lon };
}

export default function FieldMapCanvas({
  fields,
  selectedFieldId,
  draftGeometry,
  draftCentroid,
  drawMode,
  riskByFieldId,
  onSelectField,
  onDraftGeometryChange,
  onDraftCentroidChange,
}: FieldMapCanvasProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const drawModeRef = useRef<DrawMode>(drawMode);
  const draftGeometryRef = useRef<GeoJsonPolygon | null>(draftGeometry);
  const selectedFieldIdRef = useRef<string | null>(selectedFieldId);
  const onSelectFieldRef = useRef(onSelectField);
  const onDraftGeometryChangeRef = useRef(onDraftGeometryChange);
  const onDraftCentroidChangeRef = useRef(onDraftCentroidChange);

  const fieldGeoJson = useMemo(() => featureCollection(fields, riskByFieldId), [fields, riskByFieldId]);
  const centroidGeoJson = useMemo(() => pointCollection(fields), [fields]);
  const draftGeoJson = useMemo(() => draftFeature(draftGeometry), [draftGeometry]);
  const draftCentroidGeoJson = useMemo(() => draftCentroidFeature(draftCentroid), [draftCentroid]);
  const fieldGeoJsonRef = useRef(fieldGeoJson);
  const centroidGeoJsonRef = useRef(centroidGeoJson);
  const draftGeoJsonRef = useRef(draftGeoJson);
  const draftCentroidGeoJsonRef = useRef(draftCentroidGeoJson);

  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  useEffect(() => {
    draftGeometryRef.current = draftGeometry;
  }, [draftGeometry]);

  useEffect(() => {
    selectedFieldIdRef.current = selectedFieldId;
  }, [selectedFieldId]);

  useEffect(() => {
    onSelectFieldRef.current = onSelectField;
  }, [onSelectField]);

  useEffect(() => {
    onDraftGeometryChangeRef.current = onDraftGeometryChange;
  }, [onDraftGeometryChange]);

  useEffect(() => {
    onDraftCentroidChangeRef.current = onDraftCentroidChange;
  }, [onDraftCentroidChange]);

  useEffect(() => {
    fieldGeoJsonRef.current = fieldGeoJson;
  }, [fieldGeoJson]);

  useEffect(() => {
    centroidGeoJsonRef.current = centroidGeoJson;
  }, [centroidGeoJson]);

  useEffect(() => {
    draftGeoJsonRef.current = draftGeoJson;
  }, [draftGeoJson]);

  useEffect(() => {
    draftCentroidGeoJsonRef.current = draftCentroidGeoJson;
  }, [draftCentroidGeoJson]);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: BASE_STYLE,
      center: [138.8512, 37.4464],
      zoom: 10,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('fields-source', {
        type: 'geojson',
        data: fieldGeoJsonRef.current as any,
      });

      map.addLayer({
        id: 'fields-fill',
        type: 'fill',
        source: 'fields-source',
        paint: {
          'fill-color': ['coalesce', ['get', 'color'], '#22c55e'],
          'fill-opacity': 0.2,
        },
      });

      map.addLayer({
        id: 'fields-line',
        type: 'line',
        source: 'fields-source',
        paint: {
          'line-color': ['coalesce', ['get', 'color'], '#22c55e'],
          'line-width': [
            'case',
            ['==', ['get', 'id'], selectedFieldIdRef.current || ''],
            3,
            1.5,
          ],
        },
      });

      map.addLayer({
        id: 'fields-halo',
        type: 'line',
        source: 'fields-source',
        paint: {
          'line-color': [
            'match',
            ['get', 'severity'],
            'critical',
            riskColor('critical'),
            'warning',
            riskColor('warning'),
            'watch',
            riskColor('watch'),
            riskColor('safe'),
          ],
          'line-width': [
            'case',
            ['==', ['get', 'id'], selectedFieldIdRef.current || ''],
            7,
            4,
          ],
          'line-opacity': 0.35,
        },
      });

      map.addSource('centroid-source', {
        type: 'geojson',
        data: centroidGeoJsonRef.current as any,
      });

      map.addLayer({
        id: 'centroid-points',
        type: 'circle',
        source: 'centroid-source',
        paint: {
          'circle-radius': 4,
          'circle-color': '#0f172a',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1,
        },
      });

      map.addSource('draft-source', {
        type: 'geojson',
        data: draftGeoJsonRef.current as any,
      });

      map.addLayer({
        id: 'draft-line',
        type: 'line',
        source: 'draft-source',
        paint: {
          'line-color': '#0ea5e9',
          'line-width': 2,
          'line-dasharray': [1, 1],
        },
      });

      map.addLayer({
        id: 'draft-fill',
        type: 'fill',
        source: 'draft-source',
        paint: {
          'fill-color': '#38bdf8',
          'fill-opacity': 0.15,
        },
      });

      map.addSource('draft-centroid-source', {
        type: 'geojson',
        data: draftCentroidGeoJsonRef.current as any,
      });

      map.addLayer({
        id: 'draft-centroid',
        type: 'circle',
        source: 'draft-centroid-source',
        paint: {
          'circle-radius': 6,
          'circle-color': '#0284c7',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#e0f2fe',
        },
      });

      map.on('click', 'fields-fill', (event) => {
        const id = event.features?.[0]?.properties?.id;
        if (typeof id === 'string') onSelectFieldRef.current(id);
      });

      map.on('click', (event) => {
        if (drawModeRef.current === 'none') return;

        const lon = event.lngLat.lng;
        const lat = event.lngLat.lat;

        if (drawModeRef.current === 'centroid') {
          onDraftCentroidChangeRef.current({ lat, lon });
          return;
        }

        const liveDraftGeometry = draftGeometryRef.current;
        const existingPoints = liveDraftGeometry ? geometryRing(liveDraftGeometry).slice(0, -1) : [];
        const nextPoints = [...existingPoints, { lat, lon }];
        const nextGeometry = geometryFromPoints(nextPoints);
        onDraftGeometryChangeRef.current(nextGeometry);

        if (nextGeometry) {
          const center = centroidFromGeometry(nextGeometry);
          if (center) onDraftCentroidChangeRef.current(center);
        }
      });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const updateSource = (sourceId: string, data: unknown) => {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) source.setData(data as any);
    };

    updateSource('fields-source', fieldGeoJson);
    updateSource('centroid-source', centroidGeoJson);
    updateSource('draft-source', draftGeoJson);
    updateSource('draft-centroid-source', draftCentroidGeoJson);

    if (map.getLayer('fields-line')) {
      map.setPaintProperty('fields-line', 'line-width', [
        'case',
        ['==', ['get', 'id'], selectedFieldId || ''],
        3,
        1.5,
      ]);
    }

    if (map.getLayer('fields-halo')) {
      map.setPaintProperty('fields-halo', 'line-width', [
        'case',
        ['==', ['get', 'id'], selectedFieldId || ''],
        7,
        4,
      ]);
    }
  }, [fieldGeoJson, centroidGeoJson, draftGeoJson, draftCentroidGeoJson, selectedFieldId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const bounds = new LngLatBounds();
    let hasBounds = false;

    for (const field of fields) {
      if (field.geometry) {
        for (const [lon, lat] of field.geometry.coordinates[0]) {
          bounds.extend([lon, lat]);
          hasBounds = true;
        }
      } else if (field.centroid) {
        bounds.extend([field.centroid.lon, field.centroid.lat]);
        hasBounds = true;
      }
    }

    if (draftGeometry) {
      for (const [lon, lat] of draftGeometry.coordinates[0]) {
        bounds.extend([lon, lat]);
        hasBounds = true;
      }
    } else if (draftCentroid) {
      bounds.extend([draftCentroid.lon, draftCentroid.lat]);
      hasBounds = true;
    }

    if (hasBounds) {
      map.fitBounds(bounds, {
        padding: 48,
        maxZoom: 16,
        duration: 500,
      });
    }
  }, [fields, draftGeometry, draftCentroid]);

  return (
    <div data-testid="field-map-canvas" className="relative h-[56vh] min-h-[360px] w-full overflow-hidden rounded-2xl border border-border bg-slate-100">
      <div ref={mapRef} className="h-full w-full" data-testid="maplibre-canvas" />
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
        {drawMode === 'none' ? '圃場を選択して編集' : drawMode === 'centroid' ? '地図をタップして位置ピンを設定' : '地図をタップして境界点を追加'}
      </div>
    </div>
  );
}
