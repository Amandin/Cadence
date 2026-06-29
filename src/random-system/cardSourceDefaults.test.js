import { describe, expect, it } from 'vitest';
import {
  createFrenchTarotCardSource,
  createStandard54CardSource,
} from './cardSourceDefaults.js';

describe('RandomSystem standard decks', () => {
  it('creates a complete 54-card deck with two jokers', () => {
    const deck = createStandard54CardSource();
    expect(deck.cards).toHaveLength(54);
    expect(new Set(deck.cards.map((card) => card.id)).size).toBe(54);
    expect(deck.cards.filter((card) => card.markers.includes('joker'))).toHaveLength(2);
    expect(deck.cards.filter((card) => card.markers.includes('rouge'))).toHaveLength(27);
    expect(deck.cards.filter((card) => card.markers.includes('noir'))).toHaveLength(27);
  });

  it('creates a 78-card French tarot with four suits, trumps and the Excuse', () => {
    const deck = createFrenchTarotCardSource();
    expect(deck.cards).toHaveLength(78);
    expect(new Set(deck.cards.map((card) => card.id)).size).toBe(78);
    expect(deck.cards.filter((card) => card.markers.includes('atout'))).toHaveLength(22);
    expect(deck.cards.find((card) => card.id === 'excuse')?.label).toBe('L’Excuse');
    expect(deck.cards.filter((card) => card.id.startsWith('cavalier-'))).toHaveLength(4);
  });
});
