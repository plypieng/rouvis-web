'use client';

import { Fragment } from 'react';

export type YieldUnit = 't_per_ha' | 'kg_total';
export type RiskTolerance = 'conservative' | 'balanced' | 'aggressive';
export type IrrigationStyle = 'manual' | 'reminder' | 'strict';

export type ScheduleConstraintTemplate = {
  id: string;
  status?: 'active' | 'coming_soon';
  label: string;
  description: string;
  preferences: Record<string, unknown>;
};

export type YieldRecommendation = {
  value: number;
  unit: YieldUnit;
  min: number;
  max: number;
  environment: 'open_field' | 'greenhouse' | 'home_pot';
  rationale: string;
};

export type ScheduleConstraintAdvanced = {
  preferredWorkStartHour: number;
  preferredWorkEndHour: number;
  maxTasksPerDay: number;
  avoidWeekdays: number[];
  riskTolerance: RiskTolerance;
  irrigationStyle: IrrigationStyle;
  constraintsNote: string;
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DEFAULT_ADVANCED: ScheduleConstraintAdvanced = {
  preferredWorkStartHour: 6,
  preferredWorkEndHour: 18,
  maxTasksPerDay: 4,
  avoidWeekdays: [],
  riskTolerance: 'balanced',
  irrigationStyle: 'reminder',
  constraintsNote: '',
};

function asNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function parsePositiveNumber(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export function yieldUnitLabel(unit: YieldUnit): string {
  return unit === 'kg_total' ? 'kg total' : 't/ha';
}

export function normalizeAdvancedConstraints(input?: Partial<ScheduleConstraintAdvanced> | null): ScheduleConstraintAdvanced {
  const startRaw = asNumber(input?.preferredWorkStartHour);
  const start = startRaw == null ? DEFAULT_ADVANCED.preferredWorkStartHour : Math.max(0, Math.min(23, Math.round(startRaw)));

  const endRaw = asNumber(input?.preferredWorkEndHour);
  let end = endRaw == null ? DEFAULT_ADVANCED.preferredWorkEndHour : Math.max(1, Math.min(24, Math.round(endRaw)));
  if (end <= start) {
    end = Math.min(24, start + 1);
  }

  const maxRaw = asNumber(input?.maxTasksPerDay);
  const maxTasksPerDay = maxRaw == null ? DEFAULT_ADVANCED.maxTasksPerDay : Math.max(1, Math.min(12, Math.round(maxRaw)));

  const avoidWeekdays = Array.isArray(input?.avoidWeekdays)
    ? [...new Set(input.avoidWeekdays)]
      .filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6)
      .sort((a, b) => a - b)
    : [];

  const riskTolerance = input?.riskTolerance === 'conservative' || input?.riskTolerance === 'aggressive'
    ? input.riskTolerance
    : 'balanced';

  const irrigationStyle = input?.irrigationStyle === 'manual' || input?.irrigationStyle === 'strict'
    ? input.irrigationStyle
    : 'reminder';

  return {
    preferredWorkStartHour: start,
    preferredWorkEndHour: end,
    maxTasksPerDay,
    avoidWeekdays,
    riskTolerance,
    irrigationStyle,
    constraintsNote: (input?.constraintsNote || '').trim().slice(0, 300),
  };
}

export function advancedConstraintsFromTemplate(
  template?: Pick<ScheduleConstraintTemplate, 'preferences'> | null
): ScheduleConstraintAdvanced {
  if (!template?.preferences || typeof template.preferences !== 'object') {
    return { ...DEFAULT_ADVANCED };
  }

  const prefs = template.preferences as Record<string, unknown>;

  return normalizeAdvancedConstraints({
    preferredWorkStartHour: asNumber(prefs.preferredWorkStartHour) ?? undefined,
    preferredWorkEndHour: asNumber(prefs.preferredWorkEndHour) ?? undefined,
    maxTasksPerDay: asNumber(prefs.maxTasksPerDay) ?? undefined,
    avoidWeekdays: Array.isArray(prefs.avoidWeekdays) ? prefs.avoidWeekdays as number[] : undefined,
    riskTolerance: prefs.riskTolerance as RiskTolerance | undefined,
    irrigationStyle: prefs.irrigationStyle as IrrigationStyle | undefined,
    constraintsNote: typeof prefs.constraintsNote === 'string' ? prefs.constraintsNote : '',
  });
}

function cleanRecord(record: Record<string, unknown>): Record<string, unknown> | undefined {
  const cleaned = Object.fromEntries(
    Object.entries(record).filter(([, value]) => {
      if (typeof value === 'undefined') return false;
      if (value === null) return false;
      if (typeof value === 'string' && value.trim().length === 0) return false;
      if (Array.isArray(value) && value.length === 0) return false;
      return true;
    })
  );

  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function buildSchedulingPreferencesPayload(params: {
  template?: ScheduleConstraintTemplate | null;
  advanced: ScheduleConstraintAdvanced;
  preferredYieldInput: string;
  preferredYieldUnit: YieldUnit;
  yieldRecommendation?: YieldRecommendation | null;
}): Record<string, unknown> | undefined {
  const base = params.template?.preferences && typeof params.template.preferences === 'object'
    ? { ...params.template.preferences as Record<string, unknown> }
    : {};

  const advanced = normalizeAdvancedConstraints(params.advanced);
  const explicitYield = parsePositiveNumber(params.preferredYieldInput);
  const fallbackYield = params.yieldRecommendation?.value;
  const resolvedYieldValue = explicitYield ?? fallbackYield ?? null;

  const merged: Record<string, unknown> = {
    ...base,
    preferredWorkStartHour: advanced.preferredWorkStartHour,
    preferredWorkEndHour: advanced.preferredWorkEndHour,
    maxTasksPerDay: advanced.maxTasksPerDay,
    avoidWeekdays: advanced.avoidWeekdays,
    riskTolerance: advanced.riskTolerance,
    irrigationStyle: advanced.irrigationStyle,
    constraintsNote: advanced.constraintsNote,
  };

  if (resolvedYieldValue != null) {
    merged.targetYieldValue = round(resolvedYieldValue, 1);
    merged.targetYieldUnit = params.preferredYieldUnit;
  }

  if (params.yieldRecommendation) {
    merged.targetYieldRecommended = params.yieldRecommendation.value;
    merged.targetYieldMin = params.yieldRecommendation.min;
    merged.targetYieldMax = params.yieldRecommendation.max;
    merged.targetYieldEnvironment = params.yieldRecommendation.environment;
    if (!merged.targetYieldUnit) {
      merged.targetYieldUnit = params.yieldRecommendation.unit;
    }
  }

  return cleanRecord(merged);
}

interface ScheduleConstraintFormProps {
  templates: ScheduleConstraintTemplate[];
  templatesLoading?: boolean;
  templatesError?: string | null;
  recommendedTemplateId?: string | null;
  selectedTemplateId: string | null;
  onSelectTemplate: (templateId: string) => void;
  preferredYieldInput: string;
  preferredYieldUnit: YieldUnit;
  onChangeYieldInput: (value: string) => void;
  onChangeYieldUnit: (value: YieldUnit) => void;
  yieldRecommendation?: YieldRecommendation | null;
  hasInvalidYieldInput?: boolean;
  onApplyRecommendedYield?: () => void;
  advanced: ScheduleConstraintAdvanced;
  onChangeAdvanced: (next: ScheduleConstraintAdvanced) => void;
  showAdvanced: boolean;
  onChangeShowAdvanced: (show: boolean) => void;
}

function toggleAvoidWeekday(current: number[], day: number): number[] {
  if (current.includes(day)) {
    return current.filter((value) => value !== day);
  }
  return [...current, day].sort((left, right) => left - right);
}

export default function ScheduleConstraintForm({
  templates,
  templatesLoading = false,
  templatesError = null,
  recommendedTemplateId = null,
  selectedTemplateId,
  onSelectTemplate,
  preferredYieldInput,
  preferredYieldUnit,
  onChangeYieldInput,
  onChangeYieldUnit,
  yieldRecommendation,
  hasInvalidYieldInput = false,
  onApplyRecommendedYield,
  advanced,
  onChangeAdvanced,
  showAdvanced,
  onChangeShowAdvanced,
}: ScheduleConstraintFormProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className="surface-base p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Planning template</h3>
          <p className="text-xs text-muted-foreground">Select a base strategy before generating the schedule.</p>
        </div>

        {templatesLoading ? <p className="text-xs text-muted-foreground">Loading templates...</p> : null}
        {!templatesLoading && templatesError ? (
          <p className="text-xs text-orange-700">{templatesError}</p>
        ) : null}

        {!templatesLoading && templates.length > 0 ? (
          <div className="space-y-2">
            {templates.map((template) => {
              const isActive = (template.status ?? 'active') === 'active';
              const selected = isActive && template.id === selectedTemplateId;
              const recommended = isActive && template.id === recommendedTemplateId;

              return (
                <button
                  key={template.id}
                  type="button"
                  disabled={!isActive}
                  onClick={() => {
                    if (!isActive) return;
                    onSelectTemplate(template.id);
                  }}
                  className={`w-full rounded-lg border px-3 py-3 text-left transition ${isActive
                    ? selected
                      ? 'border-brand-seedling/75 bg-brand-seedling/10'
                      : 'border-border bg-card hover:border-brand-seedling/50'
                    : 'border-border/60 bg-secondary/20 opacity-55'
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{template.label}</span>
                    <span className="flex items-center gap-1.5">
                      {recommended ? (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">Recommended</span>
                      ) : null}
                      {!isActive ? (
                        <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">Coming soon</span>
                      ) : null}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{template.description}</p>
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="surface-base p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-foreground">Target yield</h3>
          <p className="text-xs text-muted-foreground">Use a recommendation or override it with your own goal.</p>
        </div>

        {yieldRecommendation ? (
          <div className="rounded-lg border border-brand-waterline/35 bg-brand-waterline/10 px-3 py-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Recommended</p>
            <p className="text-lg font-semibold text-foreground">
              {yieldRecommendation.value} {yieldUnitLabel(yieldRecommendation.unit)}
            </p>
            <p className="text-xs text-muted-foreground">
              Range: {yieldRecommendation.min} - {yieldRecommendation.max} {yieldUnitLabel(yieldRecommendation.unit)}
            </p>
            <p className="text-xs text-muted-foreground">{yieldRecommendation.rationale}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-3 text-xs text-muted-foreground">
            Select fields to get a recommendation.
          </div>
        )}

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-[1fr_160px]">
          <input
            type="number"
            min={0}
            step={0.1}
            inputMode="decimal"
            value={preferredYieldInput}
            onChange={(event) => onChangeYieldInput(event.target.value)}
            placeholder={yieldRecommendation ? String(yieldRecommendation.value) : 'Ex: 5.0'}
            className="control-inset w-full px-3 py-2 text-sm"
          />
          <select
            value={preferredYieldUnit}
            onChange={(event) => onChangeYieldUnit(event.target.value as YieldUnit)}
            className="control-inset w-full px-3 py-2 text-sm"
          >
            <option value="t_per_ha">t/ha</option>
            <option value="kg_total">kg total</option>
          </select>
        </div>

        {hasInvalidYieldInput ? (
          <p className="mt-2 text-xs font-medium text-red-700">Target yield must be a positive number.</p>
        ) : null}

        {yieldRecommendation && onApplyRecommendedYield ? (
          <button
            type="button"
            onClick={onApplyRecommendedYield}
            className="mt-2 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/60"
          >
            Use recommendation
          </button>
        ) : null}
      </section>

      <section className="surface-base p-4 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Advanced constraints</h3>
            <p className="text-xs text-muted-foreground">Optional controls for working window, volume, and risk style.</p>
          </div>
          <button
            type="button"
            onClick={() => onChangeShowAdvanced(!showAdvanced)}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary/60"
          >
            {showAdvanced ? 'Hide' : 'Show'}
          </button>
        </div>

        {showAdvanced ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="text-xs font-medium text-muted-foreground">
                Start hour
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={advanced.preferredWorkStartHour}
                  onChange={(event) => onChangeAdvanced(normalizeAdvancedConstraints({
                    ...advanced,
                    preferredWorkStartHour: Number(event.target.value),
                  }))}
                  className="control-inset mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                End hour
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={advanced.preferredWorkEndHour}
                  onChange={(event) => onChangeAdvanced(normalizeAdvancedConstraints({
                    ...advanced,
                    preferredWorkEndHour: Number(event.target.value),
                  }))}
                  className="control-inset mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Max tasks / day
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={advanced.maxTasksPerDay}
                  onChange={(event) => onChangeAdvanced(normalizeAdvancedConstraints({
                    ...advanced,
                    maxTasksPerDay: Number(event.target.value),
                  }))}
                  className="control-inset mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground">Avoid weekdays</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((label, day) => {
                  const active = advanced.avoidWeekdays.includes(day);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => onChangeAdvanced({
                        ...advanced,
                        avoidWeekdays: toggleAvoidWeekday(advanced.avoidWeekdays, day),
                      })}
                      className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${active
                        ? 'border-brand-seedling/70 bg-brand-seedling/12 text-foreground'
                        : 'border-border bg-card text-muted-foreground hover:bg-secondary'
                        }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-xs font-medium text-muted-foreground">
                Risk tolerance
                <select
                  value={advanced.riskTolerance}
                  onChange={(event) => onChangeAdvanced({
                    ...advanced,
                    riskTolerance: event.target.value as RiskTolerance,
                  })}
                  className="control-inset mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="conservative">Conservative</option>
                  <option value="balanced">Balanced</option>
                  <option value="aggressive">Aggressive</option>
                </select>
              </label>
              <label className="text-xs font-medium text-muted-foreground">
                Irrigation style
                <select
                  value={advanced.irrigationStyle}
                  onChange={(event) => onChangeAdvanced({
                    ...advanced,
                    irrigationStyle: event.target.value as IrrigationStyle,
                  })}
                  className="control-inset mt-1 w-full px-3 py-2 text-sm"
                >
                  <option value="manual">Manual</option>
                  <option value="reminder">Reminder</option>
                  <option value="strict">Strict</option>
                </select>
              </label>
            </div>

            <label className="block text-xs font-medium text-muted-foreground">
              Extra note
              <textarea
                value={advanced.constraintsNote}
                onChange={(event) => onChangeAdvanced({
                  ...advanced,
                  constraintsNote: event.target.value.slice(0, 300),
                })}
                rows={3}
                className="control-inset mt-1 w-full px-3 py-2 text-sm"
                placeholder="Example: avoid late evening tasks when wind is strong"
              />
            </label>
          </div>
        ) : null}
      </section>

      {templates.length === 0 && !templatesLoading ? (
        <Fragment>
          {/* keep layout stable when template API is temporarily empty */}
        </Fragment>
      ) : null}
    </div>
  );
}
