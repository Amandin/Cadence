import { describe, expect, it } from 'vitest';
import { applyDelta, boxGroups, newTracker, resetAutoTrackers } from './logic.js';

describe('trackers updated behavior', () => {
  it('uses sorted boxes by default', () => {
    const tracker = newTracker('boxes');
    expect(tracker).toMatchObject({ type: 'boxes', boxMode: 'sorted', rows: [] });
    expect(boxGroups(tracker)[0].rows[0].marks).toEqual([0, 0, 0, 0]);
  });

  it('runs clock automation through activation reset', () => {
    const participant = { trackers: [{ type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }] };
    const first = resetAutoTrackers(participant, 'activation');
    const second = resetAutoTrackers(first, 'activation');
    expect(first.trackers[0].current).toBe(1);
    expect(second.trackers[0].current).toBe(1);
  });

  it('runs round clocks only on the round trigger', () => {
    const participant = { trackers: [{ type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }] };
    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(0);
    expect(resetAutoTrackers(participant, 'round').trackers[0].current).toBe(1);
  });

  it('keeps point cycles driven by actual looping', () => {
    expect(applyDelta({ type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 0 }, 1)).toMatchObject({ current: 0, cycles: 1 });
  });

  it('keeps point loop remainders with steps greater than one', () => {
    const tracker = { type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 0 };

    expect(applyDelta(tracker, 2)).toMatchObject({ current: 1, cycles: 1 });
    expect(applyDelta({ ...tracker, current: 0, cycles: 1 }, -2)).toMatchObject({ current: 4, cycles: 0 });
    expect(applyDelta({ ...tracker, current: 4, cycles: 0 }, 2)).toMatchObject({ current: 0, cycles: 1 });
  });

  it('clamps point loops cleanly to configured cycle bounds', () => {
    expect(applyDelta({ type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 1, cyclesMax: 1 }, 2)).toMatchObject({ current: 5, cycles: 1 });
    expect(applyDelta({ type: 'points', current: 0, min: 0, max: 5, limitMode: 'loop', cycles: 0, cyclesMin: 0 }, -2)).toMatchObject({ current: 0, cycles: 0 });
  });

  it('does not loop point automation when increasing or decreasing directly', () => {
    const participant = {
      trackers: [{
        type: 'points',
        current: 5,
        min: 0,
        max: 5,
        limitMode: 'loop',
        cycles: 0,
        autoReset: 'activation',
        resetRule: { step: 3, pointsAutoMode: 'increase' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 5, cycles: 0 });
    expect(resetAutoTrackers({
      trackers: [{ ...participant.trackers[0], current: 1, resetRule: { step: 3, pointsAutoMode: 'decrease' } }],
    }, 'activation').trackers[0]).toMatchObject({ current: 0, cycles: 0 });
  });

  it('reduces bar excess with floor rounding by default', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 15,
        min: 0,
        max: 10,
        autoReset: 'activation',
        resetRule: { excessReductionPercent: 50 },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(12);
  });
});
