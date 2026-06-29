export function cleanId(value, fallback) {
  const clean = String(value || '').trim();
  return clean || fallback;
}

export function cleanLabel(value, fallback) {
  const clean = String(value || '').trim();
  return clean || fallback;
}

export function finiteNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

export function boundedInteger(value, min, max, fallback) {
  const numeric = Number(value);
  const integer = Number.isFinite(numeric) ? Math.trunc(numeric) : fallback;
  return Math.min(max, Math.max(min, integer));
}

export function primitiveValue(value) {
  if (typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean') return value;
  return String(value ?? '');
}
