import { describe, expect, it } from 'vitest';
import { applyDelta, cycleBoxMark, isTriggeredClock, nextTurnInfo } from './logic.js';

describe('initiative', () => {
  it('annonce le nouveau round au dernier participant', () => {
    expect(nextTurnInfo({ activeId: 'b', participants: [{ id: 'a' }, { id: 'b' }] }).nextStartsRound).toBe(true);
  });

  it('n’annonce pas le nouveau round si une horloge bloque', () => {
    expect(nextTurnInfo({ activeId: 'b', participants: [{ id: 'a' }, { id: 'b' }] }, true).nextStartsRound).toBe(false);
  });
});

describe('trackers', () => {
  it('respecte le maximum absolu', () => {
    expect(applyDelta({ type: 'bar', current: 9, max: 10, min: 0, maxAbsolute: true, minAbsolute: true }, 5).current).toBe(10);
  });

  it('laisse dépasser le maximum non absolu', () => {
    expect(applyDelta({ type: 'bar', current: 9, max: 10, min: 0, maxAbsolute: false, minAbsolute: true }, 5).current).toBe(14);
  });

  it('cycle les cases', () => {
    expect([cycleBoxMark(0, 3), cycleBoxMark(1, 3), cycleBoxMark(2, 3), cycleBoxMark(3, 3)]).toEqual([1, 2, 3, 0]);
  });

  it('détecte une horloge terminée', () => {
    expect(isTriggeredClock({ type: 'clock', current: 4, max: 4 })).toBe(true);
  });
});
