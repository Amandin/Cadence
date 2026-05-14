import { describe, expect, it } from 'vitest';
import {
  applyDelta,
  boxVisualRank,
  cycleBoxMark,
  hasTriggeredClock,
  isTriggeredClock,
  newTracker,
  nextTurnInfo,
  tickParticipant,
  tickStatuses,
  untickParticipant,
  untickStatuses,
} from './logic.js';

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

  it('associe les marques de cases à leurs rangs visuels', () => {
    expect([0, 1, 2, 3, 4, 5].map((mark) => boxVisualRank(mark, 5))).toEqual([0, 1, 2, 3, 4, 5]);
    expect([0, 1, 2, 3, 4].map((mark) => boxVisualRank(mark, 4))).toEqual([0, 1, 2, 4, 5]);
  });

  it('détecte une horloge terminée', () => {
    expect(isTriggeredClock({ type: 'clock', current: 4, max: 4 })).toBe(true);
    expect(isTriggeredClock({ type: 'bar', current: 4, max: 4 })).toBe(false);
    expect(hasTriggeredClock({ trackers: [{ type: 'clock', current: 6, max: 6 }] })).toBe(true);
  });

  it('crée des trackers par défaut stables', () => {
    expect(newTracker('clock')).toMatchObject({ type: 'clock', name: 'Horloge', current: 0, max: 6, auto: true, frozen: false });
    expect(newTracker('boxes')).toMatchObject({ type: 'boxes', name: 'Cases', fillLevels: 5 });
    expect(newTracker('bar')).toMatchObject({ type: 'bar', name: 'PV', current: 10, min: 0, max: 20 });
  });
});

describe('états temporaires', () => {
  it('conserve les états infinis', () => {
    expect(tickStatuses([{ id: 's', name: 'À couvert', duration: null }])).toHaveLength(1);
  });

  it('marque comme écoulé un état fini arrivé à zéro puis le retire au tick suivant', () => {
    const expired = tickStatuses([{ id: 's', duration: 1, remaining: 1, loop: false }]);

    expect(expired[0].expired).toBe(true);
    expect(tickStatuses(expired)).toEqual([]);
  });

  it('relance un état expiré si sa boucle est active', () => {
    expect(tickStatuses([{ duration: 2, remaining: 0, loop: true, expired: true }])[0]).toMatchObject({ remaining: 2, expired: false });
  });

  it('remonte correctement un état quand on revient en arrière', () => {
    expect(untickStatuses([{ id: 's', duration: 2, remaining: 1, loop: false, expired: false }])).toEqual([
      { id: 's', duration: 2, remaining: 2, loop: false, expired: false },
    ]);
    expect(untickStatuses([{ id: 's', duration: 2, remaining: 0, loop: false, expired: true }])).toEqual([
      { id: 's', duration: 2, remaining: 1, loop: false, expired: false },
    ]);
  });

  it('fait avancer et reculer les horloges automatiques des participants', () => {
    const participant = {
      statuses: [],
      trackers: [
        { id: 'auto', type: 'clock', current: 1, max: 6, auto: true, frozen: false },
        { id: 'frozen', type: 'clock', current: 1, max: 6, auto: true, frozen: true },
      ],
    };

    expect(tickParticipant(participant).trackers.map((tracker) => tracker.current)).toEqual([2, 1]);
    expect(untickParticipant(participant).trackers.map((tracker) => tracker.current)).toEqual([0, 1]);
  });
});
