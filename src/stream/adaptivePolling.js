export const STREAM_POLL_TIMING = Object.freeze({
  minimumMs: 3_000,
  focusedActiveCapMs: 12_000,
  focusedCalmCapMs: 30_000,
  focusedCalmStartMs: 2 * 60_000,
  focusedCalmEndMs: 10 * 60_000,
  hoveredCapMs: 20_000,
  hoverMemoryMs: 2 * 60_000,
  idleVisibleCapMs: 45_000,
  suspendAfterMs: 10 * 60_000,
  hoverWakeDelayMs: 3_000,
  retryMaximumMs: 60_000,
});

const UNCHANGED_INTERVALS = [3_000, 5_000, 8_000, 12_000, 15_000, 18_000, 22_000, 26_000, 30_000, 38_000, 45_000];

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function smoothstep(value) {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - (2 * normalized));
}

function timestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

export function focusedPollingCap(calmForMs, timing = STREAM_POLL_TIMING) {
  if (calmForMs <= timing.focusedCalmStartMs) return timing.focusedActiveCapMs;
  if (calmForMs >= timing.focusedCalmEndMs) return timing.focusedCalmCapMs;
  const progress = (calmForMs - timing.focusedCalmStartMs)
    / (timing.focusedCalmEndMs - timing.focusedCalmStartMs);
  return Math.round(
    timing.focusedActiveCapMs
      + ((timing.focusedCalmCapMs - timing.focusedActiveCapMs) * smoothstep(progress)),
  );
}

export function streamPollingPolicy({
  now,
  visible,
  focused,
  lastPointerAt,
  lastActivityAt,
  lastChangeAt,
}, timing = STREAM_POLL_TIMING) {
  if (!visible) {
    return { mode: 'hidden', capMs: Infinity, suspended: true, calmProgress: 1 };
  }

  const calmSince = Math.max(lastActivityAt || 0, lastChangeAt || 0);
  const calmForMs = Math.max(0, now - calmSince);
  if (focused) {
    const capMs = focusedPollingCap(calmForMs, timing);
    const calmProgress = clamp(
      (calmForMs - timing.focusedCalmStartMs)
        / (timing.focusedCalmEndMs - timing.focusedCalmStartMs),
      0,
      1,
    );
    return {
      mode: capMs >= 18_000 ? 'quiescent' : 'active',
      capMs,
      suspended: false,
      calmProgress,
    };
  }

  if (lastPointerAt && now - lastPointerAt <= timing.hoverMemoryMs) {
    return { mode: 'attentive', capMs: timing.hoveredCapMs, suspended: false, calmProgress: 0 };
  }

  if (lastChangeAt && now - lastChangeAt >= timing.suspendAfterMs) {
    return { mode: 'suspended', capMs: Infinity, suspended: true, calmProgress: 1 };
  }

  return { mode: 'idle', capMs: timing.idleVisibleCapMs, suspended: false, calmProgress: 0 };
}

export function nextUnchangedPollDelay(currentDelayMs, capMs) {
  const current = Math.max(0, Number(currentDelayMs) || 0);
  const next = UNCHANGED_INTERVALS.find((delay) => delay > current) || UNCHANGED_INTERVALS.at(-1);
  return Math.min(next, capMs);
}

export function pollDelayAfterChange({
  updatedAt,
  serverTime,
  previousUpdatedAt,
  revisionDelta = 1,
  capMs,
}) {
  const updatedTimestamp = timestamp(updatedAt);
  const serverTimestamp = timestamp(serverTime);
  const previousTimestamp = timestamp(previousUpdatedAt);
  const ageMs = updatedTimestamp != null && serverTimestamp != null
    ? Math.max(0, serverTimestamp - updatedTimestamp)
    : null;
  const gapMs = updatedTimestamp != null && previousTimestamp != null
    ? Math.max(0, updatedTimestamp - previousTimestamp)
    : null;

  let targetMs;
  if (ageMs == null) targetMs = 12_000;
  else if (ageMs < 10_000) {
    const sustainedActivity = revisionDelta > 1 || (gapMs != null && gapMs < 15_000);
    targetMs = sustainedActivity ? 3_000 : 5_000;
  } else if (ageMs < 30_000) targetMs = 5_000;
  else if (ageMs < 90_000) targetMs = 8_000;
  else if (ageMs < 5 * 60_000) targetMs = 12_000;
  else if (ageMs < 10 * 60_000) targetMs = 20_000;
  else targetMs = capMs;

  return {
    delayMs: Math.min(targetMs, capMs),
    ageMs,
    gapMs,
  };
}

export function retryPollDelay(errorCount, timing = STREAM_POLL_TIMING) {
  return Math.min(5_000 * (2 ** Math.max(0, errorCount - 1)), timing.retryMaximumMs);
}

export function jitterPollDelay(delayMs, random = Math.random) {
  if (!Number.isFinite(delayMs) || delayMs <= 0) return delayMs;
  return Math.round(delayMs * (0.9 + (clamp(random(), 0, 1) * 0.2)));
}
