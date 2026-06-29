import { describe, expect, it } from 'vitest';
import {
  detectHardwarePerformanceRisk,
  nextSlowPerformanceSamples,
  normalizePerformancePreference,
  performanceLevels,
  performancePreferences,
  resolvePerformanceLevel,
  shouldCountSlowPerformanceMeasure,
} from './performanceMode.js';

describe('performance mode', () => {
  it('normalizes stored preferences', () => {
    expect(normalizePerformancePreference('normal')).toBe(performancePreferences.NORMAL);
    expect(normalizePerformancePreference('performance')).toBe(performancePreferences.PERFORMANCE);
    expect(normalizePerformancePreference('unknown')).toBe(performancePreferences.AUTO);
  });

  it('resolves manual preferences before automatic detection', () => {
    expect(resolvePerformanceLevel('normal', true)).toBe(performanceLevels.NORMAL);
    expect(resolvePerformanceLevel('performance', false)).toBe(performanceLevels.LOW);
    expect(resolvePerformanceLevel('auto', true)).toBe(performanceLevels.LOW);
  });

  it('keeps hardware hints as risk signals, not a direct activation', () => {
    expect(detectHardwarePerformanceRisk({ deviceMemory: 2, hardwareConcurrency: 8, reducedMotion: false })).toBe(true);
    expect(resolvePerformanceLevel('auto', false)).toBe(performanceLevels.NORMAL);
  });

  it('requires several real slow samples before automatic activation', () => {
    const first = nextSlowPerformanceSamples([], 1000, true);
    const second = nextSlowPerformanceSamples(first.samples, 2000, true);
    const third = nextSlowPerformanceSamples(second.samples, 3000, true);

    expect(first.activate).toBe(false);
    expect(second.activate).toBe(false);
    expect(third.activate).toBe(true);
  });

  it('uses cautious thresholds for real app measurements', () => {
    expect(shouldCountSlowPerformanceMeasure('turn', 180, true)).toBe(false);
    expect(shouldCountSlowPerformanceMeasure('turn', 240, true)).toBe(true);
    expect(shouldCountSlowPerformanceMeasure('timerTick', 700, false)).toBe(false);
    expect(shouldCountSlowPerformanceMeasure('timerTick', 1000, false)).toBe(true);
  });
});
