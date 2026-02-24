'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import turfArea from '@turf/area';
import turfCentroid from '@turf/centroid';
import FieldMapCanvas from './FieldMapCanvas';
import FieldListRail from './FieldListRail';
import FieldBoundaryEditor, { type FieldDraft } from './FieldBoundaryEditor';
import FieldWeatherPanel from './FieldWeatherPanel';
import type { FieldRecord, GeoJsonPolygon, RiskSeverity } from './types';
import { toastError, toastSuccess } from '@/lib/feedback';

type DrawMode = 'none' | 'centroid' | 'polygon';

const DEFAULT_DRAFT: FieldDraft = {
  name: '',
  crop: '',
  environmentType: 'open_field',
  containerCount: null,
  color: '#16a34a',
  geoStatus: 'missing',
  weatherSamplingMode: 'hybrid',
  geometry: null,
  centroid: null,
  areaSqm: null,
};

function parseField(item: any): FieldRecord {
  return {
    id: item.id,
    name: item.name,
    crop: item.crop,
    environmentType: item.environmentType || 'open_field',
    containerCount: typeof item.containerCount === 'number' ? item.containerCount : null,
    color: item.color,
    areaSqm: typeof item.areaSqm === 'number' ? item.areaSqm : (typeof item.area === 'number' ? item.area : null),
    geometry: item.geometry || item.polygon || null,
    centroid: item.centroid || item.location || null,
    geoStatus: item.geoStatus || 'missing',
    weatherSamplingMode: item.weatherSamplingMode || 'hybrid',
    createdAt: item.createdAt || item.created_at,
    updatedAt: item.updatedAt || item.updated_at,
  };
}

function draftFromField(field: FieldRecord): FieldDraft {
  return {
    id: field.id,
    name: field.name,
    crop: field.crop || '',
    environmentType: field.environmentType === 'greenhouse' || field.environmentType === 'home_pot'
      ? field.environmentType
      : 'open_field',
    containerCount: typeof field.containerCount === 'number' ? field.containerCount : null,
    color: field.color || '#16a34a',
    geoStatus: field.geoStatus === 'verified' || field.geoStatus === 'approximate' ? field.geoStatus : 'missing',
    weatherSamplingMode: field.weatherSamplingMode === 'centroid' ? 'centroid' : 'hybrid',
    geometry: field.geometry || null,
    centroid: field.centroid || null,
    areaSqm: field.areaSqm || null,
  };
}

function geometryAreaSqm(geometry: GeoJsonPolygon | null): number | null {
  if (!geometry) return null;
  try {
    const feature = {
      type: 'Feature' as const,
      geometry,
      properties: {},
    };
    const sqm = turfArea(feature as any);
    if (!Number.isFinite(sqm) || sqm <= 0) return null;
    return Number(sqm.toFixed(2));
  } catch {
    return null;
  }
}

