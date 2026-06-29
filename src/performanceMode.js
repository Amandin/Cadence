export const performancePreferences = {
  AUTO: 'auto',
  NORMAL: 'normal',
  PERFORMANCE: 'performance',
};

export const performanceLevels = {
  NORMAL: 'normal',
  LOW: 'low',
};

export const PERFORMANCE_PREFERENCE_STORAGE_KEY = 'cadence:performance:preference:v1';

const VALID_PREFERENCES = new Set(Object.values(performancePreferences));

export function normalizePerformancePreference(value) {
  return VALID_PREFERENCES.has(value) ? value : performancePreferences.AUTO;
}

export function resolvePerformanceLevel(preference, automaticLowPerformance = false) {
  const normalized = normalizePerformancePreference(preference);
  if (normalized === performancePreferences.PERFORMANCE) return performanceLevels.LOW;
  if (normalized === performancePreferences.NORMAL) return performanceLevels.NORMAL;
  return automaticLowPerformance ? performanceLevels.LOW : performanceLevels.NORMAL;
}

export function detectHardwarePerformanceRisk({
  deviceMemory,
  hardwareConcurrency,
  reducedMotion,
} = {}) {
  const memory = Number(deviceMemory);
  const cores = Number(hardwareConcurrency);
  const memoryRisk = Number.isFinite(memory) && memory > 0 && memory <= 2;
  const coreRisk = Number.isFinite(cores) && cores > 0 && cores <= 4;
  return !!reducedMotion || memoryRisk || coreRisk;
}

export function performanceMeasureThresholds(hardwareRisk = false) {
  return hardwareRisk
    ? { turn: 220, render: 180, timerTick: 650, requiredSamples: 3, windowMs: 90000 }
    : { turn: 360, render: 260, timerTick: 950, requiredSamples: 4, windowMs: 90000 };
}

export function shouldCountSlowPerformanceMeasure(kind, durationMs, hardwareRisk = false) {
  const thresholds = performanceMeasureThresholds(hardwareRisk);
  const limit = thresholds[kind] ?? thresholds.render;
  return Number(durationMs) >= limit;
}

export function nextSlowPerformanceSamples(samples = [], now = Date.now(), hardwareRisk = false) {
  const { windowMs, requiredSamples } = performanceMeasureThresholds(hardwareRisk);
  const recent = [...samples, now].filter((value) => now - value <= windowMs);
  return {
    samples: recent,
    activate: recent.length >= requiredSamples,
  };
}
