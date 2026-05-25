import { describe, expect, it } from 'vitest';
import { phaseActionModes, temporalityModes } from '../constants.js';
import {
  appliquerNouveauRoundPhases,
  participantsPhase,
  phaseSuivanteDisponible,
  phasesAttendRelanceInitiative,
  premierParticipantPhase,
} from './tempoState.js';

function participant(id, initiative, extra = {}) {
  return {
    id,
    name: id,
    kind: 'PJ',
    initiative,
    departage: '',
    statuses: [],
    trackers: [],
    ...extra,
  };
}

function scene(overrides = {}) {
  return {
    id: 'scene',
    temporalite: temporalityModes.PHASES,
    round: 1,
    phase: 1,
    phaseDecrement: 10,
    phaseRerollEachRound: false,
    activeId: 'a',
    globalTracker: { enabled: true, auto: true, current: 0, max: 6 },
    statuses: [],
    participants: [participant('a', 23), participant('b', 14), participant('c', 8)],
    reserve: [participant('reserve', 0)],
    ...overrides,
  };
}

describe('phase tempo state', () => {
  it('returns current phase participants in SR5-like order', () => {
    expect(participantsPhase(scene({ phase: 1 })).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 23],
      ['b', 14],
      ['c', 8],
    ]);
    expect(participantsPhase(scene({ phase: 2 })).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 13],
      ['b', 4],
    ]);
  });

  it('detects next phase availability', () => {
    expect(phaseSuivanteDisponible(scene({ phase: 1 }))).toBe(true);
    expect(phaseSuivanteDisponible(scene({ phase: 2 }))).toBe(true);
    expect(phaseSuivanteDisponible(scene({ phase: 3 }))).toBe(false);
  });

  it('starts the next round on phase 1 and keeps the first participant active when initiatives are reused', () => {
    const next = appliquerNouveauRoundPhases(scene({ phase: 3, activeId: 'a' }));

    expect(next.round).toBe(2);
    expect(next.phase).toBe(1);
    expect(next.activeId).toBe('a');
    expect(next.globalTracker.current).toBe(1);
  });

  it('advances phase scene and participant round statuses once on the new round', () => {
    const next = appliquerNouveauRoundPhases(scene({
      phase: 3,
      statuses: [{ id: 'rain', name: 'Pluie', duration: 2, remaining: 2, advanceOn: 'round', expired: false }],
      participants: [
        participant('a', 23, { statuses: [{ id: 'round', name: 'Tour', duration: 2, remaining: 2, advanceOn: 'round', expired: false }, { id: 'activation', name: 'Activation', duration: 2, remaining: 2, advanceOn: 'activation', expired: false }] }),
        participant('b', 14),
      ],
    }));

    expect(next.statuses[0].remaining).toBe(1);
    expect(next.participants[0].statuses.map((status) => [status.id, status.remaining])).toEqual([['round', 1], ['activation', 1]]);
  });

  it('leaves no active participant while waiting for initiative reroll', () => {
    const next = appliquerNouveauRoundPhases(scene({ phase: 3, activeId: 'a', phaseRerollEachRound: true }));

    expect(next.round).toBe(2);
    expect(next.phase).toBe(1);
    expect(next.activeId).toBe('');
    expect(phasesAttendRelanceInitiative(next)).toBe(true);
    expect(participantsPhase(next)).toEqual([]);
    expect(premierParticipantPhase(next)).toBe('');
  });

  it('does not wait for reroll outside phase mode', () => {
    expect(phasesAttendRelanceInitiative(scene({ temporalite: temporalityModes.CLASSIC, phaseRerollEachRound: true, activeId: '' }))).toBe(false);
  });

  it('uses checked phase participation without decrementing initiative', () => {
    const checkedScene = scene({
      phaseActionMode: phaseActionModes.CHECKED,
      phaseCount: 4,
      phase: 2,
      phaseRerollEachRound: true,
      participants: [
        participant('a', 23, { phaseActions: ['1', '3'] }),
        participant('b', 14, { phaseActions: ['3'] }),
        participant('c', 8, { phaseActions: ['4'] }),
      ],
    });

    expect(phasesAttendRelanceInitiative({ ...checkedScene, activeId: '' })).toBe(false);
    expect(participantsPhase(checkedScene)).toEqual([]);
    expect(phaseSuivanteDisponible(checkedScene)).toBe(true);
    expect(participantsPhase({ ...checkedScene, phase: 3 }).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 23],
      ['b', 14],
    ]);
  });
});
