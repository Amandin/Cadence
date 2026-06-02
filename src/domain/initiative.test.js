import { describe, expect, it } from 'vitest';
import { equalityRules, initiativeOrders } from '../constants.js';
import {
  grouperAffichageParticipants,
  initiativeDePhase,
  nombreCreneauxAction,
  ordreCreneauxClassique,
  participantActifEnPhase,
  participantsEnAttentePhase,
  participantsPourPhase,
  phaseSuivanteExiste,
  trierParInitiative,
  trierReserve,
} from './initiative.js';

const baseOrder = ['PJ', 'Opposant', 'Allié', 'Environnement'];

function participant(overrides) {
  return {
    id: overrides.id,
    name: overrides.name || overrides.id,
    kind: overrides.kind || 'PJ',
    initiative: overrides.initiative ?? 0,
    departage: overrides.departage ?? '',
    ...overrides,
  };
}

describe('initiative phases', () => {
  const participants = [
    participant({ id: 'a', name: 'A', initiative: 23 }),
    participant({ id: 'b', name: 'B', initiative: 14 }),
    participant({ id: 'c', name: 'C', initiative: 8 }),
  ];

  it('computes SR5-like phase initiative without mutating the source participant', () => {
    const source = participant({ id: 'runner', initiative: 23 });

    expect(initiativeDePhase(source, 1, 10)).toBe(23);
    expect(initiativeDePhase(source, 2, 10)).toBe(13);
    expect(initiativeDePhase(source, 3, 10)).toBe(3);
    expect(source.initiative).toBe(23);
  });

  it('keeps only participants with positive current phase initiative', () => {
    expect(participantsPourPhase(participants, 1, 10).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 23],
      ['b', 14],
      ['c', 8],
    ]);
    expect(participantsPourPhase(participants, 2, 10).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 13],
      ['b', 4],
    ]);
    expect(participantsPourPhase(participants, 3, 10).map((item) => [item.id, item.initiative])).toEqual([
      ['a', 3],
    ]);
  });

  it('detects waiting participants and next phase availability', () => {
    expect(participantActifEnPhase(participants[2], 2, 10)).toBe(false);
    expect(participantsEnAttentePhase(participants, 2, 10).map((item) => item.id)).toEqual(['c']);
    expect(phaseSuivanteExiste(participants, 1, 10)).toBe(true);
    expect(phaseSuivanteExiste(participants, 2, 10)).toBe(true);
    expect(phaseSuivanteExiste(participants, 3, 10)).toBe(false);
  });
});

