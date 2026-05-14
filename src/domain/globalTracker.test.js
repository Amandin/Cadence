import { describe, expect, it } from 'vitest';
import { defaultGlobalTracker, normalizeGlobalTracker, stepAutoGlobalTracker, stepGlobalTracker } from './globalTracker.js';

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
