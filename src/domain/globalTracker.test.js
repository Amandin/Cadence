import { describe, expect, it } from 'vitest';
import { activeGlobalTrackerThresholds, defaultGlobalTracker, normalizeGlobalTracker, stepAutoGlobalTracker, stepGlobalTracker } from './globalTracker.js';

describe('global tracker', () => {
  it('returns an isolated default tracker', () => {
    const first = defaultGlobalTracker();
    const second = defaultGlobalTracker();

    first.current = 99;
    expect(second.current).toBe(0);
  });

  it('normalizes imported tracker values safely', () => {
    expect(normalizeGlobalTracker({ current: -4, max: 0 })).toMatchObject({ current: 0, max: 1 });
    expect(normalizeGlobalTracker({ current: '3', max: '8' })).toMatchObject({ current: 3, max: 8 });
  });

  it('normalizes and evaluates scene counter thresholds', () => {
    const tracker = normalizeGlobalTracker({
      enabled: true,
      mode: 'clock',
      current: 5,
      max: 10,
      thresholds: [
        { value: 50, basis: 'percent', label: 'mi-course', color: 'amber' },
        { value: 2, basis: 'fromMax', label: 'presque plein', color: 'red' },
      ],
    });

    expect(tracker.thresholds).toHaveLength(2);
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => `${threshold.label}:${threshold.effectiveValue}`)).toEqual(['mi-course:5']);
    expect(activeGlobalTrackerThresholds({ ...tracker, current: 8 }).map((threshold) => `${threshold.label}:${threshold.effectiveValue}`)).toEqual(['presque plein:8']);
  });

  it('uses remaining seconds for timer thresholds', () => {
    const tracker = {
      enabled: true,
      mode: 'timer',
      max: 60,
      elapsedMs: 45000,
      thresholds: [{ value: 20, label: 'bientot fini', color: 'red' }],
    };

    expect(activeGlobalTrackerThresholds(tracker, 1000).map((threshold) => threshold.label)).toEqual(['bientot fini']);
  });

  it('steps manual trackers without going below zero', () => {
    expect(stepGlobalTracker({ current: 1, max: 6 }, -5).current).toBe(0);
    expect(stepGlobalTracker({ current: 1, max: 6 }, 2).current).toBe(3);
  });

  it('auto-steps only enabled automatic trackers', () => {
    const enabledAuto = { enabled: true, auto: true, current: 1, max: 6 };
    const disabledAuto = { enabled: false, auto: true, current: 1, max: 6 };
    const enabledManual = { enabled: true, auto: false, current: 1, max: 6 };

    expect(stepAutoGlobalTracker(enabledAuto, 1).current).toBe(2);
    expect(stepAutoGlobalTracker(disabledAuto, 1)).toBe(disabledAuto);
    expect(stepAutoGlobalTracker(enabledManual, 1)).toBe(enabledManual);
  });
});
