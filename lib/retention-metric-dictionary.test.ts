import { describe, expect, it } from 'vitest';

import {
  getAllRetentionMetrics,
  retentionKpiEventRules,
  retentionMetricDictionary,
  RETENTION_METRIC_DICTIONARY_VERSION,
} from './retention-metric-dictionary';

describe('retention metric dictionary', () => {
  it('is versioned and keeps the expected north-star identifier', () => {
    expect(retentionMetricDictionary.version).toBe(RETENTION_METRIC_DICTIONARY_VERSION);
    expect(retentionMetricDictionary.northStar.id).toBe(
      'weekly_active_project_managers_with_completed_planned_tasks',
    );
  });

  it('maps each metric to dashboard query ids and required event dependencies', () => {
    const metrics = getAllRetentionMetrics();
    expect(metrics.length).toBeGreaterThanOrEqual(4);

    for (const metric of metrics) {
      expect(metric.dashboardQueryId.length).toBeGreaterThan(0);
      expect(metric.dashboardQuery.length).toBeGreaterThan(0);
      expect(metric.eventDependencies.length).toBeGreaterThan(0);
      for (const dependency of metric.eventDependencies) {
        expect(retentionKpiEventRules[dependency]).toBeTruthy();
      }
    }
  });
});
