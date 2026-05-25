const DEFAULT_GLOBAL_TRACKER = {
  enabled: false,
  name: 'Menace',
  mode: 'counter',
  current: 0,
  max: 6,
  direction: 'progression',
  trigger: 'manual',
  limitMode: 'clamp',
  total: 0,
  loops: 0,
  auto: false,
  thresholds: [],
  running: false,
  startedAt: null,
  elapsedMs: 0,
  soundOnComplete: false,
  completeSoundId: 'beep',
  completeSoundUrl: '',
};

const THRESHOLD_COLORS = new Set(['green', 'amber', 'red', 'blue', 'violet', 'neutral']);
const THRESHOLD_OPERATORS = new Set(['gte', 'lte', 'eq', 'gt', 'lt']);
const THRESHOLD_BASES = new Set(['fixed', 'percent', 'fromMax']);
const TRACKER_MODES = new Set(['clock', 'counter', 'stopwatch', 'timer']);
const TRACKER_DIRECTIONS = new Set(['progression', 'countdown']);
const TRACKER_TRIGGERS = new Set(['manual', 'realtime', 'round', 'phase']);
const TRACKER_LIMIT_MODES = new Set(['clamp', 'overflow', 'loop', 'restart']);
const THRESHOLD_SCOPES = new Set(['current', 'total', 'loops']);
const SOUND_IDS = new Set(['beep', 'chime', 'alarm', 'custom']);

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

export function globalTrackerTimerState(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  const elapsedMs = elapsedGlobalTrackerMs(safe, now);
  const durationMs = Math.max(1, finiteNumberOr(safe.max, 60)) * 1000;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const durationSeconds = Math.max(1, Math.floor(durationMs / 1000));
  const overrunSeconds = Math.max(0, elapsedSeconds - durationSeconds);
  const complete = elapsedMs >= durationMs;
  const cycles = complete ? Math.floor(elapsedMs / durationMs) : 0;
  const cyclesForCycle = safe.limitMode === 'restart' || safe.limitMode === 'loop';
  const cycleMs = complete && cyclesForCycle ? elapsedMs % durationMs : elapsedMs;
  const remainingMs = safe.limitMode === 'overflow'
    ? Math.max(0, durationMs - elapsedMs)
    : Math.max(0, durationMs - cycleMs);
  const remainingSeconds = safe.limitMode === 'overflow'
    ? Math.max(0, durationSeconds - elapsedSeconds)
    : Math.max(0, durationSeconds - Math.floor(cycleMs / 1000));

  return {
    elapsedMs,
    durationMs,
    elapsedSeconds,
    durationSeconds,
    remainingMs,
    remainingSeconds,
    overrunSeconds,
    complete,
    loops: cycles,
    progress: safe.limitMode === 'overflow' ? Math.min(1, elapsedMs / durationMs) : Math.min(1, cycleMs / durationMs),
  };
}

export function globalTrackerTotalValue(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  if (safe.mode === 'timer') {
    const state = globalTrackerTimerState(safe, now);
    return safe.limitMode === 'overflow' ? state.overrunSeconds : state.elapsedSeconds;
  }
  if (safe.mode === 'stopwatch') return Math.floor(elapsedGlobalTrackerMs(safe, now) / 1000);
  return finiteNumberOr(safe.total, safe.current);
}

export function globalTrackerDisplayValue(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  if (safe.mode === 'stopwatch') return Math.floor(elapsedGlobalTrackerMs(safe, now) / 1000);
  if (safe.mode === 'timer') {
    const state = globalTrackerTimerState(safe, now);
    return safe.limitMode === 'overflow' && state.complete ? state.overrunSeconds : state.remainingSeconds;
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
      scope: THRESHOLD_SCOPES.has(threshold.scope) ? threshold.scope : 'current',
      sound: !!threshold.sound,
      soundId: SOUND_IDS.has(threshold.soundId) ? threshold.soundId : 'beep',
      soundUrl: typeof threshold.soundUrl === 'string' ? threshold.soundUrl : '',
    };
  }).filter(Boolean).sort((a, b) => globalThresholdValue({ max: 100 }, a) - globalThresholdValue({ max: 100 }, b));
}

function defaultThresholdOperator(tracker) {
  if (tracker?.mode === 'timer') return 'lte';
  return 'gte';
}

