import { describe, expect, it } from 'vitest';
import {
  advancedConstraintsFromTemplate,
  buildSchedulingPreferencesPayload,
  normalizeAdvancedConstraints,
  parsePositiveNumber,
} from './ScheduleConstraintForm';

describe('ScheduleConstraintForm helpers', () => {
  it('parses positive numeric input safely', () => {
    expect(parsePositiveNumber('5.4')).toBe(5.4);
    expect(parsePositiveNumber('0')).toBeNull();
    expect(parsePositiveNumber('abc')).toBeNull();
  });

  it('derives and normalizes advanced values from template payload', () => {
    const advanced = advancedConstraintsFromTemplate({
      preferences: {
        preferredWorkStartHour: 7,
        preferredWorkEndHour: 19,
        maxTasksPerDay: 5,
        avoidWeekdays: [0, 0, 6],
        riskTolerance: 'aggressive',
        irrigationStyle: 'manual',
        constraintsNote: ' note ',
      },
    });

    expect(advanced).toEqual({
      preferredWorkStartHour: 7,
      preferredWorkEndHour: 19,
      maxTasksPerDay: 5,
      avoidWeekdays: [0, 6],
      riskTolerance: 'aggressive',
      irrigationStyle: 'manual',
      constraintsNote: 'note',
    });
  });

  it('serializes merged scheduling preferences with template + advanced + yield', () => {
    const advanced = normalizeAdvancedConstraints({
      preferredWorkStartHour: 6,
      preferredWorkEndHour: 17,
      maxTasksPerDay: 4,
      avoidWeekdays: [2, 5],
      riskTolerance: 'balanced',
      irrigationStyle: 'reminder',
      constraintsNote: 'avoid windy evenings',
    });

    const payload = buildSchedulingPreferencesPayload({
      template: {
        id: 'conservative-weather',
        label: 'Conservative weather',
        description: 'desc',
        preferences: {
          schedulerQueueMode: 'steer',
        },
      },
      advanced,
      preferredYieldInput: '6.2',
      preferredYieldUnit: 't_per_ha',
      yieldRecommendation: {
        value: 5.8,
        unit: 't_per_ha',
        min: 4.9,
        max: 6.7,
        environment: 'open_field',
        rationale: 'area weighted',
      },
    });

    expect(payload).toMatchObject({
      schedulerQueueMode: 'steer',
      preferredWorkStartHour: 6,
      preferredWorkEndHour: 17,
      maxTasksPerDay: 4,
      avoidWeekdays: [2, 5],
      riskTolerance: 'balanced',
      irrigationStyle: 'reminder',
      constraintsNote: 'avoid windy evenings',
      targetYieldValue: 6.2,
      targetYieldUnit: 't_per_ha',
      targetYieldRecommended: 5.8,
      targetYieldMin: 4.9,
      targetYieldMax: 6.7,
      targetYieldEnvironment: 'open_field',
    });
  });
});
