import {
  MAX_DRAWS_PER_COMPONENT,
  randomAggregateOperations,
  randomKeepOrders,
  randomPipelineStepTypes,
} from './constants.js';
import { matchesCondition, numericDrawValue } from './conditions.js';
import { appliesToDraw } from './drawOperations.js';
import { resolveValue } from './references.js';
import { sourceOutcomes } from './sources.js';
import { boundedInteger, cleanId, cleanLabel, finiteNumber } from './utils.js';

export function mapDrawValues(drawState, step, context) {
  const mappings = Array.isArray(step.mappings) ? step.mappings : [];
  for (const draw of drawState.draws) {
    if (draw.rerolled || !appliesToDraw(step, draw)) continue;
    const mapping = mappings.find((item) => matchesCondition(draw, item.condition, context));
    if (mapping) draw.calculatedValue = resolveValue(mapping.value, context.parameters, draw.calculatedValue);
  }
}

export function markSuccesses(drawState, step, context) {
  for (const draw of drawState.draws) {
    if (draw.rerolled || !appliesToDraw(step, draw)) continue;
    draw.success = matchesCondition(draw, step.condition, context);
  }
}

export function applyMarkers(drawState, step, context) {
  const marker = {
    id: cleanId(step.markerId, step.id),
    label: cleanLabel(step.label, cleanLabel(step.markerId, 'Marqueur')),
  };
  for (const draw of drawState.draws) {
    if (draw.rerolled || !appliesToDraw(step, draw)) continue;
    if (matchesCondition(draw, step.condition, context) && !draw.markers.some((item) => item.id === marker.id)) {
      draw.markers.push(marker);
    }
  }
}

export function applyKeep(drawState, step, context) {
  const candidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  const direction = step.order === randomKeepOrders.LOWEST ? 1 : -1;
  const units = step.unit === 'chain'
    ? Array.from(candidates.reduce((groups, draw) => {
      const unitId = `${draw.componentId}:${draw.initialIndex}`;
      const unit = groups.get(unitId) || { id: unitId, draws: [], value: 0 };
      unit.draws.push(draw);
      unit.value += numericDrawValue(draw) ?? 0;
      groups.set(unitId, unit);
      return groups;
    }, new Map()).values())
    : candidates.map((draw) => ({ id: draw.id, draws: [draw], value: numericDrawValue(draw) ?? 0 }));
  const count = boundedInteger(resolveValue(step.count, context.parameters, 1), 0, units.length, 1);
  const sorted = [...units].sort((left, right) => {
    if (left.value !== right.value) return (left.value - right.value) * direction;
    return left.id.localeCompare(right.id);
  });
  const kept = new Set(sorted.slice(0, count).flatMap((unit) => unit.draws.map((draw) => draw.id)));
  candidates.forEach((draw) => { draw.kept = kept.has(draw.id); });
}

function aggregateCandidates(drawState, step) {
  return drawState.draws.filter((draw) => {
    if (draw.rerolled || !appliesToDraw(step, draw)) return false;
    return step.use === 'all' || draw.kept !== false;
  });
}

export function applyAggregate(drawState, step, context) {
  const candidates = aggregateCandidates(drawState, step);
  let value;
  if (step.operation === randomAggregateOperations.VALUES) {
    value = candidates.map((draw) => ({
      drawId: draw.id,
      value: draw.calculatedValue,
      label: draw.outcome.label,
      symbol: draw.outcome.symbol,
    }));
  } else if (step.operation === randomAggregateOperations.COUNT_SUCCESSES) {
    value = candidates.filter((draw) => draw.success).length;
  } else if (step.operation === randomAggregateOperations.COUNT_MATCHES) {
    value = candidates.filter((draw) => matchesCondition(draw, step.condition, context)).length;
  } else if (step.operation === randomAggregateOperations.COUNT_MARKER) {
    value = candidates.filter((draw) => draw.markers.some((marker) => marker.id === step.markerId)).length;
  } else if (step.operation === randomAggregateOperations.SUBTRACT) {
    value = candidates.reduce((result, draw, index) => {
      const numeric = numericDrawValue(draw) ?? 0;
      return index === 0 ? numeric : result - numeric;
    }, 0);
  } else {
    value = candidates.reduce((sum, draw) => sum + (numericDrawValue(draw) ?? 0), 0);
  }
  const aggregate = {
    id: cleanId(step.outputId, step.id),
    label: cleanLabel(step.label, 'Résultat'),
    operation: step.operation || randomAggregateOperations.SUM,
    value,
  };
  drawState.aggregates.set(aggregate.id, aggregate);
}

export function applyOccurrenceBonus(drawState, step, context) {
  const target = drawState.aggregates.get(cleanId(step.targetAggregateId, ''));
  if (!target || !Number.isFinite(Number(target.value))) return;
  const candidates = aggregateCandidates(drawState, step);
  const occurrences = candidates.filter((draw) => matchesCondition(draw, step.condition, context)).length;
  const every = boundedInteger(resolveValue(step.every, context.parameters, 2), 1, MAX_DRAWS_PER_COMPONENT, 2);
  const amount = finiteNumber(resolveValue(step.amount, context.parameters, 0), 0);
  const bonus = Math.floor(occurrences / every) * amount;
  target.value = Number(target.value) + bonus;
  target.adjustments = [...(target.adjustments || []), {
    type: randomPipelineStepTypes.OCCURRENCE_BONUS,
    label: cleanLabel(step.label, 'Bonus d’occurrence'),
    occurrences,
    every,
    amount,
    value: bonus,
  }];
}

export function applyModifier(drawState, step, context) {
  const target = drawState.aggregates.get(cleanId(step.targetAggregateId, ''));
  if (!target || !Number.isFinite(Number(target.value))) return;
  const modifier = finiteNumber(resolveValue(step.value, context.parameters, 0), 0);
  target.value = Number(target.value) + modifier;
  target.adjustments = [...(target.adjustments || []), {
    type: randomPipelineStepTypes.MODIFIER,
    label: cleanLabel(step.label, 'Modificateur'),
    value: modifier,
  }];
}

function outcomeMatchesValue(outcome, targetValue) {
  const outcomeNumber = Number(outcome?.value);
  const targetNumber = Number(targetValue);
  if (Number.isFinite(outcomeNumber) && Number.isFinite(targetNumber)) {
    return outcomeNumber === targetNumber;
  }
  return String(outcome?.value ?? '') === String(targetValue ?? '');
}

export function applyTableLookup(drawState, step, context) {
  const target = drawState.aggregates.get(cleanId(step.targetAggregateId, ''));
  const source = context.sourceMap.get(String(step.sourceId || ''));
  if (!target || !source) return;
  const matched = sourceOutcomes(source).find((outcome) => outcomeMatchesValue(outcome, target.value)) || null;
  drawState.aggregates.set(cleanId(step.outputId, step.id), {
    id: cleanId(step.outputId, step.id),
    label: cleanLabel(step.label, 'Table'),
    operation: randomPipelineStepTypes.LOOKUP_TABLE,
    matchedValue: target.value,
    value: matched?.label || String(target.value ?? ''),
    outcome: matched ? {
      id: matched.id,
      value: matched.value,
      label: matched.label,
      symbol: matched.symbol,
      image: matched.image,
      text: matched.text,
    } : null,
  });
}
