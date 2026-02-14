'use client';

import { useEffect, useMemo, useState } from 'react';
import { toastError } from '@/lib/feedback';

type FieldScopeValue = {
  fieldIds: string[];
  primaryFieldId: string | null;
};

type FieldRecord = {
  id: string;
  name: string;
  crop?: string | null;
  areaSqm?: number | null;
  area?: number | null;
  color?: string | null;
  geoStatus?: string | null;
};

interface FieldSelectorProps {
  value: FieldScopeValue;
  onChange: (next: FieldScopeValue) => void;
}

function normalizeField(raw: any): FieldRecord {
  return {
    id: String(raw?.id || ''),
    name: String(raw?.name || 'Unnamed field'),
    crop: raw?.crop || null,
    areaSqm: typeof raw?.areaSqm === 'number'
      ? raw.areaSqm
      : (typeof raw?.area === 'number' ? raw.area : null),
    area: typeof raw?.area === 'number'
      ? raw.area
      : (typeof raw?.areaSqm === 'number' ? raw.areaSqm : null),
    color: typeof raw?.color === 'string' ? raw.color : null,
    geoStatus: typeof raw?.geoStatus === 'string' ? raw.geoStatus : null,
  };
}

function isSelectable(field: FieldRecord): boolean {
  return field.geoStatus !== 'missing';
}

function statusLabel(field: FieldRecord): string {
  if (field.geoStatus === 'verified') return '位置:検証済み';
  if (field.geoStatus === 'approximate') return '位置:近似';
  return '位置:未設定';
}

function statusTone(field: FieldRecord): string {
  if (field.geoStatus === 'verified') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (field.geoStatus === 'approximate') return 'border-amber-200 bg-amber-50 text-amber-700';
  return 'border-red-200 bg-red-50 text-red-700';
}

function areaLabel(field: FieldRecord): string {
  const areaSqm = typeof field.areaSqm === 'number'
    ? field.areaSqm
    : (typeof field.area === 'number' ? field.area : null);
  if (!areaSqm || areaSqm <= 0) return '面積未設定';
  return `${(areaSqm / 10000).toFixed(2)} ha`;
}

export default function FieldSelector({ value, onChange }: FieldSelectorProps) {
  const [fields, setFields] = useState<FieldRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fieldById = useMemo(() => {
    const map = new Map<string, FieldRecord>();
    for (const field of fields) map.set(field.id, field);
    return map;
  }, [fields]);

  const selectedFieldIds = value.fieldIds;
  const primaryFieldId = value.primaryFieldId;

  const fetchFields = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/fields', { cache: 'no-store' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload?.error || '圃場一覧の取得に失敗しました');
      }
      const payload = await res.json();
      const nextFields = Array.isArray(payload?.fields)
        ? payload.fields.map((item: any) => normalizeField(item)).filter((item: FieldRecord) => Boolean(item.id))
        : [];
      setFields(nextFields);
    } catch (nextError) {
      console.error('Failed to fetch fields', nextError);
      setError(nextError instanceof Error ? nextError.message : '圃場一覧の取得に失敗しました');
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
      toastError('位置情報が未設定の圃場は選択できません。Mapページでピンまたは境界を設定してください。');
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

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Field Scope</p>
          <h3 className="text-sm font-semibold text-foreground">圃場を選択 (複数可)</h3>
        </div>
        <span className="rounded-full border border-border bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">
          {selectedFieldIds.length}件選択
        </span>
      </div>

      {loading ? (
        <div className="rounded-lg border border-border bg-secondary/35 px-3 py-4 text-sm text-muted-foreground">
          圃場一覧を読み込み中...
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={() => { void fetchFields(); }}
            className="ml-3 rounded-md border border-current px-2 py-1 text-xs font-semibold"
          >
            再試行
          </button>
        </div>
      ) : null}

      {!loading && !error && fields.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-secondary/25 px-3 py-4 text-sm text-muted-foreground">
          圃場がありません。先にMapページで圃場を作成してください。
        </div>
      ) : null}

      {!loading && !error && fields.length > 0 ? (
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
                        {field.crop || '作物未設定'} · {areaLabel(field)}
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
                      {primary ? 'Primary' : 'Set primary'}
                    </button>
                  ) : null}
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(field)}`}>
                    {statusLabel(field)}
                  </span>
                  {!selectable ? (
                    <span className="text-[11px] font-medium text-red-700">スケジューリング不可</span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {selectedFieldIds.length > 0 && primaryFieldId ? (
        <p className="text-xs text-muted-foreground">
          Primary圃場: <span className="font-semibold text-foreground">{fieldById.get(primaryFieldId)?.name || '-'}</span>
        </p>
      ) : (
        <p className="text-xs text-red-700">少なくとも1つの圃場を選択してください。</p>
      )}
    </div>
  );
}
