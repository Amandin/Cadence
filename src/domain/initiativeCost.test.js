import { describe, expect, it } from 'vitest';
import { rulesAllowMultipleSlots } from './initiativeCost.js';
import { ordreCreneauxClassique } from './initiative.js';

const eliteOnlyRules = {
  multipleActionMode: 'manual',
  manualMultipleActionScope: 'elite-only',
  participantTypes: [{ name: 'Boss', behaviorType: 'Élite' }],
};

describe('manual multiple action scope', () => {
  it('allows only Elite behavior, including inherited custom types', () => {
    expect(rulesAllowMultipleSlots(eliteOnlyRules, { kind: 'Élite' })).toBe(true);
    expect(rulesAllowMultipleSlots(eliteOnlyRules, { kind: 'Boss' })).toBe(true);
    expect(rulesAllowMultipleSlots(eliteOnlyRules, { kind: 'PJ' })).toBe(false);
    expect(rulesAllowMultipleSlots(eliteOnlyRules, { kind: 'Opposant' })).toBe(false);
  });

  it('keeps all manual participants enabled by default', () => {
    expect(rulesAllowMultipleSlots({ multipleActionMode: 'manual' }, { kind: 'PJ' })).toBe(true);
  });

  it('emits one slot for ordinary participants and every slot for Elite behavior', () => {
    const participants = [
      { id: 'pj', name: 'PJ', kind: 'PJ', initiative: 15, actionSlots: [{ id: 'a', initiative: 15 }, { id: 'b', initiative: 5 }] },
      { id: 'boss', name: 'Boss', kind: 'Boss', initiative: 14, actionSlots: [{ id: 'a', initiative: 14 }, { id: 'b', initiative: 4 }] },
    ];
    const slots = ordreCreneauxClassique(participants, { multipleActionSlots: (participant) => rulesAllowMultipleSlots(eliteOnlyRules, participant) });
    expect(slots.filter((slot) => slot.id === 'pj')).toHaveLength(1);
    expect(slots.filter((slot) => slot.id === 'boss')).toHaveLength(2);
  });
});
