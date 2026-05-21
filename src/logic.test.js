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

  it('keeps point cycles driven by actual looping', () => {
    expect(applyDelta({ type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 0 }, 1)).toMatchObject({ current: 0, cycles: 1 });
  });
});
