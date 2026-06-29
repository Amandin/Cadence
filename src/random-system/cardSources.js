import { RandomSystemError } from './core/errors.js';
import { randomSourceKinds } from './core/constants.js';
import { randomInteger, secureRandomFloat } from './random.js';

let cardDrawSequence = 0;

function cleanId(value, fallback) {
  return String(value || '').trim() || fallback;
}

export function normalizeCardSource(source, index = 0) {
  const cards = (Array.isArray(source?.cards) ? source.cards : [])
    .map((card, cardIndex) => {
      const label = String(card?.label ?? card ?? '').trim();
      if (!label) return null;
      return {
        id: cleanId(card?.id, `card-${cardIndex + 1}`),
        label,
        value: card?.value ?? label,
        symbol: String(card?.symbol || '').trim(),
        image: String(card?.image || '').trim(),
        comment: String(card?.comment || '').trim(),
        markers: Array.isArray(card?.markers)
          ? card.markers.map((marker) => String(marker).trim()).filter(Boolean)
          : [],
      };
    })
    .filter(Boolean);
  return {
    id: cleanId(source?.id, `card-source-${index + 1}`),
    name: String(source?.name || '').trim() || `Source de cartes ${index + 1}`,
    note: String(source?.note || '').trim(),
    kind: randomSourceKinds.CARDS,
    cards,
  };
}

export function shuffleCardIds(cardIds, rng = secureRandomFloat) {
  const shuffled = [...cardIds];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1, rng);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function createCardSourceState(source, rng = secureRandomFloat) {
  const normalized = normalizeCardSource(source);
  return {
    sourceId: normalized.id,
    drawPile: shuffleCardIds(normalized.cards.map((card) => card.id), rng),
    discardPile: [],
    shuffleCount: 1,
  };
}

export function normalizeCardSourceState(source, state) {
  const normalized = normalizeCardSource(source);
  const validIds = new Set(normalized.cards.map((card) => card.id));
  const used = new Set();
  const cleanPile = (values) => (Array.isArray(values) ? values : [])
    .map(String)
    .filter((id) => validIds.has(id) && !used.has(id) && used.add(id));
  const drawPile = cleanPile(state?.drawPile);
  const discardPile = cleanPile([
    ...(Array.isArray(state?.discardPile) ? state.discardPile : []),
    ...(Array.isArray(state?.hand) ? state.hand : []),
  ]);
  normalized.cards.forEach((card) => {
    if (!used.has(card.id)) drawPile.push(card.id);
  });
  return {
    sourceId: normalized.id,
    drawPile,
    discardPile,
    shuffleCount: Math.max(0, Number(state?.shuffleCount) || 0),
  };
}

export function drawCards(source, state, count = 1, {
  rng = secureRandomFloat,
  now = Date.now(),
  withReplacement = false,
} = {}) {
  const normalized = normalizeCardSource(source);
  if (!normalized.cards.length) {
    throw new RandomSystemError('empty-deck', `Le paquet ${normalized.name} ne contient aucune carte.`);
  }
  const current = state ? normalizeCardSourceState(normalized, state) : createCardSourceState(normalized, rng);
  const cardMap = new Map(normalized.cards.map((card) => [card.id, card]));
  const requestedCount = Math.min(1000, Math.max(1, Math.trunc(Number(count) || 1)));
  let cards;
  let nextState;
  if (withReplacement) {
    cards = Array.from(
      { length: requestedCount },
      () => normalized.cards[randomInteger(normalized.cards.length, rng)],
    );
    nextState = current;
  } else {
    const drawCount = Math.min(current.drawPile.length, requestedCount);
    const drawnIds = current.drawPile.slice(0, drawCount);
    cards = drawnIds.map((id) => cardMap.get(id)).filter(Boolean);
    nextState = {
      ...current,
      drawPile: current.drawPile.slice(drawCount),
      discardPile: [...current.discardPile, ...drawnIds],
    };
  }
  cardDrawSequence += 1;
  return {
    state: nextState,
    result: {
      id: `${now}-${normalized.id}-cards-${cardDrawSequence}`,
      kind: 'card-draw',
      sourceId: normalized.id,
      sourceName: normalized.name,
      rolledAt: now,
      cards,
      remaining: nextState.drawPile.length,
      drawMode: withReplacement ? 'replacement' : 'draw',
    },
  };
}

export function returnCardsToSource(source, state, cardIds, rng = secureRandomFloat) {
  const current = normalizeCardSourceState(source, state);
  const selected = new Set((Array.isArray(cardIds) ? cardIds : [cardIds]).map(String));
  const returned = current.discardPile.filter((id) => selected.has(id));
  return {
    ...current,
    discardPile: current.discardPile.filter((id) => !selected.has(id)),
    drawPile: shuffleCardIds([...current.drawPile, ...returned], rng),
    shuffleCount: current.shuffleCount + 1,
  };
}

export function resetCardSource(source, rng = secureRandomFloat) {
  return createCardSourceState(source, rng);
}
