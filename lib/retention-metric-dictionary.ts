export const RETENTION_METRIC_DICTIONARY_VERSION = '2026-02-16.v1';

export const retentionKpiEventRules = {
  project_created: ['projectId', 'flow'],
  schedule_generated: ['projectId', 'flow'],
  task_completed: ['taskId', 'surface'],
  first_task_completed: ['taskId', 'surface'],
  suggestion_lifecycle_suggested: ['suggestionId', 'suggestionType', 'surface'],
  suggestion_lifecycle_accepted: ['suggestionId', 'suggestionType', 'surface'],
} as const;

export type RetentionKpiEventName = keyof typeof retentionKpiEventRules;

export type RetentionMetricDefinition = {
  id: string;
  level: 'north_star' | 'supporting';
  title: string;
  description: string;
  eventDependencies: RetentionKpiEventName[];
  dashboardQueryId: string;
  dashboardQuery: string;
};

export const retentionMetricDictionary = {
  version: RETENTION_METRIC_DICTIONARY_VERSION,
  northStar: {
    id: 'weekly_active_project_managers_with_completed_planned_tasks',
    level: 'north_star',
    title: 'Weekly Active Project Managers with Completed Planned Tasks',
    description: 'Distinct managers with at least one completed planned task in a rolling week.',
    eventDependencies: ['task_completed'] as RetentionKpiEventName[],
    dashboardQueryId: 'retention.north_star.weekly_active_managers',
    dashboardQuery:
      "SELECT week_start, COUNT(DISTINCT user_id) FROM kpi_task_completed_weekly GROUP BY week_start;",
  } satisfies RetentionMetricDefinition,
  supporting: [
    {
      id: 'plan_adherence_ratio',
      level: 'supporting',
      title: 'Plan Adherence Ratio',
      description: 'Completed planned tasks divided by planned tasks generated in the same window.',
      eventDependencies: ['task_completed', 'schedule_generated'],
      dashboardQueryId: 'retention.supporting.plan_adherence_ratio',
      dashboardQuery:
        'SELECT period, completed_tasks::float / NULLIF(planned_tasks, 0) AS adherence FROM kpi_plan_adherence;',
    },
    {
      id: 'suggestion_acceptance_rate',
      level: 'supporting',
      title: 'Suggestion Acceptance Rate',
      description: 'Accepted suggestions divided by suggested items.',
      eventDependencies: ['suggestion_lifecycle_suggested', 'suggestion_lifecycle_accepted'],
      dashboardQueryId: 'retention.supporting.suggestion_acceptance_rate',
      dashboardQuery:
        'SELECT period, accepted::float / NULLIF(suggested, 0) AS acceptance_rate FROM kpi_suggestion_acceptance;',
    },
    {
      id: 'time_to_first_plan_hours',
      level: 'supporting',
      title: 'Time To First Plan (Hours)',
      description: 'Median hours from project creation to first schedule generation.',
      eventDependencies: ['project_created', 'schedule_generated'],
      dashboardQueryId: 'retention.supporting.time_to_first_plan_hours',
      dashboardQuery:
        'SELECT period, percentile_cont(0.5) WITHIN GROUP (ORDER BY hours_to_first_plan) AS median_hours FROM kpi_time_to_first_plan;',
    },
  ] satisfies RetentionMetricDefinition[],
};

export function getAllRetentionMetrics(): RetentionMetricDefinition[] {
  return [retentionMetricDictionary.northStar, ...retentionMetricDictionary.supporting];
}