export function globalThresholdValue(tracker, threshold) {
  const safe = { ...DEFAULT_GLOBAL_TRACKER, ...(tracker || {}) };
  const value = finiteNumberOr(threshold?.value, 0);
  const max = Math.max(1, finiteNumberOr(safe.max, safe.mode === 'timer' ? 60 : DEFAULT_GLOBAL_TRACKER.max));
  if (threshold?.scope === 'loops') return value;
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

function bestActiveThresholdsForScope(active, safe, scope) {
  const scoped = active.filter((threshold) => (threshold.scope || 'current') === scope);
  const gte = scoped.filter((threshold) => ['gte', 'gt'].includes(threshold.operator || defaultThresholdOperator(safe))).sort((a, b) => globalThresholdValue(safe, b) - globalThresholdValue(safe, a))[0];
  const lte = scoped.filter((threshold) => ['lte', 'lt'].includes(threshold.operator || defaultThresholdOperator(safe))).sort((a, b) => globalThresholdValue(safe, a) - globalThresholdValue(safe, b))[0];
  const eq = scoped.filter((threshold) => (threshold.operator || defaultThresholdOperator(safe)) === 'eq');
  return [gte, lte, ...eq].filter(Boolean);
}

export function activeGlobalTrackerThresholds(tracker, now = Date.now()) {
  const safe = normalizeGlobalTracker(tracker);
  const active = normalizeGlobalThresholds(safe.thresholds).filter((threshold) => {
    const timerState = safe.mode === 'timer' ? globalTrackerTimerState(safe, now) : null;
    const current = timerState
      ? threshold.scope === 'loops' ? timerState.loops : timerState.remainingSeconds
      : threshold.scope === 'loops' ? safe.loops : threshold.scope === 'total' ? globalTrackerTotalValue(safe, now) : globalTrackerDisplayValue(safe, now);
    return thresholdMatches(safe, threshold, current);
  });
  const thresholds = (safe.mode === 'timer' || safe.mode === 'clock') && safe.limitMode === 'loop'
    ? [...bestActiveThresholdsForScope(active, safe, 'current'), ...bestActiveThresholdsForScope(active, safe, 'total'), ...bestActiveThresholdsForScope(active, safe, 'loops')]
    : bestActiveThresholdsForScope(active, safe, 'current');
  const uniques = [];
  thresholds.forEach((threshold) => {
    if (!uniques.some((item) => item === threshold)) uniques.push(threshold);
  });
  return uniques.map((threshold) => ({ ...threshold, effectiveValue: globalThresholdValue(safe, threshold), label: thresholdLabel(safe, threshold) }));
}

/**
 * Normalizes imported or older saved scene trackers before the UI manipulates them.
 */
export function normalizeGlobalTracker(tracker) {
  const safe = { ...DEFAULT_GLOBAL_TRACKER, ...(tracker || {}) };
  const mode = TRACKER_MODES.has(safe.mode) ? safe.mode : DEFAULT_GLOBAL_TRACKER.mode;
  const realtime = ['stopwatch', 'timer'].includes(mode);
  const limitMode = TRACKER_LIMIT_MODES.has(safe.limitMode)
    ? safe.limitMode
    : mode === 'timer'
      ? 'clamp'
      : 'overflow';
  const current = Math.max(0, finiteNumberOr(safe.current, 0));
  const max = Math.max(1, finiteNumberOr(safe.max, mode === 'timer' ? 60 : DEFAULT_GLOBAL_TRACKER.max));
  const total = Math.max(0, finiteNumberOr(safe.total, current));
  const trigger = TRACKER_TRIGGERS.has(tracker?.trigger) ? tracker.trigger : (realtime ? 'realtime' : safe.auto ? 'round' : 'manual');
  return {
    ...safe,
    mode,
    current,
    max,
    direction: TRACKER_DIRECTIONS.has(safe.direction) ? safe.direction : DEFAULT_GLOBAL_TRACKER.direction,
    trigger,
    limitMode,
    total,
    loops: Math.max(0, finiteNumberOr(safe.loops, max > 0 ? Math.floor(total / max) : 0)),
    thresholds: normalizeGlobalThresholds(safe.thresholds),
    elapsedMs: Math.max(0, finiteNumberOr(safe.elapsedMs, 0)),
    startedAt: safe.startedAt == null ? null : finiteNumberOr(safe.startedAt, null),
    running: !!safe.running,
    auto: realtime ? false : trigger === 'round' || trigger === 'phase' || !!safe.auto,
    soundOnComplete: !!safe.soundOnComplete,
    completeSoundId: SOUND_IDS.has(safe.completeSoundId) ? safe.completeSoundId : 'beep',
    completeSoundUrl: typeof safe.completeSoundUrl === 'string' ? safe.completeSoundUrl : '',
  };
}

function valueInLoop(total, maximum) {
  if (total <= 0) return 0;
  const remainder = total % maximum;
  return remainder === 0 ? maximum : remainder;
}

export function stepGlobalTracker(tracker, delta) {
  const safe = normalizeGlobalTracker(tracker);
  const signedDelta = finiteNumberOr(delta, 0);
  const maximum = Math.max(1, safe.max);
  const raw = safe.current + signedDelta;
  const rawTotal = safe.total + signedDelta;

  if (safe.limitMode === 'loop' || safe.limitMode === 'restart') {
    const total = Math.max(0, rawTotal);
    return {
      ...safe,
      current: valueInLoop(total, maximum),
      total,
      loops: Math.floor(total / maximum),
    };
  }

  if (safe.limitMode === 'clamp') {
    const current = Math.min(maximum, Math.max(0, raw));
    return {
      ...safe,
      current,
      total: Math.min(maximum, Math.max(0, rawTotal)),
      loops: 0,
    };
  }

  const current = Math.max(0, raw);
  return {
    ...safe,
    current,
    total: Math.max(0, rawTotal),
    loops: maximum > 0 ? Math.floor(Math.max(0, rawTotal) / maximum) : 0,
  };
}

/**
 * Automatic global trackers tick when their configured scene trigger fires.
 */
export function stepAutoGlobalTracker(tracker, delta, trigger = 'round') {
  const safe = normalizeGlobalTracker(tracker);
  if (!safe.enabled || safe.trigger !== trigger) return tracker;
  const direction = safe.direction === 'countdown' ? -1 : 1;
  return stepGlobalTracker(safe, finiteNumberOr(delta, 0) * direction);
}
