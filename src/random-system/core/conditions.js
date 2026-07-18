import { resolveValue } from './references.js';
import { sourceOutcomes } from './sources.js';
import { randomSourceKinds } from './constants.js';

export function numericDrawValue(draw) {
  const numeric = Number(draw.calculatedValue);
  return Number.isFinite(numeric) ? numeric : null;
}

function compareValues(left, operator, right) {
  if (operator === 'eq') return left === right || String(left) === String(right);
  if (operator === 'neq') return left !== right && String(left) !== String(right);
  const numericLeft = Number(left);
  const numericRight = Number(right);
  if (!Number.isFinite(numericLeft) || !Number.isFinite(numericRight)) return false;
  if (operator === 'lt') return numericLeft < numericRight;
  if (operator === 'lte') return numericLeft <= numericRight;
  if (operator === 'gt') return numericLeft > numericRight;
  if (operator === 'gte') return numericLeft >= numericRight;
  return false;
}

export function matchesCondition(draw, condition, context) {
  if (!condition) return false;
  if (condition.type === 'all') {
    return (condition.conditions || []).every((item) => matchesCondition(draw, item, context));
  }
  if (condition.type === 'any') {
    return (condition.conditions || []).some((item) => matchesCondition(draw, item, context));
  }
  if (condition.type === 'not') return !matchesCondition(draw, condition.condition, context);
  if (condition.type === 'source-extreme') {
    const source = context.sourceMap.get(draw.sourceId);
    const cacheKey = `${draw.sourceId}:${condition.extreme}`;
    if (!context.sourceExtremeCache.has(cacheKey)) {
      let target;
      if (source.kind === randomSourceKinds.UNIFORM) {
        target = condition.extreme === 'min' ? source.min : source.max;
      } else {
        const numericValues = sourceOutcomes(source)
          .map((outcome) => Number(outcome.value))
          .filter(Number.isFinite);
        target = !numericValues.length
          ? null
          : condition.extreme === 'min'
            ? Math.min(...numericValues)
            : Math.max(...numericValues);
      }
      context.sourceExtremeCache.set(cacheKey, target);
    }
    const target = context.sourceExtremeCache.get(cacheKey);
    if (target === null) return false;
    return numericDrawValue(draw) === target;
  }
  if (condition.type === 'marker') {
    return draw.markers.some((marker) => marker.id === condition.markerId || marker.label === condition.markerId);
  }
  const right = resolveValue(condition.value, context.parameters, 0);
  const left = condition.field === 'raw' ? draw.outcome.value : draw.calculatedValue;
  return compareValues(left, condition.operator || 'eq', right);
}
