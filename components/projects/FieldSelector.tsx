'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import turfArea from '@turf/area';
import turfCentroid from '@turf/centroid';
import { toastError, toastSuccess } from '@/lib/feedback';
import FieldMapCanvas from '@/components/fields/FieldMapCanvas';
import type { FieldCentroid, GeoJsonPolygon } from '@/components/fields/types';

type DrawMode = 'none' | 'centroid' | 'polygon';

type FieldScopeValue = {
  fieldIds: string[];
  primaryFieldId: string | null;
};

type FieldRecord = {
  id: string;
  name: string;
  crop?: string | null;
  environmentType?: 'open_field' | 'greenhouse' | 'home_pot' | string;
  containerCount?: number | null;
  areaSqm?: number | null;
  area?: number | null;
  color?: string | null;
  geoStatus?: string;
  geometry?: GeoJsonPolygon | null;
  centroid?: FieldCentroid | null;
};

type NewFieldDraft = {
  name: string;
  crop: string;
  environmentType: 'open_field' | 'greenhouse' | 'home_pot';
  containerCount: number | null;
  color: string;
  geometry: GeoJsonPolygon | null;
  centroid: FieldCentroid | null;
  areaSqm: number | null;
  weatherSamplingMode: 'hybrid' | 'centroid';
};

interface FieldSelectorProps {
  value: FieldScopeValue;
  onChange: (next: FieldScopeValue) => void;
  onFieldsLoaded?: (fields: FieldRecord[]) => void;
}

function normalizeField(raw: any): FieldRecord {
  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || 'Unnamed field'),
    crop: raw?.crop || null,
    environmentType: raw?.environmentType || 'open_field',
    containerCount: typeof raw?.containerCount === 'number' ? raw.containerCount : null,
    areaSqm: typeof raw?.areaSqm === 'number'
      ? raw.areaSqm
      : (typeof raw?.area === 'number' ? raw.area : null),
    area: typeof raw?.area === 'number'
      ? raw.area
      : (typeof raw?.areaSqm === 'number' ? raw.areaSqm : null),
    color: typeof raw?.color === 'string' ? raw.color : null,
    geoStatus: typeof raw?.geoStatus === 'string' ? raw.geoStatus : undefined,
    geometry: raw?.geometry && raw.geometry.type === 'Polygon'
      ? raw.geometry as GeoJsonPolygon
      : null,
    centroid: raw?.centroid
      && typeof raw.centroid.lat === 'number'
      && typeof raw.centroid.lon === 'number'
      ? raw.centroid as FieldCentroid
      : null,
  };
}

function requiresGeo(field: Pick<FieldRecord, 'environmentType'>): boolean {
  return (field.environmentType || 'open_field') === 'open_field';
}

function isSelectable(field: FieldRecord): boolean {
  if (!requiresGeo(field)) return true;
  return field.geoStatus !== 'missing';
}

