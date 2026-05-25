const DEFAULT_GLOBAL_TRACKER = {
  enabled: false,
  name: 'Menace',
  mode: 'counter',
  current: 0,
  max: 6,
  auto: false,
  thresholds: [],
  running: false,
  startedAt: null,
  elapsedMs: 0,
};

const THRESHOLD_COLORS = new Set(['green', 'amber', 'red', 'blue', 'violet', 'neutral']);
const THRESHOLD_OPERATORS = new Set(['gte', 'lte', 'eq', 'gt', 'lt']);
const THRESHOLD_BASES = new Set(['fixed', 'percent', 'fromMax']);

function finiteNumberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function defaultGlobalTracker() {
  return { ...DEFAULT_GLOBAL_TRACKER };
}

export function elapsedGlobalTrackerMs(tracker, now = Date.now()) {
  const base = Math.max(0, finiteNumberOr(tracker?.elapsedMs, 0));
  if (!tracker?.running || !tracker?.startedAt) return base;
  return base + Math.max(0, now - finiteNumberOr(tracker.startedAt, now));
}

export function globalTrackerDisplayValue(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  if (safe.mode === 'stopwatch') return Math.floor(elapsedGlobalTrackerMs(safe, now) / 1000);
  if (safe.mode === 'timer') {
    const duration = Math.max(1, finiteNumberOr(safe.max, 60));
    return Math.max(0, duration - Math.floor(elapsedGlobalTrackerMs(safe, now) / 1000));
  }
  return finiteNumberOr(safe.current, 0);
}

export function normalizeGlobalThresholds(thresholds = []) {
  return (Array.isArray(thresholds) ? thresholds : []).map((threshold) => {
    if (!threshold || typeof threshold !== 'object') return null;
    const value = Number(threshold.value);
    if (!Number.isFinite(value)) return null;
    return {
      value,
      label: String(threshold.label || '').trim(),
      color: THRESHOLD_COLORS.has(threshold.color) ? threshold.color : 'neutral',
      operator: THRESHOLD_OPERATORS.has(threshold.operator) ? threshold.operator : '',
      basis: THRESHOLD_BASES.has(threshold.basis) ? threshold.basis : 'fixed',
    };
  }).filter(Boolean).sort((a, b) => globalThresholdValue({ max: 100 }, a) - globalThresholdValue({ max: 100 }, b));
}

function defaultThresholdOperator(tracker) {
  return tracker?.mode === 'timer' ? 'lte' : 'gte';
}

export function globalThresholdValue(tracker, threshold) {
  const safe = { ...DEFAULT_GLOBAL_TRACKER, ...(tracker || {}) };
  const value = finiteNumberOr(threshold?.value, 0);
  const max = Math.max(1, finiteNumberOr(safe.max, safe.mode === 'timer' ? 60 : DEFAULT_GLOBAL_TRACKER.max));
  if (threshold?.basis === 'percent') return max * (value / 100);
  if (threshold?.basis === 'fromMax') return max - value;
  return value;
}

function thresholdLabel(tracker, threshold) {
  if (threshold.label) return threshold.label;
  const operator = threshold.operator || defaultThresholdOperator(tracker);
  const value = threshold.basis === 'percent' ? `${threshold.value}%` : threshold.basis === 'fromMax' ? `max - ${threshold.value}` : `${threshold.value}`;
  return `${operator === 'gte' ? '>=' : operator === 'lte' ? '<=' : operator === 'gt' ? '>' : operator === 'lt' ? '<' : '='} ${value}`;
}

function thresholdMatches(tracker, threshold, current) {
  const operator = threshold.operator || defaultThresholdOperator(tracker);
  const target = globalThresholdValue(tracker, threshold);
  if (operator === 'lte') return current <= target;
  if (operator === 'lt') return current < target;
  if (operator === 'eq') return current === target;
  if (operator === 'gt') return current > target;
  return current >= target;
}

export function activeGlobalTrackerThresholds(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  const current = globalTrackerDisplayValue(safe, now);
  const active = normalizeGlobalThresholds(safe.thresholds).filter((threshold) => thresholdMatches(safe, threshold, current));
  const gte = active.filter((threshold) => ['gte', 'gt'].includes(threshold.operator || defaultThresholdOperator(safe))).sort((a, b) => globalThresholdValue(safe, b) - globalThresholdValue(safe, a))[0];
  const lte = active.filter((threshold) => ['lte', 'lt'].includes(threshold.operator || defaultThresholdOperator(safe))).sort((a, b) => globalThresholdValue(safe, a) - globalThresholdValue(safe, b))[0];
  const eq = active.filter((threshold) => (threshold.operator || defaultThresholdOperator(safe)) === 'eq');
  return [gte, lte, ...eq].filter(Boolean).map((threshold) => ({ ...threshold, effectiveValue: globalThresholdValue(safe, threshold), label: thresholdLabel(safe, threshold) }));
}

/**
 * Normalizes imported or older saved scene trackers before the UI manipulates them.
 */
export function normalizeGlobalTracker(tracker) {
  const safe = { ...DEFAULT_GLOBAL_TRACKER, ...(tracker || {}) };
  return {
    ...safe,
    mode: ['clock', 'counter', 'stopwatch', 'timer'].includes(safe.mode) ? safe.mode : DEFAULT_GLOBAL_TRACKER.mode,
    current: Math.max(0, finiteNumberOr(safe.current, 0)),
    max: Math.max(1, finiteNumberOr(safe.max, DEFAULT_GLOBAL_TRACKER.max)),
    thresholds: normalizeGlobalThresholds(safe.thresholds),
    elapsedMs: Math.max(0, finiteNumberOr(safe.elapsedMs, 0)),
    startedAt: safe.startedAt == null ? null : finiteNumberOr(safe.startedAt, null),
    running: !!safe.running,
  };
}

export function stepGlobalTracker(tracker, delta) {
  const safe = normalizeGlobalTracker(tracker);
  return {
    ...safe,
    current: Math.max(0, safe.current + finiteNumberOr(delta, 0)),
  };
}

/**
 * Automatic global trackers tick only when a new round starts.
 */
export function stepAutoGlobalTracker(tracker, delta) {
  if (!tracker?.enabled || !tracker?.auto) return tracker;
  return stepGlobalTracker(tracker, delta);
}
