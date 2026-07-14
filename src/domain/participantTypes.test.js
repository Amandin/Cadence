import { describe, expect, it } from 'vitest';
import { normalizeParticipantTypes, resolveParticipantBehavior } from './participantTypes.js';

describe('participant type behaviors', () => {
  it('exposes the six protected standard types', () => {
    const types = normalizeParticipantTypes();
    expect(types.map((type) => type.name)).toEqual(['PJ', 'Compagnon', 'Allié', 'Élite', 'Opposant', 'Environnement']);
    expect(types.every((type) => type.standard)).toBe(true);
  });

  it('inherits the behavior of a standard type for a custom name', () => {
    const types = normalizeParticipantTypes([{ name: 'Boss', behaviorType: 'Élite' }], ['PJ', 'Boss']);
    expect(resolveParticipantBehavior('Boss', types)).toMatchObject({
      type: 'Boss', behaviorType: 'Élite', camp: 'opposition', initiativeEntry: 'character', suggestReserveWhenEmpty: true,
    });
  });

  it('keeps legacy names compatible and gives unknown historical types generic behavior', () => {
    expect(resolveParticipantBehavior('Horloge').behaviorType).toBe('Environnement');
    expect(resolveParticipantBehavior('Dragon').behaviorType).toBe('Opposant');
  });

  it('accepts baseType and reserves an overrides extension point', () => {
    const types = normalizeParticipantTypes([{ name: 'Héros', baseType: 'PJ', overrides: { suggestReserveWhenEmpty: true } }]);
    expect(resolveParticipantBehavior('Héros', types)).toMatchObject({ behaviorType: 'PJ', highlightInFlexible: true, suggestReserveWhenEmpty: true });
  });
});