function statusTone(field: FieldRecord): string {
  if (field.geoStatus === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (field.geoStatus === 'approximate') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
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

function geometryCentroid(geometry: GeoJsonPolygon | null): FieldCentroid | null {
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

function defaultDraft(): NewFieldDraft {
  return {
    name: '',
    crop: '',
    environmentType: 'open_field',
    containerCount: null,
    color: '#16a34a',
    geometry: null,
    centroid: null,
    areaSqm: null,
    weatherSamplingMode: 'hybrid',
  };
}

function deriveGeoStatus(draft: Pick<NewFieldDraft, 'geometry' | 'centroid'>): 'verified' | 'approximate' | 'missing' {
  if (draft.geometry && draft.centroid) return 'verified';
  if (draft.centroid) return 'approximate';
  return 'missing';
}

export default function FieldSelector({ value, onChange, onFieldsLoaded }: FieldSelectorProps) {
  const t = useTranslations('projects.field_selector');
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createDrawMode, setCreateDrawMode] = useState<DrawMode>('polygon');
  const [draft, setDraft] = useState<NewFieldDraft>(defaultDraft());
  const [viewMode, setViewMode] = useState<'selection' | 'creation'>('selection');

  const fieldById = useMemo(() => {
    const map = new Map<string, FieldRecord>();
    for (const field of fields) map.set(field.id, field);
    return map;
  }, [fields]);

  const selectedFieldIds = value.fieldIds;
  const primaryFieldId = value.primaryFieldId;

  const environmentLabel = (field: Pick<FieldRecord, 'environmentType'>): string => {
    if (field.environmentType === 'greenhouse') return t('environment.greenhouse');
    if (field.environmentType === 'home_pot') return t('environment.home_pot');
    return t('environment.open_field');
  };

  const statusLabel = (field: FieldRecord): string => {
    if (field.geoStatus === 'verified') return t('status_verified');
    if (field.geoStatus === 'approximate') return t('status_approximate');
    return t('status_missing');
  };

  const areaLabel = (field: Pick<FieldRecord, 'areaSqm' | 'area'>): string => {
    const areaSqm = typeof field.areaSqm === 'number'
      ? field.areaSqm
      : (typeof field.area === 'number' ? field.area : null);
    if (!areaSqm || areaSqm <= 0) return t('area_unset');
    return `${(areaSqm / 10000).toFixed(2)} ha`;
  };

  const resetCreateDraft = () => {
    setCreateSaving(false);
    setCreateError(null);
    setCreateDrawMode('polygon');
    setDraft(defaultDraft());
  };

  const handleUnselectableField = () => {
    toastError(t('unselectable_geo_required'));
  };

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/fields', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || payload?.message || t('load_error_default'));
      }
      const payload = await res.json();
      const nextFields = Array.isArray(payload?.fields)
        ? payload.fields.map((item: any) => normalizeField(item)).filter((item: FieldRecord) => Boolean(item.id))
        : [];
      setFields(nextFields);
      onFieldsLoaded?.(nextFields);

      if (nextFields.length === 0) {
        setViewMode('creation');
      } else {
        setViewMode('selection');
      }
    } catch (nextError) {
      console.error('Failed to fetch fields', nextError);
      setError(nextError instanceof Error ? nextError.message : t('load_error_default'));
      setViewMode('creation'); // Fallback to creation if fetch fails and no fields
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFields();
  }, []);

  useEffect(() => {
    if (!fields.length) {
      if (selectedFieldIds.length || primaryFieldId) {
        onChange({ fieldIds: [], primaryFieldId: null });
      }
      return;
    }

    const selectableIds = new Set(fields.filter(isSelectable).map((field) => field.id));
    const normalizedFieldIds = selectedFieldIds.filter((id) => selectableIds.has(id));
    const normalizedPrimary = normalizedFieldIds.includes(primaryFieldId || '')
      ? (primaryFieldId as string)
      : (normalizedFieldIds[0] || null);

    const sameIds = normalizedFieldIds.length === selectedFieldIds.length
      && normalizedFieldIds.every((id, index) => id === selectedFieldIds[index]);
    const samePrimary = normalizedPrimary === primaryFieldId;

    if (!sameIds || !samePrimary) {
      onChange({
        fieldIds: normalizedFieldIds,
        primaryFieldId: normalizedPrimary,
      });
    }
  }, [fields, onChange, primaryFieldId, selectedFieldIds]);

  const toggleField = (field: FieldRecord) => {
    if (!isSelectable(field)) {
      handleUnselectableField();
      return;
    }

    const exists = selectedFieldIds.includes(field.id);
    const nextFieldIds = exists
      ? selectedFieldIds.filter((id) => id !== field.id)
      : [...selectedFieldIds, field.id];

    const nextPrimary = !nextFieldIds.length
      ? null
      : exists && primaryFieldId === field.id
        ? nextFieldIds[0]
        : (primaryFieldId || field.id);

    onChange({
      fieldIds: nextFieldIds,
      primaryFieldId: nextPrimary,
    });
  };

  const setPrimary = (fieldId: string) => {
    if (!selectedFieldIds.includes(fieldId)) return;
    onChange({
      fieldIds: selectedFieldIds,
      primaryFieldId: fieldId,
    });
  };

  const handleDraftGeometryChange = (geometry: GeoJsonPolygon | null) => {
    setDraft((prev) => {
      const centroid = geometry ? geometryCentroid(geometry) : prev.centroid;
      const areaSqm = geometry ? geometryAreaSqm(geometry) : prev.areaSqm;
      return {
        ...prev,
        geometry,
        centroid,
        areaSqm,
      };
    });
    setCreateError(null);
  };

  const handleDraftCentroidChange = (centroid: FieldCentroid | null) => {
    setDraft((prev) => ({
      ...prev,
      centroid,
    }));
    setCreateError(null);
  };

  const handleCreateField = async () => {
    const name = draft.name.trim();
    if (!name) {
      setCreateError(t('create_error_name_required'));
      return;
    }

    const requiresLocation = draft.environmentType === 'open_field';
    if (requiresLocation && !draft.geometry && !draft.centroid) {
      setCreateError(t('create_error_location_required'));
      return;
    }

    if (draft.environmentType === 'home_pot' && (!draft.containerCount || draft.containerCount < 1)) {
      setCreateError(t('create_error_pot_required'));
      return;
    }

    setCreateSaving(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/v1/fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          crop: draft.crop.trim() || null,
          color: draft.color,
          environmentType: draft.environmentType,
          containerCount: draft.environmentType === 'home_pot' ? draft.containerCount : null,
          geometry: draft.geometry,
          centroid: draft.centroid,
          areaSqm: draft.areaSqm,
          geoStatus: deriveGeoStatus(draft),
          weatherSamplingMode: draft.weatherSamplingMode,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || payload?.error || t('create_error_generic'));
      }

      const payload = await response.json();
      const createdField = normalizeField(payload?.field || {});
      await fetchFields();

      const nextFieldIds = selectedFieldIds.includes(createdField.id)
        ? selectedFieldIds
        : [...selectedFieldIds, createdField.id];

      onChange({
        fieldIds: nextFieldIds,
        primaryFieldId: createdField.id,
      });

      toastSuccess(t('created_success'));
      resetCreateDraft();
      setViewMode('selection');
    } catch (nextError) {
      console.error('Failed to create field in project flow', nextError);
      const message = nextError instanceof Error ? nextError.message : t('create_error_generic');
      setCreateError(message);
      toastError(message);
    } finally {
      setCreateSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('badge')}</p>
          <h3 className="text-sm font-semibold text-foreground">{t('title')}</h3>
        </div>
        <div className="flex items-center gap-2">
          {fields.length > 0 && viewMode === 'selection' && (
            <button
              type="button"
              onClick={() => {
                setViewMode('creation');
                setCreateDrawMode('polygon');
              }}
              className="rounded-lg border border-brand-waterline/50 bg-brand-waterline/5 px-3 py-1 text-xs font-semibold text-brand-waterline hover:bg-brand-waterline/10"
            >
              + {t('switch_to_creation')}
            </button>
          )}
          {viewMode === 'creation' && fields.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode('selection')}
              className="rounded-lg border border-border bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground hover:bg-secondary/80"
            >
              ← {t('switch_to_selection')}
            </button>
          )}
          <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
            {t('selected_count', { count: selectedFieldIds.length })}
          </span>
        </div>
      </div>

      {loading && (
        <div className="rounded-lg border border-border bg-secondary/35 px-3 py-4 text-sm text-muted-foreground">
          {t('loading_fields')}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => { void fetchFields(); }}
            className="ml-3 rounded-md border border-current px-2 py-1 text-xs font-semibold"
          >
            {t('retry')}
          </button>
        </div>
      )}

      {/* Creation Mode */}
      {!loading && viewMode === 'creation' && (
        <section
          className="space-y-3 rounded-xl border border-brand-waterline/35 bg-brand-waterline/8 p-3"
          data-testid="field-selector-create-panel"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">{t('creator_badge')}</p>
              <h4 className="text-sm font-semibold text-foreground">{t('creator_title')}</h4>
              <p className="text-xs text-muted-foreground">{t('creator_hint')}</p>
            </div>
            <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {t('map_engine')}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t('name_label')}</span>
              <input
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                className="control-inset w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder={t('name_placeholder')}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t('crop_label')}</span>
              <input
                value={draft.crop}
                onChange={(event) => setDraft((prev) => ({ ...prev, crop: event.target.value }))}
                className="control-inset w-full rounded-lg border border-border px-3 py-2 text-sm"
                placeholder={t('crop_placeholder')}
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <label className="block md:col-span-2">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t('environment_label')}</span>
              <select
                value={draft.environmentType}
                onChange={(event) => {
                  const environmentType = event.target.value as 'open_field' | 'greenhouse' | 'home_pot';
                  setDraft((prev) => ({
                    ...prev,
                    environmentType,
                    containerCount: environmentType === 'home_pot'
                      ? (prev.containerCount && prev.containerCount > 0 ? prev.containerCount : 1)
                      : null,
                  }));

                  if (environmentType === 'open_field' && createDrawMode === 'none') {
                    setCreateDrawMode('polygon');
                  }

                  if (environmentType === 'home_pot' && createDrawMode === 'polygon') {
                    setCreateDrawMode('centroid');
                  }
                }}
                className="control-inset w-full rounded-lg border border-border px-3 py-2 text-sm"
              >
                <option value="open_field">{t('environment.open_field')}</option>
                <option value="greenhouse">{t('environment.greenhouse')}</option>
                <option value="home_pot">{t('environment.home_pot')}</option>
              </select>
            </label>

            {draft.environmentType === 'home_pot' ? (
              <label className="block md:col-span-1">
                <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t('pot_count_label')}</span>
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={draft.containerCount ?? ''}
                  onChange={(event) => setDraft((prev) => ({
                    ...prev,
                    containerCount: Number.isFinite(Number(event.target.value))
                      ? Math.max(1, Math.floor(Number(event.target.value)))
                      : null,
                  }))}
                  className="control-inset w-full rounded-lg border border-border px-3 py-2 text-sm"
                />
              </label>
            ) : null}

            <label className="block md:col-span-1">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">{t('color_label')}</span>
              <input
                type="color"
                value={draft.color}
                onChange={(event) => setDraft((prev) => ({ ...prev, color: event.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-card p-1"
              />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-card p-2">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">{t('draw_mode_label')}</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCreateDrawMode('none')}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${createDrawMode === 'none' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'}`}
              >
                {t('draw_mode_none')}
              </button>
              <button
                type="button"
                onClick={() => setCreateDrawMode('centroid')}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${createDrawMode === 'centroid' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'}`}
              >
                {t('draw_mode_pin')}
              </button>
              <button
                type="button"
                onClick={() => setCreateDrawMode('polygon')}
                disabled={draft.environmentType === 'home_pot'}
                className={`rounded-md border px-2 py-1 text-xs font-semibold ${createDrawMode === 'polygon' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'} disabled:opacity-50`}
              >
                {t('draw_mode_boundary')}
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {draft.environmentType === 'open_field'
                  ? t('location_required_open_field')
                  : t('location_optional', { environment: environmentLabel(draft) })}
              </span>
              <span>{draft.areaSqm ? `${(draft.areaSqm / 10000).toFixed(2)} ha` : t('area_pending')}</span>
            </div>
          </div>

          <div
            data-testid="field-selector-create-map"
            className="[&_[data-testid='field-map-canvas']]:min-h-0 [&_[data-testid='field-map-canvas']]:h-[420px] md:[&_[data-testid='field-map-canvas']]:h-[520px] xl:[&_[data-testid='field-map-canvas']]:h-[620px]"
          >
            <FieldMapCanvas
              fields={fields}
              selectedFieldId={primaryFieldId}
              draftGeometry={draft.geometry}
              draftCentroid={draft.centroid}
              drawMode={createDrawMode}
              riskByFieldId={{}}
              onSelectField={(fieldId) => {
                const field = fieldById.get(fieldId);
                if (!field) return;
                if (!isSelectable(field)) {
                  handleUnselectableField();
                  return;
                }

                if (selectedFieldIds.includes(fieldId)) {
                  setPrimary(fieldId);
                  return;
                }

                onChange({
                  fieldIds: [...selectedFieldIds, fieldId],
                  primaryFieldId: fieldId,
                });
              }}
              onDraftGeometryChange={handleDraftGeometryChange}
              onDraftCentroidChange={handleDraftCentroidChange}
              onDrawModeChange={setCreateDrawMode}
            />
          </div>

          {createError ? (
            <p className="text-sm font-semibold text-red-700">{createError}</p>
          ) : null}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={resetCreateDraft}
              disabled={createSaving}
              className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground"
            >
              {t('reset')}
            </button>
            <button
              type="button"
              onClick={handleCreateField}
              disabled={createSaving}
              className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {createSaving ? t('creating') : t('create_submit')}
            </button>
          </div>
        </section>
      )}

      {/* Selection Mode */}
      {!loading && viewMode === 'selection' && fields.length > 0 && (
        <div className="space-y-3">
          <div
            data-testid="field-selector-browse-map"
            className="[&_[data-testid='field-map-canvas']]:min-h-0 [&_[data-testid='field-map-canvas']]:h-[360px] md:[&_[data-testid='field-map-canvas']]:h-[460px] xl:[&_[data-testid='field-map-canvas']]:h-[540px]"
          >
            <FieldMapCanvas
              fields={fields}
              selectedFieldId={primaryFieldId}
              draftGeometry={null}
              draftCentroid={null}
              drawMode="none"
              riskByFieldId={{}}
              onSelectField={(fieldId) => {
                const field = fieldById.get(fieldId);
                if (!field) return;
                if (!isSelectable(field)) {
                  handleUnselectableField();
                  return;
                }

                if (selectedFieldIds.includes(fieldId)) {
                  setPrimary(fieldId);
                  return;
                }

                onChange({
                  fieldIds: [...selectedFieldIds, fieldId],
                  primaryFieldId: fieldId,
                });
              }}
              onDraftGeometryChange={() => { }}
              onDraftCentroidChange={() => { }}
            />
          </div>

          <div className="space-y-2">
            {fields.map((field) => {
              const selected = selectedFieldIds.includes(field.id);
              const primary = primaryFieldId === field.id;
              const selectable = isSelectable(field);
              return (
                <div
                  key={field.id}
                  className={`rounded-lg border p-3 transition ${selected
                    ? 'border-brand-waterline/55 bg-brand-waterline/10'
                    : selectable
                      ? 'border-border bg-card'
                      : 'border-red-200 bg-red-50/40'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleField(field)}
                      className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    >
                      <span
                        className={`mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border text-[10px] font-semibold ${selected
                          ? 'border-brand-waterline bg-brand-waterline text-white'
                          : 'border-border bg-card text-transparent'
                          }`}
                      >
                        ✓
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{field.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {field.crop || t('crop_unset')} · {areaLabel(field)} · {environmentLabel(field)}
                        </span>
                      </span>
                    </button>

                    {selected ? (
                      <button
                        type="button"
                        onClick={() => setPrimary(field.id)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${primary
                          ? 'border-brand-seedling/55 bg-brand-seedling/12 text-foreground'
                          : 'border-border bg-secondary text-muted-foreground'
                          }`}
                      >
                        {primary ? t('primary') : t('set_primary')}
                      </button>
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    {requiresGeo(field) ? (
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(field)}`}>
                        {statusLabel(field)}
                      </span>
                    ) : (
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold text-sky-700">
                        {t('status_optional')}
                      </span>
                    )}
                    {!selectable && requiresGeo(field) ? (
                      <span className="text-[11px] font-medium text-red-700">{t('not_schedulable')}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedFieldIds.length > 0 && primaryFieldId ? (
        <p className="text-xs text-muted-foreground">
          {t('primary_summary', { name: fieldById.get(primaryFieldId)?.name || '-' })}
        </p>
      ) : (
        <p className="text-xs text-red-700">{t('primary_required')}</p>
      )}
    </div>
  );
}
