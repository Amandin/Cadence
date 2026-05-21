import { describe, expect, it } from 'vitest';
import { temporalityModes } from './constants.js';
import {
  activeThresholds,
  applyDelta,
  boxVisualRank,
  cycleBoxMark,
  hasTriggeredClock,
  isTriggeredClock,
  newTracker,
  nextTurnInfo,
  resetAutoTrackers,
  resetTracker,
  tickParticipant,
  tickStatuses,
  untickParticipant,
  untickStatuses,
} from './logic.js';
import { appliquerDebutNouveauRound, appliquerNouveauRoundPhases, appliquerNouveauRoundSouple } from './actions/tempoState.js';

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

  it('fait boucler les points avec un compteur de tours', () => {
    expect(applyDelta({ type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 0 }, 1)).toMatchObject({ current: 0, cycles: 1 });
  });

  it('bloque les points boucles quand le compteur atteint ses bornes', () => {
    expect(applyDelta({ type: 'points', current: 5, min: 0, max: 5, limitMode: 'loop', cycles: 1, cyclesMax: 1 }, 1)).toMatchObject({ current: 5, cycles: 1 });
    expect(applyDelta({ type: 'points', current: 0, min: 0, max: 5, limitMode: 'loop', cycles: -1, cyclesMin: -1 }, -1)).toMatchObject({ current: 0, cycles: -1 });
  });

  it('laisse les horloges depasser ou incrementer selon leur mode', () => {
    expect(applyDelta({ type: 'clock', current: 4, min: 0, max: 4, limitMode: 'overflow' }, 2)).toMatchObject({ current: 6 });
    expect(applyDelta({ type: 'clock', current: 3, min: 0, max: 4, limitMode: 'increment', cycles: 0 }, 1)).toMatchObject({ current: 0, cycles: 1 });
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
    expect(newTracker('boxes')).toMatchObject({ type: 'boxes', name: 'Cases', boxMode: 'free', fillLevels: 1 });
    expect(newTracker('bar')).toMatchObject({ type: 'bar', name: 'PV', current: 20, initial: 20, min: 0, max: 20, direction: 'countdown' });
  });

  it('convertit les anciens noms de suivis vers les cinq types publics', () => {
    expect(newTracker('points')).toMatchObject({ type: 'points', name: 'Puces', current: 0, max: 5 });
    expect(newTracker('dots')).toMatchObject({ type: 'points', name: 'Puces' });
    expect(newTracker('boxesFree')).toMatchObject({ type: 'boxes', name: 'Cases', boxMode: 'free' });
    expect(newTracker('boxesSorted')).toMatchObject({ type: 'boxes', name: 'Cases', boxMode: 'sorted', fillLevels: 1 });
  });

  it('affiche les seuils actifs de la valeur et du compteur global', () => {
    expect(activeThresholds({
      type: 'points',
      current: 4,
      cycles: 2,
      currentThresholds: [{ value: 4, label: 'plein', color: 'green' }],
      totalThresholds: [{ value: 2, label: 'deux tours', color: 'amber' }],
    }).map((threshold) => threshold.label)).toEqual(['plein', 'deux tours']);
  });

  it('respecte les operateurs des seuils texte', () => {
    expect(activeThresholds({
      type: 'bar',
      current: 2,
      thresholds: [
        { value: 1, operator: 'lte', label: 'bas', color: 'amber' },
        { value: 2, operator: 'eq', label: 'pile', color: 'blue' },
      ],
    }).map((threshold) => threshold.label)).toEqual(['pile']);
  });

  it('cible les seuils sur le bon compteur', () => {
    const thresholds = activeThresholds({
      type: 'number',
      current: 2,
      counters: [{ id: 'heat', label: 'Chaleur', current: 7 }],
      thresholds: [
        { value: 5, operator: 'gte', counterId: 'heat', label: 'surchauffe', color: 'red' },
        { value: 5, operator: 'gte', counterId: '__main', label: 'principal', color: 'green' },
      ],
    });

    expect(thresholds).toHaveLength(1);
    expect(thresholds[0]).toMatchObject({ label: 'surchauffe', counterId: 'heat' });
  });

  it('reset manuellement a zero, au maximum et a la valeur initiale', () => {
    const tracker = { type: 'points', current: 1, initial: 3, min: 0, max: 5, cycles: 2, cyclesInitial: 0 };

    expect(resetTracker(tracker, 'zero')).toMatchObject({ current: 0, cycles: 0 });
    expect(resetTracker(tracker, 'max')).toMatchObject({ current: 5, cycles: 0 });
    expect(resetTracker(tracker, 'initial')).toMatchObject({ current: 3, cycles: 0 });
  });

  it('reset les cases selon le mode choisi', () => {
    const tracker = {
      type: 'boxes',
      boxMode: 'free',
      rows: [{ id: 'r1', label: 'Reaction', marks: [0, 1] }],
      initialRows: [{ id: 'r1', label: 'Reaction', marks: [1, 0] }],
    };

    expect(resetTracker(tracker, 'zero').rows[0].marks).toEqual([0, 0]);
    expect(resetTracker(tracker, 'checked').rows[0].marks).toEqual([1, 1]);
    expect(resetTracker(tracker, 'initial').rows[0].marks).toEqual([1, 0]);
  });

  it('applique l auto-reset uniquement au declencheur attendu', () => {
    const participant = {
      trackers: [
        { id: 'round', type: 'points', current: 0, initial: 2, min: 0, max: 3, autoReset: 'round', resetMode: 'initial' },
        { id: 'activation', type: 'boxes', boxMode: 'free', autoReset: 'activation', initialRows: [{ id: 'r', marks: [1] }], resetRule: { mode: 'towardDefault', step: 1 }, rows: [{ id: 'r', marks: [0] }] },
      ],
    };

    expect(resetAutoTrackers(participant, 'round').trackers[0]).toMatchObject({ current: 1 });
    expect(resetAutoTrackers(participant, 'round').trackers[1].rows[0].marks).toEqual([0]);
    expect(resetAutoTrackers(participant, 'activation').trackers[1].rows[0].marks).toEqual([1]);
  });

  it('applique une action fine pendant l auto-reset', () => {
    const participant = {
      trackers: [
        { id: 'charge', type: 'points', current: 1, min: 0, max: 5, autoReset: 'round', resetRule: { mode: 'delta', delta: 3, after: 'none' } },
        { id: 'reaction', type: 'boxes', boxMode: 'free', autoReset: 'activation', resetRule: { mode: 'boxDelta', amount: 1, targetRowId: 'main' }, rows: [{ id: 'main', marks: [1, 1] }, { id: 'other', marks: [1] }] },
      ],
    };

    expect(resetAutoTrackers(participant, 'round').trackers[0].current).toBe(4);
    expect(resetAutoTrackers(participant, 'activation').trackers[1].rows.map((row) => row.marks)).toEqual([[0, 1], [1]]);
  });

  it('automatise les puces vers leur valeur initiale avec un pas non signe', () => {
    const participant = {
      trackers: [{ id: 'charges', type: 'points', current: 4, initial: 1, cycles: 3, cyclesInitial: 0, min: 0, max: 8, autoReset: 'activation', resetRule: { step: 2 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 2, cycles: 3 });
  });

  it('ramene les puces au seuil de depart sans modifier le compteur global', () => {
    const participant = {
      trackers: [{ id: 'charges', type: 'points', current: 1, initial: 0, cycles: 2, min: 0, max: 5, autoReset: 'activation', resetRule: { step: 2 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 0, cycles: 2 });
  });

  it('automatise les cases triees comme une seule jauge', () => {
    const participant = {
      trackers: [{ id: 'blessures', type: 'boxes', boxMode: 'sorted', fillLevels: 3, autoReset: 'activation', initialRows: [{ id: 'r1', marks: [0, 0] }, { id: 'r2', marks: [0, 0] }], resetRule: { boxRows: { __all: { amount: 2, levels: 1, maxLevel: 2 } } }, rows: [{ id: 'r1', marks: [2, 2] }, { id: 'r2', marks: [2, 2] }] }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].rows.map((row) => row.marks)).toEqual([[1, 1], [2, 2]]);
  });

  it('reduit les cases les moins graves sans toucher aux niveaux au dessus de la limite', () => {
    const participant = {
      trackers: [{ id: 'blessures', type: 'boxes', boxMode: 'sorted', fillLevels: 3, autoReset: 'activation', initialRows: [{ id: 'r', marks: [0, 0, 0, 0] }], resetRule: { boxRows: { __all: { amount: 2, levels: 2, maxLevel: 2 } } }, rows: [{ id: 'r', marks: [3, 2, 1, 1] }] }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].rows[0].marks).toEqual([3, 2, 0, 0]);
  });

  it('ignore les niveaux de cases exclus de la regeneration', () => {
    const participant = {
      trackers: [{ id: 'blessures', type: 'boxes', boxMode: 'sorted', fillLevels: 3, autoReset: 'activation', initialRows: [{ id: 'r', marks: [0, 0, 0] }], resetRule: { step: -1, amount: 3, skipLevels: [3] }, rows: [{ id: 'r', marks: [3, 2, 1] }] }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].rows[0].marks).toEqual([3, 1, 0]);
  });

  it('automatise les compteurs en pourcentage avec arrondi', () => {
    const participant = {
      trackers: [{ id: 'reserve', type: 'number', current: 10, counters: [{ id: 'a', current: 5 }], autoReset: 'activation', resetRule: { stepMode: 'percent', step: -25, rounding: 'nearest', minCap: 0 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 8, counters: [{ id: 'a', current: 4 }] });
  });

  it('automatise chaque compteur avec sa propre ligne', () => {
    const participant = {
      trackers: [{ id: 'reserve', type: 'number', current: 10, max: 12, counters: [{ id: 'a', current: 20, max: 25 }], autoReset: 'activation', resetRule: { counterRules: { __main: { flat: 5, percent: 0 }, a: { flat: 0, percent: -10 } } } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0]).toMatchObject({ current: 12, counters: [{ id: 'a', current: 18 }] });
  });

  it('reduit multiplicativement l exces des barres', () => {
    const participant = {
      trackers: [{ id: 'pression', type: 'bar', current: 18, max: 10, min: 0, autoReset: 'activation', resetRule: { excessReductionPercent: 50 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(14);
  });

  it('conserve l exces des barres sans reduction explicite', () => {
    const participant = {
      trackers: [{ id: 'pression', type: 'bar', current: 18, max: 10, min: 0, autoReset: 'activation', resetRule: { step: 3 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(18);
  });

  it('automatise les barres avec une modification fixe', () => {
    const participant = {
      trackers: [{ id: 'pression', type: 'bar', current: 8, max: 10, min: 0, maxAbsolute: true, autoReset: 'activation', resetRule: { barAutoMode: 'fixed', step: 3 } }],
    };

    expect(resetAutoTrackers(participant, 'activation').trackers[0].current).toBe(10);
  });
});

describe('auto-reset dans le tempo', () => {
  const sceneBase = {
    round: 1,
    activeId: 'a',
    participants: [
      { id: 'a', initiative: 10, statuses: [], trackers: [{ id: 'reaction', type: 'boxes', boxMode: 'free', autoReset: 'activation', initialRows: [{ id: 'r', marks: [1] }], resetRule: { mode: 'towardDefault', step: 1 }, rows: [{ id: 'r', marks: [0] }] }] },
      { id: 'b', initiative: 5, statuses: [], trackers: [{ id: 'charge', type: 'points', current: 0, initial: 2, min: 0, max: 3, autoReset: 'round', resetMode: 'initial' }] },
    ],
    reserve: [],
    globalTracker: { enabled: false },
  };

  it('reset au nouveau round puis a l activation en mode classique', () => {
    const suivant = appliquerDebutNouveauRound(sceneBase, 'a');

    expect(suivant.participants[0].trackers[0].rows[0].marks).toEqual([1]);
    expect(suivant.participants[1].trackers[0].current).toBe(1);
  });

  it('reset au nouveau round en mode souple', () => {
    const suivant = appliquerNouveauRoundSouple({ ...sceneBase, activeId: '', jouesSouples: ['a'], historiqueSouple: ['a'] });

    expect(suivant.activeId).toBe('');
    expect(suivant.jouesSouples).toEqual([]);
    expect(suivant.participants[1].trackers[0].current).toBe(1);
  });

  it('reset au nouveau round sans confondre les phases', () => {
    const suivant = appliquerNouveauRoundPhases({ ...sceneBase, temporalite: temporalityModes.PHASES, phase: 2, phaseDecrement: 10, phaseRerollEachRound: false });

    expect(suivant.round).toBe(2);
    expect(suivant.phase).toBe(1);
    expect(suivant.participants[1].trackers[0].current).toBe(1);
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
