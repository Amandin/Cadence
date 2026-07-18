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
import { RandomSystemError } from './errors.js';

const NO_EXPRESSION_VALUE = Symbol('no-expression-value');

function requiredInteger(reference, context, fallback, label) {
  const value = Number(resolveValue(reference, context.parameters, fallback));
  if (!Number.isInteger(value)) {
    throw new RandomSystemError('non-integer-setting', `${label} doit etre entier. Utilisez arrondi.inf(...) ou arrondi.sup(...).`);
  }
  return value;
}

function expressionComponentIds(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.type === 'roll') return [node.componentId];
  if (node.type === 'binary') return [...expressionComponentIds(node.left), ...expressionComponentIds(node.right)];
  if (node.type === 'unary') return expressionComponentIds(node.value);
  if (node.type === 'function') return node.arguments.flatMap(expressionComponentIds);
  if (node.type === 'marker-count') return expressionComponentIds(node.expression);
  if (node.type === 'conditional') return [
    ...conditionComponentIds(node.condition),
    ...expressionComponentIds(node.whenTrue),
    ...expressionComponentIds(node.whenFalse),
  ];
  if (node.type === 'repeat') return expressionComponentIds(node.expression);
  if (node.type === 'select') return node.choices.flatMap(expressionComponentIds);
  if (node.type === 'choice') return node.choices.flatMap((choice) => expressionComponentIds(choice.expression));
  return [];
}

function conditionComponentIds(condition) {
  if (!condition || typeof condition !== 'object') return [];
  if (condition.type === 'compare-values') {
    return [...expressionComponentIds(condition.left), ...expressionComponentIds(condition.right)];
  }
  if (condition.type === 'not') return conditionComponentIds(condition.condition);
  return (condition.conditions || []).flatMap(conditionComponentIds);
}

function expressionConditionValue(condition, drawState, context) {
  if (condition.type === 'all') return condition.conditions.every((item) => expressionConditionValue(item, drawState, context));
  if (condition.type === 'any') return condition.conditions.some((item) => expressionConditionValue(item, drawState, context));
  if (condition.type === 'not') return !expressionConditionValue(condition.condition, drawState, context);
  const left = expressionValue(condition.left, drawState, context);
  const right = expressionValue(condition.right, drawState, context);
  if (condition.operator === '=' || condition.operator === '==') return left === right;
  if (condition.operator === '!=') return left !== right;
  if (condition.operator === '<') return left < right;
  if (condition.operator === '<=') return left <= right;
  if (condition.operator === '>') return left > right;
  return left >= right;
}

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
  const allCandidates = drawState.draws.filter((draw) => !draw.rerolled && appliesToDraw(step, draw));
  const candidateGroups = step.perRepeat
    ? Array.from(allCandidates.reduce((groups, draw) => {
      const key = draw.repeatIndex ?? -1;
      groups.set(key, [...(groups.get(key) || []), draw]);
      return groups;
    }, new Map()).values())
    : [allCandidates];
  candidateGroups.forEach((candidates) => {
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
  const count = boundedInteger(requiredInteger(step.count, context, 1, 'Le nombre de resultats conserves'), 0, units.length, 1);
  const sorted = [...units].sort((left, right) => {
    if (left.value !== right.value) return (left.value - right.value) * direction;
    return left.id.localeCompare(right.id);
  });
  const kept = new Set(sorted.slice(0, count).flatMap((unit) => unit.draws.map((draw) => draw.id)));
  candidates.forEach((draw) => { draw.kept = kept.has(draw.id); });
  });
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
  const every = boundedInteger(requiredInteger(step.every, context, 2, 'La frequence du bonus'), 1, MAX_DRAWS_PER_COMPONENT, 2);
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

