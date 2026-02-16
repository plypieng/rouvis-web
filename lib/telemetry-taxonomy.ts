import { retentionKpiEventRules } from '@/lib/retention-metric-dictionary';

export type PrimitiveValue = string | number | boolean | null;
export type TelemetryProperties = Record<string, PrimitiveValue>;

export const suggestionLifecycleEventRules = {
  suggestion_lifecycle_suggested: ['suggestionId', 'suggestionType', 'surface'],
  suggestion_lifecycle_accepted: ['suggestionId', 'suggestionType', 'surface'],
  suggestion_lifecycle_edited: ['suggestionId', 'suggestionType', 'surface', 'editKind'],
  suggestion_lifecycle_rejected: ['suggestionId', 'suggestionType', 'surface', 'reason'],
  suggestion_lifecycle_completed: ['suggestionId', 'suggestionType', 'surface', 'taskId'],
  suggestion_lifecycle_slipped: ['suggestionId', 'suggestionType', 'surface', 'taskId'],
} as const;

export type SuggestionLifecycleEventName = keyof typeof suggestionLifecycleEventRules;

const telemetryEventRules = {
  ...suggestionLifecycleEventRules,
  ...retentionKpiEventRules,
} as const;

type TelemetryEventName = keyof typeof telemetryEventRules;

function isNonEmptyString(value: PrimitiveValue | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTelemetryEventName(event: string): event is TelemetryEventName {
  return Object.prototype.hasOwnProperty.call(telemetryEventRules, event);
}

export function validateTelemetryEventShape(event: string, properties: TelemetryProperties): {
  valid: boolean;
  error?: string;
} {
  if (!isTelemetryEventName(event)) {
    return { valid: true };
  }

  const requiredKeys = telemetryEventRules[event];
  const missingKeys = requiredKeys.filter((key) => !isNonEmptyString(properties[key]));
  if (missingKeys.length > 0) {
    return {
      valid: false,
      error: `Missing required telemetry properties: ${missingKeys.join(', ')}`,
    };
  }

  return { valid: true };
}
