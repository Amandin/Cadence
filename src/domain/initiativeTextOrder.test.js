import { describe, expect, it } from 'vitest';
import { initiativeTextOrderPresetIds, initiativeTextValue, initiativeToNumber, normalizeInitiativeTextOrder, presetInitiativeTextOrder, composeInitiativeLabel, splitInitiativeLabel } from './initiativeTextOrder.js';
import { ordreCreneauxClassique, trierParInitiative } from './initiative.js';

const cards = presetInitiativeTextOrder(initiativeTextOrderPresetIds.CARDS);

describe('initiativeTextOrder', () => {
  it('compose une initiative depuis deux choix de menus', () => {
    expect(composeInitiativeLabel(['As', 'Cœur'], cards)).toBe('As de Cœur');
    expect(splitInitiativeLabel('Valet de Trèfle', cards)).toEqual(['Valet', 'Trèfle']);
  });

  it('convertit les cartes en valeur numérique invisible', () => {
    expect(initiativeTextValue('As de Cœur', cards)).toBeGreaterThan(initiativeTextValue('Roi de Cœur', cards));
    expect(initiativeTextValue('As de Pique', cards)).toBeGreaterThan(initiativeTextValue('As de Trèfle', cards));
  });

  it('préserve les nombres quand le mode texte est actif', () => {
    expect(initiativeToNumber(12, cards)).toBe(12);
    expect(initiativeToNumber('12', cards)).toBe(12);
  });

  it('normalise un preset sans doublons', () => {
    const config = normalizeInitiativeTextOrder({ enabled: true, parts: [{ label: 'Carte', values: ['As', 'as', 'Roi'] }] });
    expect(config.parts[0].values).toEqual(['As', 'Roi']);
  });

  it('branche la conversion sur le tri central', () => {
    const participants = trierParInitiative([
      { id: 'a', name: 'A', initiative: 'Roi de Cœur' },
      { id: 'b', name: 'B', initiative: 'As de Trèfle' },
      { id: 'c', name: 'C', initiative: 'As de Pique' },
    ], { initiativeTextOrder: cards });
    expect(participants.map((participant) => participant.id)).toEqual(['c', 'b', 'a']);
  });

  it('branche la conversion sur les créneaux multiples', () => {
    const [slot] = ordreCreneauxClassique([
      { id: 'a', name: 'A', initiative: 'Roi de Cœur', actionSlots: [{ id: 'slot-1', initiative: 'Roi de Cœur' }] },
      { id: 'b', name: 'B', initiative: 'As de Pique', actionSlots: [{ id: 'slot-1', initiative: 'As de Pique' }] },
    ], { initiativeTextOrder: cards });
    expect(slot.id).toBe('b');
    expect(slot.initiative).toBe('As de Pique');
  });
});
