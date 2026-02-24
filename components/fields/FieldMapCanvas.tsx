'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { LngLatBounds } from 'maplibre-gl';
import type { FieldRecord, GeoJsonPolygon, FieldCentroid, RiskSeverity } from './types';

type DrawMode = 'none' | 'centroid' | 'polygon';
type BasemapMode = 'standard' | 'satellite' | 'hybrid';

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
  onDrawModeChange?: (mode: DrawMode) => void;
};

type GsiAddressSearchResult = {
  title: string;
  geometry: {
    coordinates: [number, number];
  };
};

const BASEMAP_LAYER_IDS = {
  standard: 'basemap-standard',
  satellite: 'basemap-satellite',
  hybridPhoto: 'basemap-hybrid-photo',
  hybridLabels: 'basemap-hybrid-labels',
} as const;

const BASE_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
  sources: {
    gsiStandard: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/std/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: 'GSI',
      minzoom: 2,
      maxzoom: 18,
    },
    gsiPhoto: {
      type: 'raster',
      tiles: ['https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg'],
      tileSize: 256,
      attribution: 'GSI',
      minzoom: 2,
      maxzoom: 18,
    },
  },
  layers: [
    {
      id: BASEMAP_LAYER_IDS.standard,
      type: 'raster',
      source: 'gsiStandard',
      layout: {
        visibility: 'none',
      },
    },
    {
      id: BASEMAP_LAYER_IDS.satellite,
      type: 'raster',
      source: 'gsiPhoto',
      layout: {
        visibility: 'none',
      },
    },
    {
      id: BASEMAP_LAYER_IDS.hybridPhoto,
      type: 'raster',
      source: 'gsiPhoto',
      layout: {
        visibility: 'visible',
      },
    },
    {
      id: BASEMAP_LAYER_IDS.hybridLabels,
      type: 'raster',
      source: 'gsiStandard',
      paint: {
        'raster-opacity': 0.78,
      },
      layout: {
        visibility: 'visible',
      },
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

function setLayerVisibility(map: maplibregl.Map, layerId: string, visible: boolean): void {
  if (!map.getLayer(layerId)) return;
  map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
}

function applyBasemapMode(map: maplibregl.Map, mode: BasemapMode): void {
  if (mode === 'standard') {
    setLayerVisibility(map, BASEMAP_LAYER_IDS.standard, true);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.satellite, false);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridPhoto, false);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridLabels, false);
    return;
  }

  if (mode === 'satellite') {
    setLayerVisibility(map, BASEMAP_LAYER_IDS.standard, false);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.satellite, true);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridPhoto, false);
    setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridLabels, false);
    return;
  }

  setLayerVisibility(map, BASEMAP_LAYER_IDS.standard, false);
  setLayerVisibility(map, BASEMAP_LAYER_IDS.satellite, false);
  setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridPhoto, true);
  setLayerVisibility(map, BASEMAP_LAYER_IDS.hybridLabels, true);
}

