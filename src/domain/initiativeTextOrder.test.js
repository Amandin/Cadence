import { describe, expect, it } from 'vitest';
import { initiativeLabelFromCard, initiativeLabelFromCardDraw, initiativeTextOrderFromCardSource, initiativeTextOrderPresetIds, initiativeTextValue, initiativeToNumber, normalizeInitiativeTextOrder, presetInitiativeTextOrder, composeInitiativeLabel, splitInitiativeLabel } from './initiativeTextOrder.js';
import { ordreCreneauxClassique, trierParInitiative } from './initiative.js';
import { createFrenchTarotCardSource, createStandard54CardSource } from '../random-system/cardSourceDefaults.js';

const cards = presetInitiativeTextOrder(initiativeTextOrderPresetIds.CARDS);

describe('initiativeTextOrder', () => {
  it('compose une initiative depuis deux choix de menus', () => {
    expect(composeInitiativeLabel(['A', '♥'], cards)).toBe('A♥');
    expect(splitInitiativeLabel('V♣', cards)).toEqual(['V', '♣']);
  });

  it('convertit les cartes en valeur numérique invisible', () => {
    expect(initiativeTextValue('A♥', cards)).toBeGreaterThan(initiativeTextValue('R♥', cards));
    expect(initiativeTextValue('A♠', cards)).toBeGreaterThan(initiativeTextValue('A♣', cards));
    expect(initiativeTextValue('As de Cœur', cards)).toBeGreaterThan(initiativeTextValue('Roi de Cœur', cards));
  });

  it('préserve les nombres quand le mode texte est actif', () => {
    expect(initiativeToNumber(12, cards)).toBe(12);
    expect(initiativeToNumber('12', cards)).toBe(12);
  });

  it('compose le libelle d initiative depuis les parties d une carte liee', () => {
    expect(initiativeLabelFromCard({
      id: 'as-pique',
      label: 'Carte haute noire',
      value: 1,
      rank: 'A',
      suit: '♠',
      color: 'noir',
      markers: [],
    }, cards)).toBe('A♠');
  });

  it('derive les menus d initiative depuis un paquet standard lie', () => {
    const source = createStandard54CardSource();
    const config = initiativeTextOrderFromCardSource(source);
    expect(config.preset).toBe(initiativeTextOrderPresetIds.CARDS);
    expect(config.cardSourceId).toBe('standard-54-cards');
    expect(config.parts.map((part) => part.label)).toEqual(['Valeur', 'Couleur']);
    expect(config.parts[0].values).toEqual(['🃏', 'A', 'R', 'D', 'V', '10', '9', '8', '7', '6', '5', '4', '3', '2']);
    expect(config.parts[1].values).toEqual(['♠', '♥', '♦', '♣']);
    expect(initiativeLabelFromCard(source.cards[0], config)).toBe('A♠');
    expect(initiativeLabelFromCardDraw({ cards: [source.cards[0]] }, config)).toBe('A♠');
    expect(initiativeLabelFromCardDraw({ cards: [] }, config)).toBe('');
    expect(initiativeLabelFromCardDraw({ cards: [{ label: 'Carte inconnue' }] }, config)).toBe('');
  });

  it('derive les libelles d initiative depuis un paquet de tarot lie', () => {
    const config = initiativeTextOrderFromCardSource(createFrenchTarotCardSource());
    expect(config.cardSourceId).toBe('french-tarot-78-cards');
    expect(config.parts[0].values).toContain('21');
    expect(config.parts[1].values).toContain('★');
    expect(initiativeLabelFromCard(createFrenchTarotCardSource().cards.find((card) => card.id === 'atout-21'), config)).toBe('21★');
  });

  it('normalise un preset sans doublons', () => {
    const config = normalizeInitiativeTextOrder({ enabled: true, parts: [{ label: 'Carte', values: ['As', 'as', 'Roi'] }] });
    expect(config.parts[0].values).toEqual(['As', 'Roi']);
  });

  it('accepte plus ou moins de menus de labels', () => {
    const config = normalizeInitiativeTextOrder({
      enabled: true,
      separator: ' / ',
      separators: [' / ', ' - '],
      parts: [
        { label: 'Vitesse', values: ['Rapide', 'Lent'] },
        { label: 'Posture', values: ['Haut', 'Bas'] },
        { label: 'Priorite', values: ['A', 'B'] },
      ],
    });
    expect(config.parts).toHaveLength(3);
    expect(composeInitiativeLabel(['Rapide', 'Bas', 'A'], config)).toBe('Rapide / Bas - A');
    expect(splitInitiativeLabel('Rapide / Bas - A', config)).toEqual(['Rapide', 'Bas', 'A']);
  });

  it('branche la conversion sur le tri central', () => {
    const participants = trierParInitiative([
      { id: 'a', name: 'A', initiative: 'R♥' },
      { id: 'b', name: 'B', initiative: 'A♣' },
      { id: 'c', name: 'C', initiative: 'A♠' },
    ], { initiativeTextOrder: cards });
    expect(participants.map((participant) => participant.id)).toEqual(['c', 'b', 'a']);
  });

  it('branche la conversion sur les créneaux multiples', () => {
    const [slot] = ordreCreneauxClassique([
      { id: 'a', name: 'A', initiative: 'R♥', actionSlots: [{ id: 'slot-1', initiative: 'R♥' }] },
      { id: 'b', name: 'B', initiative: 'A♠', actionSlots: [{ id: 'slot-1', initiative: 'A♠' }] },
    ], { initiativeTextOrder: cards });
    expect(slot.id).toBe('b');
    expect(slot.initiative).toBe('A♠');
  });
});
