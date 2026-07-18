import { MAX_DRAWS_PER_COMPONENT, MAX_TRANSFORM_ITERATIONS } from './constants.js';
import { matchesCondition } from './conditions.js';
import { RandomSystemError } from './errors.js';
import { resolveValue } from './references.js';
import { drawNormalizedRandomSource } from './sources.js';
import { boundedInteger } from './utils.js';
import { randomSourceKinds } from './constants.js';
import { drawCards } from '../cardSources.js';

function drawForComponent(context, component, source, rng) {
  if (source.kind !== randomSourceKinds.CARDS) return drawNormalizedRandomSource(source, rng);
  const draw = drawCards(source, context.sourceStates[source.id], 1, {
    rng,
    withReplacement: component.cardMode === 'replacement',
  });
  context.sourceStates[source.id] = draw.state;
  const card = draw.result.cards[0];
  return card ? {
    id: card.id,
    value: card.value,
    label: card.label,
    symbol: card.symbol,
    image: card.image,
    text: card.comment,
    markers: [...(card.markers || [])],
  } : null;
}

export function appliesToDraw(step, draw) {
  return !step.componentIds.length || step.componentIds.includes(draw.componentId);
}

export function isStepEnabled(step, options) {
  if (!step.enabledWhen) return true;
  const conditions = Array.isArray(step.enabledWhen) ? step.enabledWhen : [step.enabledWhen];
  return conditions.every((condition) => options[condition.optionId] === condition.equals);
}

function makeDraw(component, source, outcome, initialIndex, chainIndex, idSequence, extra = {}) {
  const numeric = Number(outcome.value);
  const multiplier = Number.isFinite(Number(component.multiplier)) ? Number(component.multiplier) : 1;
  return {
    id: `draw-${idSequence}`,
    componentId: component.id,
    componentLabel: component.label,
    componentColor: component.color,
    sourceId: source.id,
    sourceName: source.name,
    initialIndex,
    chainIndex,
    outcome,
    calculatedValue: Number.isFinite(numeric) ? numeric * multiplier : outcome.value,
    markers: outcome.markers.map((marker) => ({ id: marker, label: marker })),
    success: false,
    kept: true,
    rerolled: false,
    ...extra,
  };
}

export function drawInitialComponents(context, rng, groupIndex) {
  const draws = [];
  let idSequence = groupIndex * 100000;
  for (const component of context.definition.components) {
    const componentConditions = Array.isArray(component.enabledWhen)
      ? component.enabledWhen
      : component.enabledWhen ? [component.enabledWhen] : [];
    if (!componentConditions.every((condition) => context.options[condition.optionId] === condition.equals)) continue;
    const sourceId = String(resolveValue(component.source, context.parameters, ''));
    const source = context.sourceMap.get(sourceId);
    if (!source) {
      throw new RandomSystemError(
        'missing-source',
        `La source du groupe « ${component.label} » est introuvable.`,
        { componentId: component.id, sourceId },
      );
    }
    const resolvedCount = Number(resolveValue(component.count, context.parameters, 1));
    if (!Number.isFinite(resolvedCount)) {
      throw new RandomSystemError(
        'invalid-draw-count-calculation',
        `Le calcul du nombre de tirages du groupe \u00ab ${component.label || component.id} \u00bb est invalide, notamment en cas de division par zero.`,
        { componentId: component.id, count: resolvedCount },
      );
    }
    if (!Number.isInteger(resolvedCount)) {
      throw new RandomSystemError(
        'non-integer-draw-count',
        `Le nombre de tirages du groupe \u00ab ${component.label || component.id} \u00bb doit etre entier. Utilisez arrondi.inf(...) ou arrondi.sup(...).`,
        { componentId: component.id, count: resolvedCount },
      );
    }
    const count = boundedInteger(
      resolvedCount,
      0,
      MAX_DRAWS_PER_COMPONENT,
      1,
    );
    const repeatBaseCount = component.repeatBaseCount
      ? Number(resolveValue(component.repeatBaseCount, context.parameters, 1))
      : null;
    if (repeatBaseCount !== null && (!Number.isInteger(repeatBaseCount) || repeatBaseCount < 1)) {
      throw new RandomSystemError('invalid-repeat-size', 'La taille d un appel repete doit etre un entier positif.');
    }
    for (let initialIndex = 0; initialIndex < count; initialIndex += 1) {
      idSequence += 1;
      const outcome = drawForComponent(context, component, source, rng);
      if (!outcome) break;
      draws.push(makeDraw(component, source, outcome, initialIndex, 0, idSequence, repeatBaseCount === null ? {} : {
        repeatIndex: Math.floor(initialIndex / repeatBaseCount),
        repeatInitialIndex: initialIndex % repeatBaseCount,
      }));
    }
  }
  return { draws, nextId: () => { idSequence += 1; return idSequence; } };
}

export function rerollDraws(drawState, step, context, rng) {
  const resolvedIterations = Number(resolveValue(step.maxIterations, context.parameters, 1));
  if (!Number.isInteger(resolvedIterations)) throw new RandomSystemError('non-integer-reroll-limit', 'La limite de relances doit etre entiere.');
  const maxIterations = boundedInteger(resolvedIterations, 1, MAX_TRANSFORM_ITERATIONS, 1);
  const candidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  for (const original of candidates) {
    let current = original;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      if (!matchesCondition(current, step.condition, context)) break;
      current.rerolled = true;
      const source = context.sourceMap.get(current.sourceId);
      const component = context.componentMap.get(current.componentId);
      const outcome = drawForComponent(context, component, source, rng);
      if (!outcome) break;
      const replacement = makeDraw(
        component,
        source,
        outcome,
        current.initialIndex,
        current.chainIndex,
        drawState.nextId(),
        { rerollOf: current.id },
      );
      drawState.draws.push(replacement);
      current = replacement;
    }
  }
}

export function explodeDraws(drawState, step, context, rng) {
  const resolvedIterations = Number(resolveValue(step.maxIterations, context.parameters, 6));
  if (!Number.isInteger(resolvedIterations)) throw new RandomSystemError('non-integer-explosion-limit', 'La limite d explosions doit etre entiere.');
  const maxIterations = boundedInteger(resolvedIterations, 1, MAX_TRANSFORM_ITERATIONS, 6);
  const candidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  for (const original of candidates) {
    let current = original;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      if (!matchesCondition(current, step.condition, context)) break;
      const source = context.sourceMap.get(current.sourceId);
      const component = context.componentMap.get(current.componentId);
      const outcome = drawForComponent(context, component, source, rng);
      if (!outcome) break;
      const exploded = makeDraw(
        component,
        source,
        outcome,
        current.initialIndex,
        current.chainIndex + 1,
        drawState.nextId(),
        { explodedFrom: current.id },
      );
      drawState.draws.push(exploded);
      current = exploded;
    }
  }
}