function geometryCentroid(geometry: GeoJsonPolygon | null): { lat: number; lon: number } | null {
  if (!geometry) return null;
  try {
    const feature = {
      type: 'Feature' as const,
      geometry,
      properties: {},
    };
    const center = turfCentroid(feature as any);
    const coordinates = center?.geometry?.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) return null;
    const lon = Number(coordinates[0]);
    const lat = Number(coordinates[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
  } catch {
    return null;
  }
}

export default function FieldStudio() {
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FieldDraft>(DEFAULT_DRAFT);
  const [drawMode, setDrawMode] = useState<DrawMode>('none');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [riskByFieldId, setRiskByFieldId] = useState<Record<string, RiskSeverity>>({});

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) || null,
    [fields, selectedFieldId],
  );

  const refreshFields = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/fields', { cache: 'no-store' });
      if (!response.ok) throw new Error('failed_to_fetch_fields');
      const payload = await response.json();
      const nextFields: FieldRecord[] = Array.isArray(payload?.fields)
        ? payload.fields.map((item: any) => parseField(item))
        : [];
      setFields(nextFields);

      if (!selectedFieldId && nextFields.length > 0) {
        setSelectedFieldId(nextFields[0].id);
      } else if (selectedFieldId && !nextFields.some((field) => field.id === selectedFieldId)) {
        setSelectedFieldId(nextFields[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to fetch fields', error);
      toastError('圃場一覧の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [selectedFieldId]);

  useEffect(() => {
    void refreshFields();
  }, [refreshFields]);

  useEffect(() => {
    if (isNew) return;
    if (!selectedField) {
      setDraft(DEFAULT_DRAFT);
      return;
    }
    setDraft(draftFromField(selectedField));
  }, [selectedField, isNew]);

  const startCreate = () => {
    setIsNew(true);
    setSelectedFieldId(null);
    setDrawMode('centroid');
    setDraft({ ...DEFAULT_DRAFT, color: '#16a34a' });
  };

  const selectField = (fieldId: string) => {
    setIsNew(false);
    setSelectedFieldId(fieldId);
    setDrawMode('none');
  };

  const updateDraftGeometry = (geometry: GeoJsonPolygon | null) => {
    const centroid = geometry ? geometryCentroid(geometry) : draft.centroid;
    const areaSqm = geometry ? geometryAreaSqm(geometry) : draft.areaSqm;
    setDraft((prev) => ({
      ...prev,
      geometry,
      centroid,
      areaSqm,
      geoStatus: geometry && centroid ? 'verified' : (centroid ? 'approximate' : 'missing'),
    }));
  };

  const updateDraftCentroid = (centroid: { lat: number; lon: number } | null) => {
    setDraft((prev) => ({
      ...prev,
      centroid,
      geoStatus: prev.geometry && centroid ? 'verified' : (centroid ? 'approximate' : 'missing'),
    }));
  };

  const clearGeometry = () => {
    setDraft((prev) => ({
      ...prev,
      geometry: null,
      centroid: null,
      areaSqm: null,
      geoStatus: 'missing',
    }));
  };

  const saveField = async () => {
    if (!draft.name.trim()) {
      toastError('圃場名を入力してください');
      return;
    }
    if (draft.environmentType === 'open_field' && !draft.geometry && !draft.centroid) {
      toastError('地図で位置ピンまたは境界を設定してください');
      return;
    }
    if (draft.environmentType === 'home_pot' && (!draft.containerCount || draft.containerCount < 1)) {
      toastError('家庭ポットの場合はポット数を入力してください');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: draft.name.trim(),
        crop: draft.crop.trim() || null,
        environmentType: draft.environmentType,
        containerCount: draft.environmentType === 'home_pot' ? draft.containerCount : null,
        color: draft.color,
        geometry: draft.geometry,
        centroid: draft.centroid,
        areaSqm: draft.areaSqm,
        geoStatus: draft.geoStatus,
        weatherSamplingMode: draft.weatherSamplingMode,
      };

      const endpoint = isNew ? '/api/v1/fields' : `/api/v1/fields/${draft.id}`;
      const method = isNew ? 'POST' : 'PATCH';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.error || 'save_failed');
      }

      const result = await response.json();
      const saved = parseField(result?.field || payload);

      await refreshFields();
      setIsNew(false);
      setDrawMode('none');
      setSelectedFieldId(saved.id || selectedFieldId);
      toastSuccess(isNew ? '圃場を作成しました' : '圃場を更新しました');
    } catch (error) {
      console.error('Failed to save field', error);
      toastError('圃場の保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const deleteField = async () => {
    if (!draft.id) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/v1/fields/${draft.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('delete_failed');

      toastSuccess('圃場を削除しました');
      setIsNew(false);
      setDrawMode('none');
      setSelectedFieldId(null);
      await refreshFields();
    } catch (error) {
      console.error('Failed to delete field', error);
      toastError('圃場の削除に失敗しました');
    } finally {
      setDeleting(false);
    }
  };

  const onSeverityChange = useCallback((severity: RiskSeverity) => {
    const fieldId = draft.id || selectedFieldId;
    if (!fieldId) return;
    setRiskByFieldId((prev) => {
      if (prev[fieldId] === severity) {
        return prev;
      }
      return {
        ...prev,
        [fieldId]: severity,
      };
    });
  }, [draft.id, selectedFieldId]);

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-4 px-4 py-4 lg:h-[calc(100vh-96px)] lg:max-h-[980px] lg:flex-row">
      <div className="lg:w-[280px] lg:flex-shrink-0">
        <FieldListRail
          fields={fields}
          selectedFieldId={selectedFieldId}
          riskByFieldId={riskByFieldId}
          onSelect={selectField}
          onCreateNew={startCreate}
        />
      </div>

      <div className="flex min-h-[320px] flex-1 flex-col gap-4">
        {loading ? (
          <div className="surface-base flex h-[62vh] min-h-[420px] items-center justify-center md:h-[68vh] xl:max-h-[820px]">
            <div className="text-sm text-muted-foreground">圃場データを読み込み中...</div>
          </div>
        ) : (
          <FieldMapCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            draftGeometry={draft.geometry}
            draftCentroid={draft.centroid}
            drawMode={drawMode}
            riskByFieldId={riskByFieldId}
            onSelectField={selectField}
            onDraftGeometryChange={updateDraftGeometry}
            onDraftCentroidChange={updateDraftCentroid}
            onDrawModeChange={setDrawMode}
          />
        )}
      </div>

      <div className="space-y-4 lg:w-[340px] lg:flex-shrink-0">
        <FieldWeatherPanel fieldId={draft.id || selectedFieldId} onSeverityChange={onSeverityChange} />
        <FieldBoundaryEditor
          draft={draft}
          isNew={isNew}
          drawMode={drawMode}
          saving={saving}
          deleting={deleting}
          onDraftChange={setDraft}
          onDrawModeChange={setDrawMode}
          onClearGeometry={clearGeometry}
          onSave={saveField}
          onDelete={deleteField}
        />
      </div>
    </div>
  );
}
