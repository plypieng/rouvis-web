'use client';

import { useMemo } from 'react';
import type { FieldCentroid, GeoJsonPolygon } from './types';

type DrawMode = 'none' | 'centroid' | 'polygon';

type FieldDraft = {
  id?: string;
  name: string;
  crop: string;
  color: string;
  geoStatus: 'verified' | 'approximate' | 'missing';
  weatherSamplingMode: 'centroid' | 'hybrid';
  geometry: GeoJsonPolygon | null;
  centroid: FieldCentroid | null;
  areaSqm: number | null;
};

type FieldBoundaryEditorProps = {
  draft: FieldDraft;
  isNew: boolean;
  drawMode: DrawMode;
  saving: boolean;
  deleting: boolean;
  onDraftChange: (next: FieldDraft) => void;
  onDrawModeChange: (mode: DrawMode) => void;
  onClearGeometry: () => void;
  onSave: () => void;
  onDelete: () => void;
};

export type { FieldDraft };

export default function FieldBoundaryEditor({
  draft,
  isNew,
  drawMode,
  saving,
  deleting,
  onDraftChange,
  onDrawModeChange,
  onClearGeometry,
  onSave,
  onDelete,
}: FieldBoundaryEditorProps) {
  const areaHa = useMemo(() => {
    if (!draft.areaSqm || draft.areaSqm <= 0) return '-';
    return `${(draft.areaSqm / 10000).toFixed(2)} ha`;
  }, [draft.areaSqm]);

  return (
    <section className="surface-base p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Boundary Editor</p>
          <h3 className="text-sm font-semibold text-foreground">{isNew ? '新しい圃場' : '圃場を編集'}</h3>
        </div>
        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {draft.geoStatus}
        </span>
      </div>

      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">圃場名</span>
          <input
            value={draft.name}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            className="control-inset w-full rounded-lg border border-border px-3 py-2"
            placeholder="例: 北区画A"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">作物</span>
          <input
            value={draft.crop}
            onChange={(event) => onDraftChange({ ...draft, crop: event.target.value })}
            className="control-inset w-full rounded-lg border border-border px-3 py-2"
            placeholder="例: コシヒカリ"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">色</span>
            <input
              type="color"
              value={draft.color}
              onChange={(event) => onDraftChange({ ...draft, color: event.target.value })}
              className="h-10 w-full rounded-lg border border-border bg-card p-1"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">面積</span>
            <div className="control-inset flex h-10 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground">
              {areaHa}
            </div>
          </label>
        </div>

        <div className="rounded-lg border border-border bg-card p-2">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">描画モード</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onDrawModeChange('none')}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${drawMode === 'none' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'}`}
            >
              停止
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange('centroid')}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${drawMode === 'centroid' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'}`}
            >
              ピン
            </button>
            <button
              type="button"
              onClick={() => onDrawModeChange('polygon')}
              className={`rounded-md border px-2 py-1 text-xs font-semibold ${drawMode === 'polygon' ? 'border-brand-waterline/60 bg-brand-waterline/10' : 'border-border bg-card'}`}
            >
              境界
            </button>
          </div>
          <button
            type="button"
            onClick={onClearGeometry}
            className="mt-2 w-full rounded-md border border-border bg-card px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            境界とピンをクリア
          </button>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">サンプリング</span>
          <select
            value={draft.weatherSamplingMode}
            onChange={(event) => onDraftChange({ ...draft, weatherSamplingMode: event.target.value as 'centroid' | 'hybrid' })}
            className="control-inset w-full rounded-lg border border-border px-3 py-2"
          >
            <option value="hybrid">hybrid (推奨)</option>
            <option value="centroid">centroid</option>
          </select>
        </label>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={saving || !draft.name.trim() || (!draft.centroid && !draft.geometry)}
          className="touch-target flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {saving ? '保存中...' : isNew ? '圃場を作成' : '保存'}
        </button>
        {!isNew ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="touch-target rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? '削除中' : '削除'}
          </button>
        ) : null}
      </div>
    </section>
  );
}