describe('initiative sorting and simultaneous groups', () => {
  it('expands action slots for classic turn order without duplicating participant data', () => {
    const boss = participant({ id: 'boss', name: 'Boss', initiative: 18, actionSlots: [{ initiative: 18 }, { initiative: 12 }, { initiative: 6 }] });
    const rogue = participant({ id: 'rogue', name: 'Rogue', initiative: 15 });
    const order = ordreCreneauxClassique([boss, rogue], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER });

    expect(nombreCreneauxAction(boss)).toBe(3);
    expect(order.map((slot) => [slot.id, slot.initiative, slot.actionSlotIndex, slot.actionSlotCount])).toEqual([
      ['boss', 18, 0, 3],
      ['rogue', 15, 0, 1],
      ['boss', 12, 1, 3],
      ['boss', 6, 2, 3],
    ]);
  });

  it('can disable extra action slots through initiative rules', () => {
    const boss = participant({ id: 'boss', name: 'Boss', initiative: 18, actionSlots: [{ initiative: 18 }, { initiative: 12 }, { initiative: 6 }] });
    const rogue = participant({ id: 'rogue', name: 'Rogue', initiative: 15 });
    const order = ordreCreneauxClassique([boss, rogue], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER, multipleActionSlots: false });

    expect(nombreCreneauxAction(boss)).toBe(3);
    expect(order.map((slot) => [slot.id, slot.initiative])).toEqual([
      ['boss', 18],
      ['rogue', 15],
    ]);
  });

  it('can walk classic action slots in ascending initiative order', () => {
    const boss = participant({ id: 'boss', name: 'Boss', initiative: 18, actionSlots: [{ initiative: 18 }, { initiative: 12 }, { initiative: 6 }] });
    const rogue = participant({ id: 'rogue', name: 'Rogue', initiative: 15 });
    const order = ordreCreneauxClassique([boss, rogue], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER, initiativeOrder: initiativeOrders.ASC });

    expect(order.map((slot) => [slot.id, slot.initiative])).toEqual([
      ['boss', 6],
      ['boss', 12],
      ['rogue', 15],
      ['boss', 18],
    ]);
  });

  it('sorts initiative by initiative, tie breaker, then configured category order', () => {
    const sorted = trierParInitiative([
      participant({ id: 'ally', kind: 'Allié', initiative: 10, departage: 0 }),
      participant({ id: 'opponent', kind: 'Opposant', initiative: 10, departage: 0 }),
      participant({ id: 'player', kind: 'PJ', initiative: 10, departage: 0 }),
      participant({ id: 'fast', kind: 'PJ', initiative: 12, departage: 0 }),
      participant({ id: 'tie', kind: 'PJ', initiative: 10, departage: 3 }),
    ], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER });

    expect(sorted.map((item) => item.id)).toEqual(['fast', 'tie', 'player', 'opponent', 'ally']);
  });

  it('ignores preserved tie breaker values when the field is hidden', () => {
    const sorted = trierParInitiative([
      participant({ id: 'zulu', name: 'Zulu', kind: 'PJ', initiative: 10, departage: 8 }),
      participant({ id: 'alpha', name: 'Alpha', kind: 'PJ', initiative: 10, departage: 1 }),
    ], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER, tiebreakerVisible: false });

    expect(sorted.map((item) => item.id)).toEqual(['alpha', 'zulu']);
  });

  it('can organize a flexible list by category then name without initiative', () => {
    const sorted = trierParInitiative([
      participant({ id: 'zulu', name: 'Zulu', kind: 'PJ', initiative: 99, departage: 8 }),
      participant({ id: 'bravo', name: 'Bravo', kind: 'Opposant', initiative: 1, departage: 9 }),
      participant({ id: 'alpha', name: 'Alpha', kind: 'PJ', initiative: 2, departage: 1 }),
    ], { categoryOrder: baseOrder, equalityRule: equalityRules.LOOSE, initiativeEnabled: false });

    expect(sorted.map((item) => item.id)).toEqual(['alpha', 'zulu', 'bravo']);
  });

  it('sorts participants by low initiative first when configured', () => {
    const sorted = trierParInitiative([
      participant({ id: 'slow', kind: 'PJ', initiative: 5, departage: 0 }),
      participant({ id: 'fast', kind: 'PJ', initiative: 12, departage: 0 }),
      participant({ id: 'middle', kind: 'PJ', initiative: 8, departage: 0 }),
    ], { categoryOrder: baseOrder, equalityRule: equalityRules.NEVER, initiativeOrder: initiativeOrders.ASC });

    expect(sorted.map((item) => item.id)).toEqual(['slow', 'middle', 'fast']);
  });

  it('keeps strict simultaneous groups when initiative, tie breaker and category are identical', () => {
    const grouped = grouperAffichageParticipants([
      participant({ id: 'a', kind: 'PJ', initiative: 12, departage: 2 }),
      participant({ id: 'b', kind: 'PJ', initiative: 12, departage: 2 }),
      participant({ id: 'c', kind: 'Opposant', initiative: 12, departage: 2 }),
    ], { categoryOrder: baseOrder, equalityRule: equalityRules.STRICT });

    expect(grouped).toHaveLength(2);
    expect(grouped[0].simultaneous).toBe(true);
    expect(grouped[0].participants.map((item) => item.id)).toEqual(['a', 'b']);
    expect(grouped[1].simultaneous).toBe(false);
    expect(grouped[1].participants[0].id).toBe('c');
  });
});

describe('reserve sorting', () => {
  it('ignores initiative and sorts by category, tie breaker, then name', () => {
    const sorted = trierReserve([
      participant({ id: 'zombie', name: 'Zombie', kind: 'Opposant', initiative: 99, departage: 1 }),
      participant({ id: 'alpha', name: 'Alpha', kind: 'Opposant', initiative: 1, departage: 1 }),
      participant({ id: 'bravo', name: 'Bravo', kind: 'Opposant', initiative: 50, departage: 3 }),
      participant({ id: 'player', name: 'PJ', kind: 'PJ', initiative: 0, departage: 0 }),
      participant({ id: 'ally', name: 'Allié', kind: 'Allié', initiative: 80, departage: 10 }),
    ], { categoryOrder: baseOrder });

    expect(sorted.map((item) => item.id)).toEqual(['player', 'bravo', 'alpha', 'zombie', 'ally']);
  });
});
