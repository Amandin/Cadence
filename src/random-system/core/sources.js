import { MAX_SOURCE_OUTCOMES, randomSourceKinds } from './constants.js';
import { RandomSystemError } from './errors.js';
import { randomInteger, randomUnit, secureRandomFloat } from '../random.js';
import { normalizeCardSource } from '../cardSources.js';
import { cleanId, cleanLabel, finiteNumber, primitiveValue } from './utils.js';

const UINT32_RANGE = 0x100000000;
const weightedDistributionCache = new WeakMap();

export function createUniformSource({
  id,
  name,
  note = '',
  min = 1,
  max = 6,
  step = 1,
  labels = {},
  symbols = {},
  images = {},
  texts = {},
} = {}) {
  const safeStep = Math.max(Number.EPSILON, Math.abs(finiteNumber(step, 1)));
  const safeMin = finiteNumber(min, 1);
  const safeMax = Math.max(safeMin, finiteNumber(max, 6));
  return normalizeRandomSource({
    id: cleanId(id, `source-${safeMin}-${safeMax}`),
    name: cleanLabel(name, `${safeMin}-${safeMax}`),
    note,
    kind: randomSourceKinds.UNIFORM,
    min: safeMin,
    max: safeMax,
    step: safeStep,
    labels,
    symbols,
    images,
    texts,
  });
}

export function createWeightedSource({ id, name, note = '', outcomes = [] } = {}) {
  return normalizeRandomSource({
    id: cleanId(id, 'source-weighted'),
    name: cleanLabel(name, 'Source ponderee'),
    note,
    kind: randomSourceKinds.WEIGHTED,
    outcomes,
  });
}

function normalizeOutcome(outcome, index) {
  const value = primitiveValue(outcome?.value ?? outcome?.label ?? index + 1);
  const label = cleanLabel(outcome?.label, String(value));
  return {
    id: cleanId(outcome?.id, `outcome-${index + 1}`),
    value,
    label,
    symbol: typeof outcome?.symbol === 'string' ? outcome.symbol : '',
    image: typeof outcome?.image === 'string' ? outcome.image.trim() : '',
    text: typeof outcome?.text === 'string' ? outcome.text.trim() : '',
    weight: Math.max(0, finiteNumber(outcome?.weight, 1)),
    markers: Array.isArray(outcome?.markers)
      ? outcome.markers.map((marker) => String(marker).trim()).filter(Boolean)
      : [],
  };
}

export function normalizeRandomSource(source, index = 0) {
  const id = cleanId(source?.id, `source-${index + 1}`);
  const name = cleanLabel(source?.name, `Source ${index + 1}`);
  const note = typeof source?.note === 'string' ? source.note.trim() : '';
  if (source?.kind === randomSourceKinds.WEIGHTED) {
    const outcomes = (Array.isArray(source.outcomes) ? source.outcomes : [])
      .map(normalizeOutcome)
      .filter((outcome) => outcome.weight > 0);
    return { id, name, note, kind: randomSourceKinds.WEIGHTED, outcomes };
  }
  if (source?.kind === randomSourceKinds.CARDS) {
    return normalizeCardSource({ ...source, id, name, note }, index);
  }

  const min = finiteNumber(source?.min, 1);
  const max = Math.max(min, finiteNumber(source?.max, 6));
  const step = Math.max(Number.EPSILON, Math.abs(finiteNumber(source?.step, 1)));
  const labels = Object.fromEntries(
    Object.entries(source?.labels && typeof source.labels === 'object' ? source.labels : {})
      .map(([value, label]) => [String(value), String(label || '').trim()])
      .filter(([, label]) => label),
  );
  const symbols = Object.fromEntries(
    Object.entries(source?.symbols && typeof source.symbols === 'object' ? source.symbols : {})
      .map(([value, symbol]) => [String(value), String(symbol || '').trim()])
      .filter(([, symbol]) => symbol),
  );
  const images = Object.fromEntries(
    Object.entries(source?.images && typeof source.images === 'object' ? source.images : {})
      .map(([value, image]) => [String(value), String(image || '').trim()])
      .filter(([, image]) => image),
  );
  const texts = Object.fromEntries(
    Object.entries(source?.texts && typeof source.texts === 'object' ? source.texts : {})
      .map(([value, text]) => [String(value), String(text || '').trim()])
      .filter(([, text]) => text),
  );
  return {
    id,
    name,
    note,
    kind: randomSourceKinds.UNIFORM,
    min,
    max,
    step,
    labels,
    symbols,
    images,
    texts,
  };
}

