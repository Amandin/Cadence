import { describe, expect, it } from 'vitest';
import { activeThresholds, applyBoxMarkAction, applyDelta, boxBlocks, boxVisualRank, makeDefaultCampaign, newTracker, nextTurnInfo, normalizeBoxTracker, resetAutoTrackers, sortBoxBlocks, tickStatuses, triggerActivation, untickStatuses } from './logic.js';

describe('trackers updated behavior', () => {
  it('uses block based boxes by default', () => {
    const tracker = newTracker('boxes');
    expect(tracker).toMatchObject({ type: 'boxes', levelVisuals: [2], blocks: [{ label: 'Bloc 1', lines: [{ label: 'Ligne 1' }] }] });
    expect(boxBlocks(tracker)[0].lines[0].boxes.map((box) => box.mark)).toEqual([0, 0, 0, 0]);
  });

  it('can decouple box logical levels from their visual marks', () => {
    const tracker = normalizeBoxTracker({ type: 'boxes', fillLevels: 1, levelVisuals: [2], blocks: [{ label: 'Bloc', lines: [{ label: 'Ligne', boxes: [{ position: 0, mark: 1 }] }] }] });

    expect(tracker.fillLevels).toBe(1);
    expect(boxVisualRank(1, tracker)).toBe(2);
    expect(boxVisualRank(1, { ...tracker, levelVisuals: [5] })).toBe(5);
  });

  it('creates bars with a default threshold below zero', () => {
    const tracker = newTracker('bar');
    expect(tracker.thresholds).toEqual([{ value: 0, label: '< 0', color: 'red', operator: 'lt' }]);
    expect(activeThresholds({ ...tracker, current: 0 })).toEqual([]);
    expect(activeThresholds({ ...tracker, current: -1 }).map((threshold) => threshold.label)).toEqual(['< 0']);
  });

  it('starts from a neutral default campaign instead of a seeded test scene', () => {
    const campaign = makeDefaultCampaign();

    expect(campaign.name).toBe('Campagne Cadence');
    expect(campaign.scenes).toHaveLength(1);
    expect(campaign.scenes[0]).toMatchObject({
      title: 'Nouvelle scène',
      type: 'Scène',
      reserve: [],
      participants: [],
      statuses: [],
    });
  });

  it('advances statuses only on their configured event', () => {
    const statuses = [
      { id: 'activation', name: 'Activation', duration: 2, remaining: 2, advanceOn: 'activation', expired: false },
      { id: 'round', name: 'Round', duration: 2, remaining: 2, advanceOn: 'round', expired: false },
    ];

    expect(tickStatuses(statuses, 'activation').map((status) => status.remaining)).toEqual([1, 2]);
    expect(tickStatuses(statuses, 'round').map((status) => status.remaining)).toEqual([2, 1]);
  });

  it('can skip and undo the first activation of an initial surprise status', () => {
    const statuses = [{ id: 'surpris', name: 'Surpris', duration: 1, remaining: 1, advanceOn: 'activation', expired: false, skipNextActivation: true }];
    const apresActivation = tickStatuses(statuses, 'activation');
    expect(apresActivation[0]).toMatchObject({ remaining: 1, expired: false, skipNextActivation: false, activationSkipConsumed: true });
    expect(untickStatuses(apresActivation, 'activation')[0]).toMatchObject({ remaining: 1, expired: false, skipNextActivation: true, activationSkipConsumed: false });
  });

  it('can skip the initial round tick of a round-based surprise status', () => {
    const statuses = [{ id: 'surpris', name: 'Surpris', duration: 1, remaining: 1, advanceOn: 'round', expired: false, skipNextAdvance: true }];
    const apresPremierRound = tickStatuses(statuses, 'round');
    expect(apresPremierRound[0]).toMatchObject({ remaining: 1, expired: false, skipNextAdvance: false, advanceSkipConsumed: true });
    expect(tickStatuses(apresPremierRound, 'round')[0]).toMatchObject({ remaining: 0, expired: true });
  });

  it('announces a new round after the only classic slot', () => {
    const scene = {
      activeId: 'solo',
      participants: [{ id: 'solo', initiative: 12, actionSlots: [{ id: 'slot-1', initiative: 12 }] }],
    };

    expect(nextTurnInfo(scene).nextStartsRound).toBe(true);
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

  it('does not run a frozen non-clock automation', () => {
    const participant = { trackers: [{ type: 'bar', current: 10, initial: 10, min: 0, max: 20, step: 3, autoReset: 'activation', frozen: true, resetRule: { step: -2, percent: 100, barAutoMode: 'always' } }] };
    const next = resetAutoTrackers(participant, 'activation');
    expect(next.trackers[0].current).toBe(10);
  });

  it('runs round clocks only on the round trigger', () => {
    const participant = { trackers: [{ type: 'clock', current: 0, min: 0, max: 6, step: 1, autoReset: 'round' }] };
    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(0);
    expect(resetAutoTrackers(participant, 'round').trackers[0].current).toBe(1);
  });

  it('runs non-clock automation on the configured round trigger', () => {
    const participant = { trackers: [{ type: 'bar', current: 10, initial: 10, min: 0, max: 20, autoReset: 'round', resetRule: { step: -2, percent: 100, barAutoMode: 'always' } }] };
    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(10);
    expect(resetAutoTrackers(participant, 'round').trackers[0].current).toBe(8);
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

  it('can let point automation change loop counters when enabled', () => {
    const participant = {
      trackers: [{
        type: 'points',
        current: 5,
        min: 0,
        max: 5,
        limitMode: 'loop',
        cycles: 0,
        autoReset: 'activation',
        resetRule: { step: 3, pointsAutoMode: 'increase', pointsAutoCycles: true },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 3, cycles: 1 });
  });

  it('advances looping point automation across the boundary as 4 -> 5 -> next cycle 1', () => {
    const tracker = {
      type: 'points',
      current: 4,
      min: 0,
      max: 5,
      limitMode: 'loop',
      cycles: 1,
      autoReset: 'activation',
      resetRule: { step: 1, pointsAutoMode: 'increase', pointsAutoCycles: true },
    };

    const first = resetAutoTrackers({ trackers: [tracker] }, 'activation').trackers[0];
    const second = resetAutoTrackers({ trackers: [first] }, 'activation').trackers[0];

    expect(first).toMatchObject({ current: 5, cycles: 1 });
    expect(second).toMatchObject({ current: 1, cycles: 2 });
  });

  it('rewinds looping point automation across the boundary as 1 -> 0 -> previous cycle 4', () => {
    const tracker = {
      type: 'points',
      current: 1,
      min: 0,
      max: 5,
      limitMode: 'loop',
      cycles: 2,
      autoReset: 'activation',
      resetRule: { step: 1, pointsAutoMode: 'decrease', pointsAutoCycles: true },
    };

    const first = resetAutoTrackers({ trackers: [tracker] }, 'activation').trackers[0];
    const second = resetAutoTrackers({ trackers: [first] }, 'activation').trackers[0];

    expect(first).toMatchObject({ current: 0, cycles: 2 });
    expect(second).toMatchObject({ current: 4, cycles: 1 });
  });

  it('can keep point automation inside the current loop when loop counter changes are disabled', () => {
    const participant = {
      trackers: [{
        type: 'points',
        current: 5,
        min: 0,
        max: 5,
        limitMode: 'loop',
        cycles: 0,
        autoReset: 'activation',
        resetRule: { step: 3, pointsAutoMode: 'increase', pointsAutoCycles: false },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 5, cycles: 0 });
  });

  it('treats full points and empty next cycle as equivalent for default loop automation', () => {
    const participant = {
      trackers: [{
        type: 'points',
        current: 0,
        initial: 5,
        min: 0,
        max: 5,
        limitMode: 'loop',
        cycles: 1,
        cyclesInitial: 0,
        autoReset: 'activation',
        resetRule: { step: 1, pointsAutoMode: 'default', pointsAutoCycles: true },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 0, cycles: 1 });
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

  it('applies additive and multiplicative bar automation inside bounds', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 4,
        min: 0,
        max: 20,
        autoReset: 'activation',
        resetRule: { step: 2, percent: 300 },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(14);
  });

  it('can decrease a bar down to the minimum without overshooting', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 6,
        min: 0,
        max: 10,
        autoReset: 'activation',
        resetRule: { step: -2, percent: 100, barAutoMode: 'limit' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(4);
  });

  it('can decrease a bar past the minimum when minimum clamp is disabled', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 1,
        min: 0,
        max: 10,
        minAbsolute: false,
        autoReset: 'activation',
        resetRule: { step: -2, percent: 100, barAutoMode: 'always' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(-1);
  });

  it('can increase a bar up to the maximum without overshooting', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 4,
        min: 0,
        max: 10,
        autoReset: 'activation',
        resetRule: { step: 2, percent: 100, barAutoMode: 'limit' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(6);
  });

  it('can increase a bar past the maximum when maximum clamp is disabled', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 9,
        min: 0,
        max: 10,
        maxAbsolute: false,
        autoReset: 'activation',
        resetRule: { step: 2, percent: 100, barAutoMode: 'always' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(11);
  });

  it('can bring a bar back toward its default value without overshooting', () => {
    const participant = {
      trackers: [{
        type: 'bar',
        current: 4,
        initial: 10,
        min: 0,
        max: 20,
        autoReset: 'activation',
        resetRule: { step: 2, percent: 300, barAutoMode: 'default' },
      }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(10);
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

  it('supports bar thresholds as fixed values, percentages and values from maximum', () => {
    const tracker = {
      type: 'bar',
      current: 10,
      min: 0,
      max: 20,
      direction: 'countdown',
      thresholds: [
        { value: 12, basis: 'fixed', label: 'fixed', operator: 'lte', color: 'amber' },
        { value: 50, basis: 'percent', label: 'half', operator: 'lte', color: 'red' },
        { value: 5, basis: 'fromMax', label: 'max minus five', operator: 'lte', color: 'blue' },
      ],
    };

    expect(activeThresholds(tracker).map((threshold) => `${threshold.label}:${threshold.effectiveValue}`)).toEqual(['half:10']);
    expect(activeThresholds({ ...tracker, current: 15 }).map((threshold) => `${threshold.label}:${threshold.effectiveValue}`)).toEqual(['max minus five:15']);
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
