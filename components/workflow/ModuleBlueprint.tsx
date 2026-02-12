import type { ModuleBlueprintProps } from '@/types/ui-shell';

const toneClass = {
  safe: 'status-safe',
  watch: 'status-watch',
  warning: 'status-warning',
  critical: 'status-critical',
} as const;

export function ModuleBlueprint({ title, description, tone = 'watch', icon, action }: ModuleBlueprintProps) {
  return (
    <div className="surface-base p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
        {icon || <span className="text-lg" aria-hidden="true">+</span>}
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <p className={`mx-auto mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}>{tone}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