export function sourceOutcomes(source) {
  const normalized = normalizeRandomSource(source);
  if (normalized.kind === randomSourceKinds.WEIGHTED) return normalized.outcomes;
  if (normalized.kind === randomSourceKinds.CARDS) {
    return normalized.cards.map((card) => ({
      id: card.id,
      value: card.value,
      label: card.label,
      rank: card.rank,
      suit: card.suit,
      color: card.color,
      symbol: card.symbol,
      image: card.image,
      text: card.comment,
      weight: 1,
      markers: [...card.markers],
    }));
  }

  const count = uniformOutcomeCount(normalized);
  return Array.from({ length: count }, (_, index) => uniformOutcome(normalized, index));
}

function uniformOutcomeCount(source) {
  const count = Math.floor((source.max - source.min) / source.step) + 1;
  if (count > MAX_SOURCE_OUTCOMES) {
    throw new RandomSystemError(
      'source-too-large',
      `La source ${source.name} contient trop de resultats possibles.`,
      { sourceId: source.id, count },
    );
  }
  return Math.max(1, count);
}

function uniformOutcome(source, index) {
  const rawValue = source.min + (index * source.step);
  const value = Number.isInteger(rawValue) ? rawValue : Number(rawValue.toFixed(10));
  return {
    id: `value-${value}`,
    value,
    label: source.labels?.[String(value)] || String(value),
    symbol: source.symbols?.[String(value)] || '',
    image: source.images?.[String(value)] || '',
    text: source.texts?.[String(value)] || '',
    weight: 1,
    markers: [],
  };
}

export function drawNormalizedRandomSource(source, rng = secureRandomFloat) {
  if (source.kind === randomSourceKinds.UNIFORM) {
    const index = randomInteger(uniformOutcomeCount(source), rng);
    return uniformOutcome(source, index);
  }

  const outcomes = source.outcomes;
  if (!outcomes.length) {
    throw new RandomSystemError(
      'empty-source',
      `La source ${source.name} ne contient aucun resultat utilisable.`,
      { sourceId: source.id },
    );
  }

  let distribution = weightedDistributionCache.get(source);
  if (!distribution) {
    const weights = outcomes.map((outcome) => Math.max(0, finiteNumber(outcome.weight, 0)));
    let total = 0;
    const cumulative = weights.map((weight) => {
      total += weight;
      return total;
    });
    if (total <= 0) {
      throw new RandomSystemError(
        'empty-source',
        `La source ${source.name} ne contient aucun resultat utilisable.`,
        { sourceId: source.id },
      );
    }
    distribution = {
      cumulative,
      total,
      integer: weights.every(Number.isSafeInteger) && Number.isSafeInteger(total) && total <= UINT32_RANGE,
    };
    weightedDistributionCache.set(source, distribution);
  }
  const ticket = distribution.integer
    ? randomInteger(distribution.total, rng)
    : randomUnit(rng) * distribution.total;
  let low = 0;
  let high = distribution.cumulative.length - 1;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (ticket < distribution.cumulative[middle]) high = middle;
    else low = middle + 1;
  }
  const selected = outcomes[low];
  return { ...selected, markers: [...selected.markers] };
}

export function drawRandomSource(source, rng = secureRandomFloat) {
  return drawNormalizedRandomSource(normalizeRandomSource(source), rng);
}
