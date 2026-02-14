'use client';

import type { FieldRecord, RiskSeverity } from './types';

type FieldListRailProps = {
  fields: FieldRecord[];
  selectedFieldId: string | null;
  riskByFieldId: Record<string, RiskSeverity>;
  onSelect: (fieldId: string) => void;
  onCreateNew: () => void;
};

function riskToneClass(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'warning':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'watch':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    default:
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
}

function riskLabel(severity: RiskSeverity): string {
  switch (severity) {
    case 'critical':
      return 'Critical';
    case 'warning':
      return 'Warning';
    case 'watch':
      return 'Watch';
    default:
      return 'Safe';
  }
}

export default function FieldListRail({
  fields,
  selectedFieldId,
  riskByFieldId,
  onSelect,
  onCreateNew,
}: FieldListRailProps) {
  return (
    <aside className="surface-base flex h-full min-h-[280px] flex-col p-3">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Field Scope</p>
          <h2 className="text-sm font-semibold text-foreground">圃場一覧</h2>
        </div>
        <button
          type="button"
          onClick={onCreateNew}
          className="touch-target rounded-lg border border-border bg-card px-2 py-1 text-xs font-semibold text-foreground hover:border-brand-seedling/50"
        >
          新規
        </button>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {fields.map((field) => {
          const severity = riskByFieldId[field.id] || 'safe';
          const active = selectedFieldId === field.id;
          return (
            <button
              key={field.id}
              type="button"
              onClick={() => onSelect(field.id)}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${active
                ? 'border-brand-waterline/60 bg-brand-waterline/10'
                : 'border-border bg-card hover:border-brand-seedling/40'
                }`}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="truncate text-sm font-semibold text-foreground">{field.name}</p>
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${riskToneClass(severity)}`}>
                  {riskLabel(severity)}
                </span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {field.crop || '作物未設定'} · {field.areaSqm ? `${(field.areaSqm / 10000).toFixed(2)} ha` : '面積未設定'}
              </p>
            </button>
          );
        })}

        {fields.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card px-3 py-4 text-xs text-muted-foreground">
            圃場がまだありません。右上の「新規」から追加してください。
          </div>
        ) : null}
      </div>
    </aside>
  );
}
