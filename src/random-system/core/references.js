import { primitiveValue } from './utils.js';

export function fixedValue(value) {
  return { kind: 'fixed', value };
}

export function parameterValue(parameterId) {
  return { kind: 'parameter', parameterId };
}

export function normalizeValueReference(reference, fallback = 0) {
  if (reference?.kind === 'parameter') {
    return { kind: 'parameter', parameterId: String(reference.parameterId || '').trim() };
  }
  if (reference?.kind === 'fixed') return { kind: 'fixed', value: primitiveValue(reference.value) };
  return { kind: 'fixed', value: primitiveValue(reference ?? fallback) };
}

export function resolveValue(reference, parameters, fallback = 0) {
  const normalized = normalizeValueReference(reference, fallback);
  return normalized.kind === 'parameter'
    ? parameters[normalized.parameterId] ?? fallback
    : normalized.value;
}
