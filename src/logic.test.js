import { describe, expect, it } from 'vitest';
import { applyDelta, cycleBoxMark, isTriggeredClock, nextTurnInfo, tickStatuses } from './logic.js';

describe('initiative', () => {
  const scene = { activeId: 'b', participants: [{ id: 'a' }, { id: 'b' }] };

  it('annonce le nouveau round au dernier participant', () => {
    expect(nextTurnInfo(scene).nextStartsRound).toBe(true);
  });

  it('n’annonce pas le nouveau round si une horloge bloque', () => {
    expect(nextTurnInfo(scene, true).nextStartsRound).toBe(false);
  });
});

describe('trackers', () => {
  it('respecte le maximum absolu', () => {
    expect(applyDelta({ type: 'bar', current: 9, max: 10, min: 0, maxAbsolute: true, minAbsolute: true }, 5).current).toBe(10);
  });

  it('laisse dépasser le maximum non absolu', () => {
    expect(applyDelta({ type: 'bar', current: 9, max: 10, min: 0, maxAbsolute: false, minAbsolute: true }, 5).current).toBe(14);
  });

  it('borne toujours les points et les horloges', () => {
    expect(applyDelta({ type: 'dots', current: 4, max: 5 }, 10).current).toBe(5);
    expect(applyDelta({ type: 'clock', current: 1, max: 6 }, -10).current).toBe(0);
  });

  it('cycle les cases', () => {
    expect([cycleBoxMark(0, 3), cycleBoxMark(1, 3), cycleBoxMark(2, 3), cycleBoxMark(3, 3)]).toEqual([1, 2, 3, 0]);
  });

  it('détecte une horloge terminée', () => {
    expect(isTriggeredClock({ type: 'clock', current: 4, max: 4 })).toBe(true);
    expect(isTriggeredClock({ type: 'bar', current: 4, max: 4 })).toBe(false);
  });
});

describe('états temporaires', () => {
  it('conserve les états infinis', () => {
    expect(tickStatuses([{ id: 's', name: 'À couvert', duration: null }])).toHaveLength(1);
  });

  it('marque comme écoulé un état fini arrivé à zéro', () => {
    expect(tickStatuses([{ duration: 1, remaining: 1, loop: false }])[0].expired).toBe(true);
  });

  it('relance un état expiré si sa boucle est active', () => {
    expect(tickStatuses([{ duration: 2, remaining: 0, loop: true, expired: true }])[0]).toMatchObject({ remaining: 2, expired: false });
  });
});
