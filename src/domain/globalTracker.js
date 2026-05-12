const DEFAULT_GLOBAL_TRACKER = {
  enabled: false,
  name: 'Menace',
  mode: 'counter',
  current: 0,
  max: 6,
  auto: false,
};

function finiteNumberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function defaultGlobalTracker() {
  return { ...DEFAULT_GLOBAL_TRACKER };
}

/**
 * Normalizes imported or older saved scene trackers before the UI manipulates them.
 */
export function normalizeGlobalTracker(tracker) {
  const safe = { ...DEFAULT_GLOBAL_TRACKER, ...(tracker || {}) };
  return {
    ...safe,
    current: Math.max(0, finiteNumberOr(safe.current, 0)),
    max: Math.max(1, finiteNumberOr(safe.max, DEFAULT_GLOBAL_TRACKER.max)),
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