function geometryRing(geometry: GeoJsonPolygon): Array<{ lat: number; lon: number }> {
  const ring = Array.isArray(geometry.coordinates[0]) ? geometry.coordinates[0] : [];
  return ring
    .map((pair) => ({ lon: pair[0], lat: pair[1] }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
}

function openRingPoints(geometry: GeoJsonPolygon): Array<{ lat: number; lon: number }> {
  const points = geometryRing(geometry);
  if (points.length <= 1) return points;

  const first = points[0];
  const last = points[points.length - 1];
  if (Math.abs(first.lat - last.lat) < 1e-9 && Math.abs(first.lon - last.lon) < 1e-9) {
    return points.slice(0, -1);
  }

  return points;
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

function toAddressSearchResults(payload: unknown): GsiAddressSearchResult[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Record<string, unknown>;

    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) return [];

    const geometry = record.geometry;
    if (!geometry || typeof geometry !== 'object') return [];

    const coordinates = (geometry as Record<string, unknown>).coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return [];

    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

    return [{
      title,
      geometry: {
        coordinates: [lon, lat] as [number, number],
      },
    }];
  }).slice(0, 6);
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
  onDrawModeChange,
}: FieldMapCanvasProps) {
  const initialDraftPoints = draftGeometry ? openRingPoints(draftGeometry) : [];
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const drawModeRef = useRef<DrawMode>(drawMode);
  const draftGeometryRef = useRef<GeoJsonPolygon | null>(draftGeometry);
  const draftCentroidRef = useRef<FieldCentroid | null>(draftCentroid);
  const draftPolygonPointsRef = useRef<Array<{ lat: number; lon: number }>>(initialDraftPoints);
  const previousDraftGeometryRef = useRef<GeoJsonPolygon | null>(draftGeometry);
  const selectedFieldIdRef = useRef<string | null>(selectedFieldId);
  const onSelectFieldRef = useRef(onSelectField);
  const onDrawModeChangeRef = useRef(onDrawModeChange);
  const onDraftGeometryChangeRef = useRef(onDraftGeometryChange);
  const onDraftCentroidChangeRef = useRef(onDraftCentroidChange);
  const fieldsRef = useRef(fields);
  const hasAutoFittedRef = useRef(false);
  const basemapModeRef = useRef<BasemapMode>('hybrid');

  const [basemapMode, setBasemapMode] = useState<BasemapMode>('hybrid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GsiAddressSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [geoPending, setGeoPending] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [draftPolygonPoints, setDraftPolygonPoints] = useState<Array<{ lat: number; lon: number }>>(initialDraftPoints);

  const fieldGeoJson = useMemo(() => featureCollection(fields, riskByFieldId), [fields, riskByFieldId]);
  const centroidGeoJson = useMemo(() => pointCollection(fields), [fields]);
  const draftGeoJson = useMemo(() => draftFeature(draftGeometry), [draftGeometry]);
  const draftCentroidGeoJson = useMemo(() => draftCentroidFeature(draftCentroid), [draftCentroid]);
  const fieldGeoJsonRef = useRef(fieldGeoJson);
  const centroidGeoJsonRef = useRef(centroidGeoJson);
  const draftGeoJsonRef = useRef(draftGeoJson);
  const draftCentroidGeoJsonRef = useRef(draftCentroidGeoJson);

  const draftVertexCount = draftPolygonPoints.length;

  const fitToRelevantBounds = useCallback((options?: { includeDraft?: boolean; duration?: number; maxZoom?: number }) => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return false;

    const includeDraft = options?.includeDraft !== false;
    const bounds = new LngLatBounds();
    let hasBounds = false;

    for (const field of fieldsRef.current) {
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

    if (includeDraft && draftGeometryRef.current) {
      for (const [lon, lat] of draftGeometryRef.current.coordinates[0]) {
        bounds.extend([lon, lat]);
        hasBounds = true;
      }
    } else if (includeDraft && draftPolygonPointsRef.current.length > 0) {
      for (const point of draftPolygonPointsRef.current) {
        bounds.extend([point.lon, point.lat]);
        hasBounds = true;
      }
    } else if (includeDraft && draftCentroidRef.current) {
      bounds.extend([draftCentroidRef.current.lon, draftCentroidRef.current.lat]);
      hasBounds = true;
    }

    if (!hasBounds) return false;

    map.fitBounds(bounds, {
      padding: 48,
      maxZoom: options?.maxZoom ?? 16,
      duration: options?.duration ?? 450,
    });

    return true;
  }, []);

  const focusOnCoordinates = useCallback((lon: number, lat: number, zoom = 17) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    map.flyTo({
      center: [lon, lat],
      zoom,
      duration: 450,
      essential: true,
    });
  }, []);

  const undoDraftVertex = useCallback(() => {
    const currentPoints = draftPolygonPointsRef.current;
    if (!currentPoints.length) {
      onDraftGeometryChangeRef.current(null);
      onDraftCentroidChangeRef.current(null);
      return;
    }

    const nextPoints = currentPoints.slice(0, -1);
    draftPolygonPointsRef.current = nextPoints;
    setDraftPolygonPoints(nextPoints);

    if (nextPoints.length < 3) {
      onDraftGeometryChangeRef.current(null);
      const fallback = nextPoints.length ? nextPoints[nextPoints.length - 1] : null;
      onDraftCentroidChangeRef.current(fallback ? { lat: fallback.lat, lon: fallback.lon } : null);
      return;
    }

    const nextGeometry = geometryFromPoints(nextPoints);
    onDraftGeometryChangeRef.current(nextGeometry);

    if (nextGeometry) {
      const center = centroidFromGeometry(nextGeometry);
      onDraftCentroidChangeRef.current(center);
    }
  }, []);

  useEffect(() => {
    drawModeRef.current = drawMode;
  }, [drawMode]);

  useEffect(() => {
    const hadGeometry = Boolean(previousDraftGeometryRef.current);
    draftGeometryRef.current = draftGeometry;
    if (draftGeometry) {
      const nextPoints = openRingPoints(draftGeometry);
      draftPolygonPointsRef.current = nextPoints;
      setDraftPolygonPoints(nextPoints);
    } else if (drawMode !== 'polygon' || hadGeometry) {
      draftPolygonPointsRef.current = [];
      setDraftPolygonPoints([]);
    }

    previousDraftGeometryRef.current = draftGeometry;
  }, [draftGeometry, drawMode]);

  useEffect(() => {
    draftCentroidRef.current = draftCentroid;
  }, [draftCentroid]);

  useEffect(() => {
    selectedFieldIdRef.current = selectedFieldId;
  }, [selectedFieldId]);

  useEffect(() => {
    onSelectFieldRef.current = onSelectField;
  }, [onSelectField]);

  useEffect(() => {
    onDrawModeChangeRef.current = onDrawModeChange;
  }, [onDrawModeChange]);

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
    fieldsRef.current = fields;
  }, [fields]);

  useEffect(() => {
    basemapModeRef.current = basemapMode;
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;
    applyBasemapMode(map, basemapMode);
  }, [basemapMode]);

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
      applyBasemapMode(map, basemapModeRef.current);

      map.addSource('fields-source', {
        type: 'geojson',
        data: fieldGeoJsonRef.current as never,
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
        data: centroidGeoJsonRef.current as never,
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
        data: draftGeoJsonRef.current as never,
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
        data: draftCentroidGeoJsonRef.current as never,
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
        if (typeof id === 'string') {
          onSelectFieldRef.current(id);
        }
      });

      map.on('click', (event) => {
        if (drawModeRef.current === 'none') return;

        const lon = event.lngLat.lng;
        const lat = event.lngLat.lat;

        if (drawModeRef.current === 'centroid') {
          onDraftCentroidChangeRef.current({ lat, lon });
          return;
        }

        const existingPoints = draftPolygonPointsRef.current;
        const nextPoints = [...existingPoints, { lat, lon }];
        draftPolygonPointsRef.current = nextPoints;
        setDraftPolygonPoints(nextPoints);
        if (nextPoints.length < 3) return;

        const nextGeometry = geometryFromPoints(nextPoints);
        if (!nextGeometry) return;

        onDraftGeometryChangeRef.current(nextGeometry);
        const center = centroidFromGeometry(nextGeometry);
        if (center) {
          onDraftCentroidChangeRef.current(center);
        }
      });

      map.getCanvas().style.cursor = drawModeRef.current === 'none' ? '' : 'crosshair';

      if (!hasAutoFittedRef.current) {
        hasAutoFittedRef.current = fitToRelevantBounds({ includeDraft: false, duration: 0, maxZoom: 15 });
      }
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [fitToRelevantBounds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const updateSource = (sourceId: string, data: unknown) => {
      const source = map.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData(data as never);
      }
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
    map.getCanvas().style.cursor = drawMode === 'none' ? '' : 'crosshair';
  }, [drawMode]);

  useEffect(() => {
    if (!mapInstanceRef.current || !mapInstanceRef.current.isStyleLoaded()) return;

    if (!hasAutoFittedRef.current) {
      hasAutoFittedRef.current = fitToRelevantBounds({ includeDraft: false, duration: 0, maxZoom: 15 });
      return;
    }

    if (fields.length > 0) {
      fitToRelevantBounds({ includeDraft: false, duration: 350, maxZoom: 16 });
    }
  }, [fields, fitToRelevantBounds]);

  useEffect(() => {
    if (!selectedFieldId || !mapInstanceRef.current || !mapInstanceRef.current.isStyleLoaded()) return;

    const field = fields.find((f) => f.id === selectedFieldId);
    if (!field) return;

    const bounds = new LngLatBounds();
    let hasBounds = false;

    if (field.geometry) {
      for (const [lon, lat] of field.geometry.coordinates[0]) {
        bounds.extend([lon, lat]);
        hasBounds = true;
      }
    } else if (field.centroid) {
      bounds.extend([field.centroid.lon, field.centroid.lat]);
      hasBounds = true;
    }

    if (hasBounds) {
      mapInstanceRef.current.fitBounds(bounds, {
        padding: 48,
        maxZoom: 17,
        duration: 450,
      });
    }
  }, [selectedFieldId, fields]);

  useEffect(() => {
    const query = searchQuery.trim();

    if (query.length < 2) {
      setSearchLoading(false);
      setSearchError(null);
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setSearchLoading(true);
        setSearchError(null);

        const response = await fetch(
          `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          throw new Error(`search_failed_${response.status}`);
        }

        const payload = await response.json();
        const parsed = toAddressSearchResults(payload);
        setSearchResults(parsed);
        setSearchExpanded(true);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setSearchError('住所検索に失敗しました。もう一度お試しください。');
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const handleSelectSearchResult = (result: GsiAddressSearchResult) => {
    const [lon, lat] = result.geometry.coordinates;
    focusOnCoordinates(lon, lat, 17);
    setSearchQuery(result.title);
    setSearchExpanded(false);
    setSearchError(null);
  };

  const handleLocateCurrentPosition = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoError('この環境では現在地取得に対応していません。');
      return;
    }

    setGeoPending(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoPending(false);
        focusOnCoordinates(position.coords.longitude, position.coords.latitude, 17);
      },
      (error) => {
        setGeoPending(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('現在地の利用が拒否されました。ブラウザ設定をご確認ください。');
          return;
        }
        setGeoError('現在地を取得できませんでした。');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  return (
    <div
      data-testid="field-map-canvas"
      className="relative h-[62vh] min-h-[420px] w-full overflow-hidden rounded-2xl border border-border bg-slate-100 md:h-[68vh] xl:max-h-[820px]"
    >
      <div ref={mapRef} className="h-full w-full" data-testid="maplibre-canvas" />

      <div className="absolute left-3 top-3 z-20 w-[min(360px,calc(100%-24px))] space-y-2">
        <div className="pointer-events-auto rounded-lg border border-border bg-card/95 p-2 shadow-sm">
          <div className="flex items-center gap-2">
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onFocus={() => setSearchExpanded(true)}
              placeholder="住所・地名で検索 (例: 新潟県長岡市)"
              className="control-inset h-9 w-full rounded-md border border-border px-3 text-xs"
            />
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSearchResults([]);
                setSearchExpanded(false);
                setSearchError(null);
              }}
              className="touch-target rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-muted-foreground"
            >
              クリア
            </button>
          </div>

          {searchLoading ? (
            <p className="mt-2 text-[11px] text-muted-foreground">検索中...</p>
          ) : null}

          {!searchLoading && searchError ? (
            <p className="mt-2 text-[11px] font-semibold text-amber-700">{searchError}</p>
          ) : null}

          {!searchLoading && !searchError && searchExpanded && searchResults.length > 0 ? (
            <div className="mt-2 max-h-40 overflow-y-auto rounded-md border border-border bg-card">
              {searchResults.map((result) => (
                <button
                  key={`${result.title}-${result.geometry.coordinates.join('-')}`}
                  type="button"
                  onClick={() => handleSelectSearchResult(result)}
                  className="block w-full border-b border-border/60 px-3 py-2 text-left text-xs text-foreground last:border-b-0 hover:bg-secondary/40"
                >
                  {result.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="pointer-events-none rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-medium text-muted-foreground shadow-sm">
          {drawMode === 'none'
            ? '圃場を選択して編集'
            : drawMode === 'centroid'
              ? '地図をタップして位置ピンを設定'
              : '地図をタップして境界点を追加'}
        </div>

        {geoError ? (
          <div className="pointer-events-none rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-700">
            {geoError}
          </div>
        ) : null}
      </div>

      <div className="pointer-events-auto absolute bottom-3 right-3 z-20 w-[200px] space-y-2 rounded-lg border border-border bg-card/95 p-2 shadow-sm sm:bottom-auto sm:top-3">
        <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Basemap</p>
        <div className="grid grid-cols-3 gap-1">
          {([
            { id: 'standard', label: '標準' },
            { id: 'satellite', label: '写真' },
            { id: 'hybrid', label: '合成' },
          ] as Array<{ id: BasemapMode; label: string }>).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setBasemapMode(mode.id)}
              className={`rounded-md border px-2 py-1 text-[11px] font-semibold ${basemapMode === mode.id
                ? 'border-brand-waterline/70 bg-brand-waterline/12 text-foreground'
                : 'border-border bg-card text-muted-foreground'
                }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div data-testid="mobile-map-controls" className="grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={handleLocateCurrentPosition}
            disabled={geoPending}
            className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground disabled:opacity-60"
          >
            {geoPending ? '取得中' : '現在地'}
          </button>
          <button
            type="button"
            onClick={() => {
              fitToRelevantBounds({ includeDraft: true, duration: 350, maxZoom: 16 });
            }}
            className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground"
          >
            全体表示
          </button>
        </div>
      </div>

      {drawMode === 'polygon' ? (
        <div className="pointer-events-auto absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-lg border border-border bg-card/95 p-2 text-xs shadow-sm">
          <span className="rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            頂点 {draftVertexCount}
          </span>
          <button
            type="button"
            onClick={undoDraftVertex}
            disabled={draftVertexCount === 0}
            className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-semibold text-foreground disabled:opacity-50"
          >
            1点戻す
          </button>
          <button
            type="button"
            onClick={() => onDrawModeChangeRef.current?.('none')}
            className="rounded-md border border-brand-waterline/60 bg-brand-waterline/12 px-2 py-1 text-[11px] font-semibold text-foreground"
          >
            描画を完了
          </button>
        </div>
      ) : null}
    </div>
  );
}
