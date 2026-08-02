import { describe, expect, it } from 'vitest';
import {
  focusedPollingCap,
  jitterPollDelay,
  nextUnchangedPollDelay,
  pollDelayAfterChange,
  retryPollDelay,
  streamPollingPolicy,
} from './adaptivePolling.js';

const MINUTE = 60_000;

describe('adaptive stream polling policy', () => {
  it('moves smoothly from focused activity to focused quasi-sleep', () => {
    expect(focusedPollingCap(0)).toBe(12_000);
    expect(focusedPollingCap(2 * MINUTE)).toBe(12_000);
    expect(focusedPollingCap(6 * MINUTE)).toBe(21_000);
    expect(focusedPollingCap(8 * MINUTE)).toBeGreaterThan(26_000);
    expect(focusedPollingCap(10 * MINUTE)).toBe(30_000);
  });

  it('distinguishes focused, recently hovered, idle, suspended, and hidden windows', () => {
    const now = 20 * MINUTE;
    const common = { now, lastActivityAt: 10 * MINUTE, lastChangeAt: 10 * MINUTE };

    expect(streamPollingPolicy({ ...common, visible: true, focused: true, lastPointerAt: 0 })).toMatchObject({
      mode: 'quiescent', capMs: 30_000, suspended: false,
    });
    expect(streamPollingPolicy({ ...common, visible: true, focused: false, lastPointerAt: now - MINUTE })).toMatchObject({
      mode: 'attentive', capMs: 20_000, suspended: false,
    });
    expect(streamPollingPolicy({ ...common, visible: true, focused: false, lastPointerAt: now - (3 * MINUTE), lastChangeAt: now - (9 * MINUTE) })).toMatchObject({
      mode: 'idle', capMs: 45_000, suspended: false,
    });
    expect(streamPollingPolicy({ ...common, visible: true, focused: false, lastPointerAt: 0 })).toMatchObject({
      mode: 'suspended', suspended: true,
    });
    expect(streamPollingPolicy({ ...common, visible: false, focused: false, lastPointerAt: now })).toMatchObject({
      mode: 'hidden', suspended: true,
    });
  });

  it('ramps unchanged responses without crossing the attention cap', () => {
    expect(nextUnchangedPollDelay(3_000, 12_000)).toBe(5_000);
    expect(nextUnchangedPollDelay(8_000, 12_000)).toBe(12_000);
    expect(nextUnchangedPollDelay(12_000, 20_000)).toBe(15_000);
    expect(nextUnchangedPollDelay(18_000, 20_000)).toBe(20_000);
  });

  it('uses update age and the previous update gap instead of always returning to three seconds', () => {
    const serverTime = '2026-07-31T12:10:00.000Z';
    const delay = (updatedAt, previousUpdatedAt, revisionDelta = 1, capMs = 45_000) => pollDelayAfterChange({
      serverTime, updatedAt, previousUpdatedAt, revisionDelta, capMs,
    }).delayMs;

    expect(delay('2026-07-31T12:09:55.000Z', '2026-07-31T12:09:47.000Z')).toBe(3_000);
    expect(delay('2026-07-31T12:09:55.000Z', '2026-07-31T12:00:00.000Z')).toBe(5_000);
    expect(delay('2026-07-31T12:09:40.000Z', '2026-07-31T12:09:20.000Z')).toBe(5_000);
    expect(delay('2026-07-31T12:08:45.000Z', '2026-07-31T12:08:00.000Z')).toBe(8_000);
    expect(delay('2026-07-31T12:02:00.000Z', '2026-07-31T12:01:00.000Z')).toBe(20_000);
    expect(delay('2026-07-31T11:55:00.000Z', '2026-07-31T11:54:50.000Z')).toBe(45_000);
    expect(delay('2026-07-31T12:09:55.000Z', null, 3)).toBe(3_000);
  });

  it('backs off network failures and applies bounded jitter', () => {
    expect([1, 2, 3, 4, 5, 9].map((count) => retryPollDelay(count))).toEqual([5_000, 10_000, 20_000, 40_000, 60_000, 60_000]);
    expect(jitterPollDelay(10_000, () => 0)).toBe(9_000);
    expect(jitterPollDelay(10_000, () => 0.5)).toBe(10_000);
    expect(jitterPollDelay(10_000, () => 1)).toBe(11_000);
  });
});
