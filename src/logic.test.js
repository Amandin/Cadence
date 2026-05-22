import { describe, expect, it } from 'vitest';
import { activeThresholds, applyBoxMarkAction, applyDelta, boxBlocks, newTracker, resetAutoTrackers, sortBoxBlocks, tickStatuses, triggerActivation } from './logic.js';

describe('trackers updated behavior', () => {
  it('uses block based boxes by default', () => {
    const tracker = newTracker('boxes');
    expect(tracker).toMatchObject({ type: 'boxes', blocks: [{ label: 'Bloc 1', lines: [{ label: 'Ligne 1' }] }] });
    expect(boxBlocks(tracker)[0].lines[0].boxes.map((box) => box.mark)).toEqual([0, 0, 0, 0]);
  });

  it('creates bars with a default threshold below zero', () => {
    const tracker = newTracker('bar');
    expect(tracker.thresholds).toEqual([{ value: 0, label: '< 0', color: 'red', operator: 'lt' }]);
    expect(activeThresholds({ ...tracker, current: 0 })).toEqual([]);
    expect(activeThresholds({ ...tracker, current: -1 }).map((threshold) => threshold.label)).toEqual(['< 0']);
  });

  it('advances statuses only on their configured event', () => {
    const statuses = [
      { id: 'activation', name: 'Activation', duration: 2, remaining: 2, advanceOn: 'activation', expired: false },
      { id: 'round', name: 'Tour', duration: 2, remaining: 2, advanceOn: 'round', expired: false },
    ];

    expect(tickStatuses(statuses, 'activation').map((status) => status.remaining)).toEqual([1, 2]);
    expect(tickStatuses(statuses, 'round').map((status) => status.remaining)).toEqual([2, 1]);
  });

  it('normalizes boxes by block, line and logical position', () => {
    const tracker = {
      type: 'boxes',
      fillLevels: 3,
      blocks: [{
        id: 'block-b',
        label: 'B',
        order: 1,
        lines: [{ id: 'line-b', label: 'B1', order: 0, boxes: [{ id: 'b2', position: 2, mark: 1 }, { id: 'b0', position: 0, mark: 3 }] }],
      }, {
        id: 'block-a',
        label: 'A',
        order: 0,
        lines: [{ id: 'line-a', label: 'A1', order: 0, boxes: [{ id: 'a1', position: 1, mark: 2 }, { id: 'a0', position: 0, mark: 1 }] }],
      }],
    };

    const blocks = sortBoxBlocks(tracker).blocks;
    expect(blocks.map((block) => block.id)).toEqual(['block-a', 'block-b']);
    expect(blocks[1].lines[0].boxes.map((box) => box.id)).toEqual(['b0', 'b2']);
    expect(blocks[1].lines[0].boxes.map((box) => box.position)).toEqual([0, 1]);
  });

  it('applies explicit fill or empty actions to box marks', () => {
    expect(applyBoxMarkAction(1, 3, 'fill')).toBe(2);
    expect(applyBoxMarkAction(3, 3, 'fill')).toBe(3);
    expect(applyBoxMarkAction(1, 3, 'empty')).toBe(0);
    expect(applyBoxMarkAction(0, 3, 'empty')).toBe(0);
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

  it('protects activation statuses and clocks from multiple action slots in the same round', () => {
    const participant = {
      statuses: [{ id: 'haste', name: 'Hâte', duration: 3, remaining: 3, advanceOn: 'activation', expired: false }],
      trackers: [{ type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'activation' }],
    };

    const first = triggerActivation(participant);
    const second = triggerActivation(first);

    expect(first.statuses[0].remaining).toBe(2);
    expect(first.trackers[0].current).toBe(1);
    expect(second.statuses[0].remaining).toBe(2);
    expect(second.trackers[0].current).toBe(1);
  });

  it('uses a distinct automation rule for bar values under the minimum', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: -6,
        min: 0,
        max: 10,
        autoReset: 'activation',
        resetRule: { excessReductionPercent: 100, underflowRecoveryPercent: 50 },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(-3);
    expect(resetAutoTrackers({
      trackers: [{ ...participant.trackers[0], resetRule: { excessReductionPercent: 100 } }],
    }, 'activation').trackers[0].current).toBe(-6);
  });

  it('keeps only the most restrictive active counter thresholds per operator', () => {
    const tracker = {
      type: 'number',
      current: 10,
      thresholds: [
        { value: 3, label: '>= 3', operator: 'gte', color: 'green' },
        { value: 6, label: '>= 6', operator: 'gte', color: 'amber' },
        { value: 9, label: '>= 9', operator: 'gte', color: 'red' },
        { value: 7, label: '<= 7', operator: 'lte', color: 'blue' },
        { value: 10, label: '= 10', operator: 'eq', color: 'violet' },
      ],
    };

    expect(activeThresholds(tracker).map((threshold) => threshold.label)).toEqual(['>= 9', '= 10']);
  });

  it('uses lower values as the most restrictive active <= counter threshold', () => {
    const tracker = {
      type: 'number',
      current: 0,
      thresholds: [
        { value: 7, label: '<= 7', operator: 'lte', color: 'green' },
        { value: 4, label: '<= 4', operator: 'lte', color: 'amber' },
        { value: 1, label: '<= 1', operator: 'lte', color: 'red' },
      ],
    };

    expect(activeThresholds(tracker).map((threshold) => threshold.label)).toEqual(['<= 1']);
  });

  it('keeps active thresholds visible separately for different counters', () => {
    const tracker = {
      type: 'number',
      current: 10,
      counters: [{ id: 'heat', current: 4 }],
      thresholds: [
        { value: 6, label: 'Main ready', operator: 'gte', counterId: '__main', color: 'green' },
        { value: 3, label: 'Heat high', operator: 'gte', counterId: 'heat', color: 'red' },
      ],
    };

    expect(activeThresholds(tracker).map((threshold) => `${threshold.counterId}:${threshold.label}`)).toEqual(['__main:Main ready', 'heat:Heat high']);
  });

  it('uses explicit counter threshold comparators independently', () => {
    const base = {
      type: 'number',
      thresholds: [
        { value: 5, label: 'gte 5', operator: 'gte', color: 'green' },
        { value: 5, label: 'lte 5', operator: 'lte', color: 'amber' },
        { value: 5, label: 'eq 5', operator: 'eq', color: 'violet' },
      ],
    };

    expect(activeThresholds({ ...base, current: 4 }).map((threshold) => threshold.label)).toEqual(['lte 5']);
    expect(activeThresholds({ ...base, current: 5 }).map((threshold) => threshold.label)).toEqual(['gte 5', 'lte 5', 'eq 5']);
    expect(activeThresholds({ ...base, current: 6 }).map((threshold) => threshold.label)).toEqual(['gte 5']);
  });

  it('defaults missing counter threshold operators to >= like the editor', () => {
    const tracker = {
      type: 'number',
      current: 6,
      direction: 'countdown',
      thresholds: [{ value: 5, label: 'legacy high', color: 'green' }],
    };

    expect(activeThresholds(tracker).map((threshold) => threshold.label)).toEqual(['legacy high']);
    expect(activeThresholds({ ...tracker, current: 4 })).toEqual([]);
  });
});
