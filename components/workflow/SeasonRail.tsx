import type { CropStage, RiskTone, SeasonRailProps } from '@/types/ui-shell';

const stageLabels: Record<CropStage, string> = {
  dormant: 'Dormant',
  seedling: 'Seedling',
  vegetative: 'Vegetative',
  flowering: 'Flowering',
  ripening: 'Ripening',
  harvest: 'Harvest',
};

const riskToneClass: Record<RiskTone, string> = {
  safe: 'status-safe',
  watch: 'status-watch',
  warning: 'status-warning',
  critical: 'status-critical',
};

function milestoneClass(state: 'upcoming' | 'current' | 'done'): string {
  if (state === 'done') {
    return 'border-emerald-300 bg-emerald-100/70 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100';
  }

  if (state === 'current') {
    return 'border-brand-seedling/60 bg-brand-seedling/15 text-foreground';
  }

  return 'border-border/80 bg-background/70 text-muted-foreground';
}

export function SeasonRail({ state, orientation = 'horizontal', className }: SeasonRailProps) {
  const completion = Math.max(0, Math.min(100, state.completion));

  if (orientation === 'vertical') {
    return (
      <aside className={`surface-base p-4 ${className || ''}`} aria-label="Season rail">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Season Rail</p>
            <h3 className="text-base font-semibold text-foreground">{stageLabels[state.stage]}</h3>
          </div>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskToneClass[state.risk]}`}>
            {state.risk}
          </span>
        </div>

        <div className="mb-3 rounded-lg border border-border/70 bg-background/60 p-3">
          <p className="text-sm font-medium text-foreground">{state.dayLabel}</p>
          {state.windowLabel ? <p className="text-xs text-muted-foreground">{state.windowLabel}</p> : null}
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-brand-seedling transition-[width] duration-300" style={{ width: `${completion}%` }} />
          </div>
        </div>

        <ol className="space-y-2">
          {state.milestones.map((milestone) => (
            <li key={milestone.id} className={`rounded-lg border px-3 py-2 text-xs ${milestoneClass(milestone.state)}`}>
              <p className="font-semibold">{milestone.label}</p>
              <p className="mt-0.5 uppercase tracking-[0.08em] opacity-80">{stageLabels[milestone.stage]}</p>
              {milestone.note ? <p className="mt-1 opacity-90">{milestone.note}</p> : null}
            </li>
          ))}
        </ol>

        {state.note ? <p className="mt-3 text-xs text-muted-foreground">{state.note}</p> : null}
      </aside>
    );
  }

  return (
    <section className={`surface-base p-4 ${className || ''}`} aria-label="Season rail">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">Season Rail</p>
          <p className="text-sm font-semibold text-foreground">{stageLabels[state.stage]} · {state.dayLabel}</p>
          {state.windowLabel ? <p className="text-xs text-muted-foreground">{state.windowLabel}</p> : null}
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${riskToneClass[state.risk]}`}>{state.risk}</span>
      </div>

      <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand-seedling transition-[width] duration-300" style={{ width: `${completion}%` }} />
      </div>

      <ol className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {state.milestones.map((milestone) => (
          <li key={milestone.id} className={`rounded-lg border px-2.5 py-2 ${milestoneClass(milestone.state)}`}>
            <p className="font-semibold">{milestone.label}</p>
            <p className="mt-0.5 uppercase tracking-[0.08em] opacity-80">{stageLabels[milestone.stage]}</p>
          </li>
        ))}
      </ol>

      {state.note ? <p className="mt-2 text-xs text-muted-foreground">{state.note}</p> : null}
    </section>
  );
}
