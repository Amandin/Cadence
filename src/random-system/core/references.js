import { primitiveValue } from './utils.js';

export function fixedValue(value) {
  return { kind: 'fixed', value };
}

export function parameterValue(parameterId) {
  return { kind: 'parameter', parameterId };
}

export function expressionValue(expression) {
  return { kind: 'expression', expression };
}

function normalizeNumericExpression(node) {
  if (!node || typeof node !== 'object') return { type: 'number', value: 0 };
  if (node.type === 'number') return { type: 'number', value: Number(node.value) };
  if (node.type === 'parameter') {
    return { type: 'parameter', parameterId: String(node.parameterId || '').trim() };
  }
  if (node.type === 'unary') {
    return {
      type: 'unary',
      operator: node.operator === '-' ? '-' : '+',
      value: normalizeNumericExpression(node.value),
    };
  }
  if (node.type === 'binary' && ['+', '-', '*', '/', '%'].includes(node.operator)) {
    return {
      type: 'binary',
      operator: node.operator,
      left: normalizeNumericExpression(node.left),
      right: normalizeNumericExpression(node.right),
    };
  }
  if (node.type === 'function' && [
    'min', 'max', 'arrondi.inf', 'arrondi.sup', 'abs', 'signe', 'puissance',
  ].includes(node.name)) {
    return {
      type: 'function',
      name: node.name,
      arguments: (Array.isArray(node.arguments) ? node.arguments : []).map(normalizeNumericExpression),
    };
  }
  if (node.type === 'conditional') {
    return {
      type: 'conditional',
      condition: normalizeNumericCondition(node.condition),
      whenTrue: normalizeNumericExpression(node.whenTrue),
      whenFalse: normalizeNumericExpression(node.whenFalse),
    };
  }
  return { type: 'number', value: 0 };
}

function normalizeNumericCondition(condition) {
  if (condition?.type === 'compare-values') return {
    type: 'compare-values',
    operator: ['=', '==', '!=', '<', '<=', '>', '>='].includes(condition.operator) ? condition.operator : '=',
    left: normalizeNumericExpression(condition.left),
    right: normalizeNumericExpression(condition.right),
  };
  if (condition?.type === 'not') return { type: 'not', condition: normalizeNumericCondition(condition.condition) };
  return {
    type: condition?.type === 'any' ? 'any' : 'all',
    conditions: (Array.isArray(condition?.conditions) ? condition.conditions : []).map(normalizeNumericCondition),
  };
}

export function normalizeValueReference(reference, fallback = 0) {
  if (reference?.kind === 'parameter') {
    return { kind: 'parameter', parameterId: String(reference.parameterId || '').trim() };
  }
  if (reference?.kind === 'expression') {
    return { kind: 'expression', expression: normalizeNumericExpression(reference.expression) };
  }
  if (reference?.kind === 'fixed') return { kind: 'fixed', value: primitiveValue(reference.value) };
  return { kind: 'fixed', value: primitiveValue(reference ?? fallback) };
}

export function resolveValue(reference, parameters, fallback = 0) {
  const normalized = normalizeValueReference(reference, fallback);
  if (normalized.kind === 'parameter') return parameters[normalized.parameterId] ?? fallback;
  if (normalized.kind === 'expression') return evaluateNumericExpression(normalized.expression, parameters);
  return normalized.value;
}

export function evaluateNumericExpression(node, parameters = {}) {
  if (node.type === 'number') return Number(node.value);
  if (node.type === 'parameter') return Number(parameters[node.parameterId] ?? 0);
  if (node.type === 'unary') {
    const value = evaluateNumericExpression(node.value, parameters);
    return node.operator === '-' ? -value : value;
  }
  if (node.type === 'binary') {
    const left = evaluateNumericExpression(node.left, parameters);
    const right = evaluateNumericExpression(node.right, parameters);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return right === 0 ? Number.NaN : left / right;
    if (node.operator === '%') return right === 0 ? Number.NaN : left % right;
  }
  if (node.type === 'function') {
    const values = node.arguments.map((argument) => evaluateNumericExpression(argument, parameters));
    if (node.name === 'min') return Math.min(...values);
    if (node.name === 'max') return Math.max(...values);
    if (node.name === 'arrondi.inf') return Math.floor(values[0]);
    if (node.name === 'arrondi.sup') return Math.ceil(values[0]);
    if (node.name === 'abs') return Math.abs(values[0]);
    if (node.name === 'signe') return Math.sign(values[0]);
    if (node.name === 'puissance') return values[0] ** values[1];
  }
  if (node.type === 'conditional') {
    return evaluateNumericCondition(node.condition, parameters)
      ? evaluateNumericExpression(node.whenTrue, parameters)
      : evaluateNumericExpression(node.whenFalse, parameters);
  }
  return Number.NaN;
}

function evaluateNumericCondition(condition, parameters) {
  if (condition.type === 'all') return condition.conditions.every((item) => evaluateNumericCondition(item, parameters));
  if (condition.type === 'any') return condition.conditions.some((item) => evaluateNumericCondition(item, parameters));
  if (condition.type === 'not') return !evaluateNumericCondition(condition.condition, parameters);
  const left = evaluateNumericExpression(condition.left, parameters);
  const right = evaluateNumericExpression(condition.right, parameters);
  if (condition.operator === '=' || condition.operator === '==') return left === right;
  if (condition.operator === '!=') return left !== right;
  if (condition.operator === '<') return left < right;
  if (condition.operator === '<=') return left <= right;
  if (condition.operator === '>') return left > right;
  return left >= right;
}
