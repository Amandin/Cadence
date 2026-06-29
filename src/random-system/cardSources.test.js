import { describe, expect, it } from 'vitest';
import {
  drawCards,
  resetCardSource,
  returnCardsToSource,
} from './cardSources.js';

const deck = {
  id: 'omens',
  name: 'Présages',
  cards: [
    {
      id: 'sun',
      label: 'Soleil',
      symbol: '☀️',
      image: 'https://example.test/sun.png',
      comment: 'Un présage favorable.',
    },
    { id: 'moon', label: 'Lune' },
    { id: 'star', label: 'Étoile' },
  ],
};

describe('RandomSystem decks', () => {
  it('automatically discards drawn cards', () => {
    const initial = resetCardSource(deck, () => 0.999);
    const draw = drawCards(deck, initial, 2, { now: 5 });
    expect(draw.result.cards.map((card) => card.id)).toEqual(['sun', 'moon']);
    expect(draw.result.cards[0]).toMatchObject({
      symbol: '☀️',
      image: 'https://example.test/sun.png',
      comment: 'Un présage favorable.',
    });
    expect(draw.state.drawPile).toEqual(['star']);
    expect(draw.state).not.toHaveProperty('hand');
    expect(draw.state.discardPile).toEqual(['sun', 'moon']);

    const returned = returnCardsToSource(deck, draw.state, ['sun'], () => 0.999);
    expect(returned.discardPile).toEqual(['moon']);
    expect(returned.drawPile).toEqual(['star', 'sun']);
    expect(returned).not.toHaveProperty('hand');
  });

  it('draws independently and keeps the full deck with replacement', () => {
    const initial = resetCardSource(deck, () => 0.999);
    const draw = drawCards(deck, initial, 4, { rng: () => 0, withReplacement: true });

    expect(draw.result.cards.map((card) => card.id)).toEqual(['sun', 'sun', 'sun', 'sun']);
    expect(draw.state.drawPile).toEqual(['sun', 'moon', 'star']);
    expect(draw.state.discardPile).toEqual([]);
    expect(draw.result.remaining).toBe(3);
  });

  it('does not silently reshuffle an empty draw pile', () => {
    const singleDeck = { ...deck, cards: [deck.cards[0]] };
    const initial = resetCardSource(singleDeck, () => 0);
    const first = drawCards(singleDeck, initial, 1);
    const second = drawCards(singleDeck, first.state, 1);
    expect(first.result.cards).toHaveLength(1);
    expect(second.result.cards).toHaveLength(0);
  });

  it('keeps card draw result ids unique inside the same millisecond', () => {
    const initial = resetCardSource(deck, () => 0);
    const first = drawCards(deck, initial, 1, { now: 5 });
    const second = drawCards(deck, first.state, 1, { now: 5 });

    expect(first.result.id).not.toBe(second.result.id);
  });
});