function expressionValue(node, drawState, context) {
  if (!node || typeof node !== 'object') return 0;
  if (node.type === 'none') return NO_EXPRESSION_VALUE;
  if (node.type === 'number') return finiteNumber(node.value, 0);
  if (node.type === 'parameter') {
    return finiteNumber(context.parameters[node.parameterId], 0);
  }
  if (node.type === 'roll') {
    const candidates = drawState.draws.filter((draw) => (
        !draw.rerolled
        && draw.kept !== false
        && draw.componentId === node.componentId
      ));
    if (node.condition) {
      return candidates.reduce((sum, draw) => (
        sum + (matchesCondition(draw, node.condition, context) ? 1 : 0)
      ), 0);
    }
    if (node.collapse) {
      const chains = candidates.reduce((groups, draw) => {
        const chain = groups.get(draw.initialIndex) || [];
        chain.push(draw);
        groups.set(draw.initialIndex, chain);
        return groups;
      }, new Map());
      return Array.from(chains.values()).reduce((total, chain) => {
        const collapsed = chain.some((draw) => (
          draw.chainIndex > 0 && matchesCondition(draw, node.collapse.condition, context)
        ));
        return total + (collapsed
          ? finiteNumber(resolveValue(node.collapse.value, context.parameters, 1), 1)
          : chain.reduce((sum, draw) => sum + (numericDrawValue(draw) ?? 0), 0));
      }, 0);
    }
    return candidates.reduce((sum, draw) => sum + (numericDrawValue(draw) ?? 0), 0);
  }
  if (node.type === 'unary') {
    const value = expressionValue(node.value, drawState, context);
    if (value === NO_EXPRESSION_VALUE) return value;
    return node.operator === '-' ? -value : value;
  }
  if (node.type === 'function') {
    const values = (node.arguments || []).map((argument) => expressionValue(argument, drawState, context));
    if (values.some((value) => value === NO_EXPRESSION_VALUE)) return NO_EXPRESSION_VALUE;
    if (node.name === 'min') return Math.min(...values);
    if (node.name === 'max') return Math.max(...values);
    if (node.name === 'arrondi.inf') return Math.floor(values[0]);
    if (node.name === 'arrondi.sup') return Math.ceil(values[0]);
    if (node.name === 'abs') return Math.abs(values[0]);
    if (node.name === 'signe') return Math.sign(values[0]);
    if (node.name === 'puissance') return values[0] ** values[1];
    throw new RandomSystemError('invalid-expression-function', `Fonction inconnue : ${node.name}.`);
  }
  if (node.type === 'marker-count') {
    const componentIds = new Set(expressionComponentIds(node.expression));
    return drawState.draws.filter((draw) => (
      !draw.rerolled
      && draw.kept !== false
      && componentIds.has(draw.componentId)
      && draw.markers.some((marker) => marker.id === node.markerId || marker.label === node.markerId)
    )).length;
  }
  if (node.type === 'conditional') {
    return expressionValue(
      expressionConditionValue(node.condition, drawState, context) ? node.whenTrue : node.whenFalse,
      drawState,
      context,
    );
  }
  if (node.type === 'repeat') {
    const count = boundedInteger(resolveValue(node.count, context.parameters, 0), 0, 100, 0);
    return Array.from({ length: count }, (_, repeatIndex) => expressionValue(
      node.expression,
      { ...drawState, draws: drawState.draws.filter((draw) => draw.repeatIndex === repeatIndex) },
      context,
    )).reduce((sum, value) => sum + (value === NO_EXPRESSION_VALUE ? 0 : value), 0);
  }
  if (node.type === 'select') {
    const candidates = (node.choices || []).map((choice, index) => ({
      choice,
      index,
      value: expressionValue(choice, drawState, context),
    }));
    candidates.forEach((candidate) => {
      if (candidate.value === NO_EXPRESSION_VALUE) candidate.value = 0;
    });
    const count = boundedInteger(
      resolveValue(node.count, context.parameters, 1),
      0,
      candidates.length,
      1,
    );
    const direction = node.order === randomKeepOrders.LOWEST ? 1 : -1;
    const selected = new Set([...candidates]
      .sort((left, right) => ((left.value - right.value) * direction) || (left.index - right.index))
      .slice(0, count)
      .map((candidate) => candidate.index));
    candidates.forEach((candidate) => {
      if (selected.has(candidate.index)) return;
      const discardedComponents = new Set(expressionComponentIds(candidate.choice));
      drawState.draws.forEach((draw) => {
        if (discardedComponents.has(draw.componentId)) draw.kept = false;
      });
    });
    return candidates
      .filter((candidate) => selected.has(candidate.index))
      .reduce((sum, candidate) => sum + candidate.value, 0);
  }
  if (node.type === 'choice') {
    const selectedValue = context.options[node.optionId] ?? node.defaultValue;
    const selected = node.choices.find((choice) => choice.value === selectedValue)
      || node.choices[0];
    return selected ? expressionValue(selected.expression, drawState, context) : 0;
  }
  if (node.type === 'binary') {
    const left = expressionValue(node.left, drawState, context);
    const right = expressionValue(node.right, drawState, context);
    if (left === NO_EXPRESSION_VALUE) return right;
    if (right === NO_EXPRESSION_VALUE) return left;
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') {
      if (right === 0) throw new RandomSystemError('division-by-zero', 'Division par zero dans le code du jet.');
      return left / right;
    }
    if (node.operator === '%') {
      if (right === 0) throw new RandomSystemError('division-by-zero', 'Modulo par zero dans le code du jet.');
      return left % right;
    }
  }
  throw new RandomSystemError('invalid-expression', 'Expression de jet invalide.');
}

export function applyExpression(drawState, step, context) {
  const expressionResult = expressionValue(step.expression, drawState, context);
  const value = expressionResult === NO_EXPRESSION_VALUE ? 0 : expressionResult;
  const aggregate = {
    id: cleanId(step.outputId, step.id),
    label: cleanLabel(step.label, 'Resultat'),
    operation: randomPipelineStepTypes.EXPRESSION,
    value,
  };
  drawState.aggregates.set(aggregate.id, aggregate);
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
  const sourceId = step.source ? resolveValue(step.source, context.parameters, '') : step.sourceId;
  const source = context.sourceMap.get(String(sourceId || ''));
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
