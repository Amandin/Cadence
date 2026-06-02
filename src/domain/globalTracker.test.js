import { describe, expect, it } from 'vitest';
import { activeGlobalTrackerThresholds, defaultGlobalTracker, globalTrackerDisplayValue, globalTrackerTimerState, normalizeGlobalTracker, stepAutoGlobalTracker, stepGlobalTracker } from './globalTracker.js';

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

  it('supports timer percent thresholds against remaining time', () => {
    const tracker = {
      enabled: true,
      mode: 'timer',
      max: 100,
      elapsedMs: 80000,
      thresholds: [{ value: 25, basis: 'percent', label: 'Urgence', operator: 'lte' }],
    };

    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Urgence']);
  });

  it('keeps overrun timers eligible for remaining-time thresholds', () => {
    const tracker = {
      enabled: true,
      mode: 'timer',
      max: 100,
      limitMode: 'overflow',
      elapsedMs: 110000,
      thresholds: [
        { value: 25, basis: 'percent', label: 'Urgence', operator: 'lte' },
        { value: 10, label: 'Derniere chance', operator: 'lte' },
      ],
    };

    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Derniere chance']);
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

  it('keeps historical phase triggers dormant', () => {
    const tracker = { enabled: true, trigger: 'phase', direction: 'countdown', current: 3, total: 3, max: 6 };

    expect(stepAutoGlobalTracker(tracker, 1, 'round')).toBe(tracker);
    expect(stepAutoGlobalTracker(tracker, 1, 'phase')).toBe(tracker);
  });

  it('keeps looped clocks current in cycle while thresholds can read total progress', () => {
    const tracker = stepGlobalTracker({
      enabled: true,
      mode: 'clock',
      current: 5,
      total: 5,
      max: 6,
      limitMode: 'loop',
      thresholds: [{ value: 6, label: 'Alarme', scope: 'total' }, { value: 12, label: 'Renforts', scope: 'total' }],
    }, 7);

    expect(tracker).toMatchObject({ current: 6, total: 12, loops: 2 });
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Renforts']);
  });

  it('lets looped clock thresholds read loop count', () => {
    const tracker = stepGlobalTracker({
      enabled: true,
      mode: 'clock',
      current: 5,
      total: 5,
      max: 6,
      limitMode: 'loop',
      thresholds: [{ value: 2, label: 'Deux boucles', scope: 'loops' }],
    }, 7);

    expect(tracker).toMatchObject({ loops: 2 });
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Deux boucles']);
  });

  it('lets timers stop, overrun, or restart at their limit', () => {
    const stopped = { enabled: true, mode: 'timer', max: 60, limitMode: 'clamp', elapsedMs: 75000 };
    const overflowing = { ...stopped, limitMode: 'overflow' };
    const restarting = { ...stopped, limitMode: 'restart' };
    const looping = { ...stopped, limitMode: 'loop' };

    expect(globalTrackerDisplayValue(stopped)).toBe(0);
    expect(globalTrackerDisplayValue(overflowing)).toBe(15);
    expect(globalTrackerTimerState(restarting)).toMatchObject({ remainingSeconds: 45, loops: 1, complete: true });
    expect(globalTrackerTimerState(looping)).toMatchObject({ remainingSeconds: 45, loops: 1, complete: true });
  });

  it('lets looped timer thresholds read loop count', () => {
    const tracker = {
      enabled: true,
      mode: 'timer',
      max: 60,
      limitMode: 'loop',
      elapsedMs: 155000,
      thresholds: [
        { value: 30, label: 'Cycle courant', scope: 'current', operator: 'lte', color: 'amber' },
        { value: 2, label: 'Deux cycles', scope: 'loops', operator: 'gte' },
      ],
    };

    expect(globalTrackerTimerState(tracker)).toMatchObject({ remainingSeconds: 25, loops: 2 });
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Cycle courant', 'Deux cycles']);
  });

  it('keeps <= thresholds active inside a looped timer cycle', () => {
    const tracker = {
      enabled: true,
      mode: 'timer',
      max: 60,
      limitMode: 'loop',
      elapsedMs: 95000,
      thresholds: [{ value: 30, label: 'Fin de cycle', scope: 'current', operator: 'lte' }],
    };

    expect(globalTrackerTimerState(tracker)).toMatchObject({ remainingSeconds: 25, loops: 1 });
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Fin de cycle']);
  });

  it('keeps looped clock thresholds active on cycle and loop count together', () => {
    const tracker = stepGlobalTracker({
      enabled: true,
      mode: 'clock',
      current: 5,
      total: 5,
      max: 6,
      limitMode: 'loop',
      thresholds: [
        { value: 4, label: 'Cycle avance', scope: 'current', operator: 'gte', color: 'amber' },
        { value: 2, label: 'Deux boucles', scope: 'loops', operator: 'gte', color: 'red' },
      ],
    }, 7);

    expect(tracker).toMatchObject({ current: 6, loops: 2 });
    expect(activeGlobalTrackerThresholds(tracker).map((threshold) => threshold.label)).toEqual(['Cycle avance', 'Deux boucles']);
  });
});
