'use client';

import { trackUXEvent, type UXEventProperties } from '@/lib/analytics';
import type { SuggestionLifecycleEventName } from '@/lib/telemetry-taxonomy';

type SuggestionLifecycleBase = {
  suggestionId: string;
  suggestionType: string;
  surface: string;
  projectId?: string;
  affectedTasks?: number;
  riskTone?: string;
};

function withBaseProperties(
  params: SuggestionLifecycleBase,
  extra: UXEventProperties = {}
): UXEventProperties {
  return {
    suggestionId: params.suggestionId,
    suggestionType: params.suggestionType,
    surface: params.surface,
    projectId: params.projectId || null,
    affectedTasks: typeof params.affectedTasks === 'number' ? params.affectedTasks : null,
    riskTone: params.riskTone || null,
    ...extra,
  };
}

async function trackSuggestionLifecycleEvent(
  event: SuggestionLifecycleEventName,
  properties: UXEventProperties
): Promise<void> {
  await trackUXEvent(event, properties);
}

export function trackSuggestionSuggested(params: SuggestionLifecycleBase): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_suggested',
    withBaseProperties(params)
  );
}

export function trackSuggestionAccepted(params: SuggestionLifecycleBase): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_accepted',
    withBaseProperties(params)
  );
}

export function trackSuggestionEdited(
  params: SuggestionLifecycleBase & { editKind: string }
): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_edited',
    withBaseProperties(params, {
      editKind: params.editKind,
    })
  );
}

export function trackSuggestionRejected(
  params: SuggestionLifecycleBase & { reason: string }
): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_rejected',
    withBaseProperties(params, {
      reason: params.reason,
    })
  );
}

export function trackSuggestionCompleted(
  params: SuggestionLifecycleBase & { taskId: string }
): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_completed',
    withBaseProperties(params, {
      taskId: params.taskId,
    })
  );
}

export function trackSuggestionSlipped(
  params: SuggestionLifecycleBase & { taskId: string; reason?: string }
): Promise<void> {
  return trackSuggestionLifecycleEvent(
    'suggestion_lifecycle_slipped',
    withBaseProperties(params, {
      taskId: params.taskId,
      reason: params.reason || null,
    })
  );
}
