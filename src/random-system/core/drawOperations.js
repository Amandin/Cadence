import { MAX_DRAWS_PER_COMPONENT, MAX_TRANSFORM_ITERATIONS } from './constants.js';
import { matchesCondition } from './conditions.js';
import { RandomSystemError } from './errors.js';
import { resolveValue } from './references.js';
import { drawNormalizedRandomSource } from './sources.js';
import { boundedInteger } from './utils.js';

export function appliesToDraw(step, draw) {
  return !step.componentIds.length || step.componentIds.includes(draw.componentId);
}

export function isStepEnabled(step, options) {
  if (!step.enabledWhen) return true;
  return options[step.enabledWhen.optionId] === step.enabledWhen.equals;
}

function makeDraw(component, source, outcome, initialIndex, chainIndex, idSequence, extra = {}) {
  const numeric = Number(outcome.value);
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
    calculatedValue: Number.isFinite(numeric) ? numeric : outcome.value,
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
    const sourceId = String(resolveValue(component.source, context.parameters, ''));
    const source = context.sourceMap.get(sourceId);
    if (!source) {
      throw new RandomSystemError(
        'missing-source',
        `La source du groupe « ${component.label} » est introuvable.`,
        { componentId: component.id, sourceId },
      );
    }
    const count = boundedInteger(
      resolveValue(component.count, context.parameters, 1),
      0,
      MAX_DRAWS_PER_COMPONENT,
      1,
    );
    for (let initialIndex = 0; initialIndex < count; initialIndex += 1) {
      idSequence += 1;
      draws.push(makeDraw(component, source, drawNormalizedRandomSource(source, rng), initialIndex, 0, idSequence));
    }
  }
  return { draws, nextId: () => { idSequence += 1; return idSequence; } };
}

export function rerollDraws(drawState, step, context, rng) {
  const maxIterations = boundedInteger(step.maxIterations, 1, MAX_TRANSFORM_ITERATIONS, 1);
  const candidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  for (const original of candidates) {
    let current = original;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      if (!matchesCondition(current, step.condition, context)) break;
      current.rerolled = true;
      const source = context.sourceMap.get(current.sourceId);
      const component = context.componentMap.get(current.componentId);
      const replacement = makeDraw(
        component,
        source,
        drawNormalizedRandomSource(source, rng),
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
  const maxIterations = boundedInteger(step.maxIterations, 1, MAX_TRANSFORM_ITERATIONS, 6);
  const candidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  for (const original of candidates) {
    let current = original;
    for (let iteration = 0; iteration < maxIterations; iteration += 1) {
      if (!matchesCondition(current, step.condition, context)) break;
      const source = context.sourceMap.get(current.sourceId);
      const component = context.componentMap.get(current.componentId);
      const exploded = makeDraw(
        component,
        source,
        drawNormalizedRandomSource(source, rng),
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
