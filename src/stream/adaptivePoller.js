import {
  jitterPollDelay,
  nextUnchangedPollDelay,
  pollDelayAfterChange,
  retryPollDelay,
  STREAM_POLL_TIMING,
  streamPollingPolicy,
} from './adaptivePolling.js';

function parsedTimestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? parsed : null;
}

function listen(target, name, handler, options) {
  target?.addEventListener?.(name, handler, options);
  return () => target?.removeEventListener?.(name, handler, options);
}

export function createAdaptiveStreamPoller({
  refresh,
  onPause = () => {},
  onStateChange = () => {},
  now = () => Date.now(),
  random = Math.random,
  windowObject = globalThis.window,
  documentObject = globalThis.document,
  navigatorObject = globalThis.navigator,
  setTimer = (callback, delay) => windowObject.setTimeout(callback, delay),
  clearTimer = (timer) => windowObject.clearTimeout(timer),
  timing = STREAM_POLL_TIMING,
} = {}) {
  const startedAt = now();
  let stopped = false;
  let terminal = false;
  let inFlight = false;
  let timer = null;
  let dwellTimer = null;
  let pointerInside = false;
  let wakePending = false;
  let currentDelayMs = timing.minimumMs;
  let errorCount = 0;
  let networkError = false;
  let retryNotBeforeAt = 0;
  let lastPollAt = 0;
  let lastActivityAt = startedAt;
  let lastPointerAt = 0;
  let lastChangeAt = startedAt;
  let lastRevision = null;
  let lastServerUpdatedAt = '';
  let observedSnapshot = false;
  let lastPointerSignalAt = 0;
  const unlisten = [];

  const visible = () => documentObject?.visibilityState !== 'hidden';
  const focused = () => documentObject?.hasFocus?.() ?? true;
  const online = () => navigatorObject?.onLine !== false;

  const policy = (at = now()) => streamPollingPolicy({
    now: at,
    visible: visible(),
    focused: focused(),
    lastPointerAt,
    lastActivityAt,
    lastChangeAt,
  }, timing);

  const snapshot = (at = now()) => {
    const currentPolicy = policy(at);
    const offline = networkError || !online();
    return {
      mode: !visible() ? 'hidden' : offline ? 'offline' : currentPolicy.mode,
      intervalMs: Number.isFinite(currentDelayMs) ? currentDelayMs : null,
      suspended: currentPolicy.suspended,
      wakePending,
      calmProgress: currentPolicy.calmProgress,
      lastPollAt,
      lastChangeAt,
    };
  };

  const emit = () => {
    if (!stopped) onStateChange(snapshot());
  };

  const clearPollTimer = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
  };

  const cancelDwell = () => {
    if (dwellTimer != null) clearTimer(dwellTimer);
    dwellTimer = null;
    if (wakePending) {
      wakePending = false;
      emit();
    }
  };

  let run;
  const schedule = ({ immediate = false } = {}) => {
    if (stopped || terminal) return;
    clearPollTimer();
    const at = now();
    const currentPolicy = policy(at);
    if (Number.isFinite(currentPolicy.capMs)) {
      currentDelayMs = Math.min(currentDelayMs, currentPolicy.capMs);
    }
    emit();
    if (currentPolicy.suspended || !online()) return;

    let delay = immediate ? 0 : jitterPollDelay(currentDelayMs, random);
    if (!immediate && retryNotBeforeAt > at) delay = Math.max(delay, retryNotBeforeAt - at);
    const pointerRecent = lastPointerAt && at - lastPointerAt <= timing.hoverMemoryMs;
    if (!focused() && !pointerRecent && lastChangeAt) {
      const untilSuspension = timing.suspendAfterMs - (at - lastChangeAt);
      if (untilSuspension > 0) delay = Math.min(delay, untilSuspension);
    }
    timer = setTimer(() => { void run(); }, Math.max(0, delay));
  };

  const observeResult = (result, at) => {
    if (!result || result.ok === false) {
      if (result?.terminal) {
        terminal = true;
        clearPollTimer();
        emit();
        return;
      }
      networkError = true;
      errorCount += 1;
      retryNotBeforeAt = Math.max(
        retryNotBeforeAt,
        at + Number(result?.error?.retryAfterMs || 0),
      );
      currentDelayMs = Math.max(
        retryPollDelay(errorCount, timing),
        Number(result?.error?.retryAfterMs || 0),
      );
      return;
    }

    networkError = false;
    errorCount = 0;
    retryNotBeforeAt = 0;
    const currentPolicy = policy(at);
    if (result.unchanged) {
      const unchangedRevision = Number(result.revision);
      if (!observedSnapshot && Number.isFinite(unchangedRevision)) {
        lastRevision = unchangedRevision;
        observedSnapshot = true;
      }
      currentDelayMs = nextUnchangedPollDelay(currentDelayMs, currentPolicy.capMs);
      return;
    }

    const stream = result.stream || null;
    const nextRevision = Number.isFinite(Number(result.revision))
      ? Number(result.revision)
      : Number.isFinite(Number(stream?.revision)) ? Number(stream.revision) : lastRevision;
    const updatedAt = stream?.updatedAt || result.updatedAt || '';
    const serverTime = stream?.serverTime || result.serverTime || '';
    const updatedTimestamp = parsedTimestamp(updatedAt);
    const serverTimestamp = parsedTimestamp(serverTime);
    const ageMs = updatedTimestamp != null && serverTimestamp != null
      ? Math.max(0, serverTimestamp - updatedTimestamp)
      : null;
    const changed = result.changed === true
      || (lastRevision != null && nextRevision != null && nextRevision > lastRevision);
    const initial = result.initial === true || !observedSnapshot;

    if (updatedTimestamp != null && (initial || changed)) {
      const localChangeAt = ageMs == null ? at : at - ageMs;
      lastChangeAt = initial ? localChangeAt : Math.max(lastChangeAt, localChangeAt);
    }

    if (changed && !initial) {
      const revisionDelta = Number(result.revisionDelta)
        || Math.max(1, Number(nextRevision || 0) - Number(lastRevision || 0));
      currentDelayMs = pollDelayAfterChange({
        updatedAt,
        serverTime,
        previousUpdatedAt: lastServerUpdatedAt,
        revisionDelta,
        capMs: policy(at).capMs,
      }).delayMs;
    } else if (initial) {
      currentDelayMs = Math.min(timing.focusedActiveCapMs, policy(at).capMs);
    } else {
      currentDelayMs = nextUnchangedPollDelay(currentDelayMs, policy(at).capMs);
    }

    if (updatedAt) lastServerUpdatedAt = updatedAt;
    if (nextRevision != null) lastRevision = nextRevision;
    observedSnapshot = true;
  };

  run = async ({ force = false } = {}) => {
    if (stopped || terminal || inFlight) return;
    const currentPolicy = policy();
    if (currentPolicy.suspended && !force) {
      schedule();
      return;
    }
    if (!online()) {
      emit();
      return;
    }

    clearPollTimer();
    inFlight = true;
    lastPollAt = now();
    emit();
    let result;
    try {
      result = await refresh();
    } catch (error) {
      result = { ok: false, error };
    } finally {
      const completedAt = now();
      observeResult(result, completedAt);
      inFlight = false;
      schedule();
    }
  };

  const requestImmediate = () => {
    if (stopped || terminal || inFlight) return;
    if (lastPollAt && now() - lastPollAt < timing.minimumMs) {
      schedule();
      return;
    }
    void run({ force: true });
  };

  const markActivity = ({ immediate = false, pointer = false } = {}) => {
    const at = now();
    lastActivityAt = at;
    if (pointer) lastPointerAt = at;
    const shortensCurrentDelay = currentDelayMs > timing.focusedActiveCapMs;
    currentDelayMs = Math.min(currentDelayMs, timing.focusedActiveCapMs);
    if (immediate) requestImmediate();
    else if (shortensCurrentDelay) schedule();
    else emit();
  };

  const beginDwell = () => {
    if (stopped || dwellTimer != null || !visible() || focused()) return;
    if (lastPointerAt && now() - lastPointerAt <= timing.hoverMemoryMs) return;
    wakePending = true;
    emit();
    dwellTimer = setTimer(() => {
      dwellTimer = null;
      if (stopped || !pointerInside || !visible() || focused()) {
        wakePending = false;
        emit();
        return;
      }
      wakePending = false;
      markActivity({ immediate: true, pointer: true });
    }, timing.hoverWakeDelayMs);
  };

  const onVisibilityChange = () => {
    clearPollTimer();
    if (!visible()) {
      cancelDwell();
      onPause();
      emit();
      return;
    }
    if (focused()) markActivity({ immediate: true });
    else schedule();
  };
  const onFocus = () => {
    cancelDwell();
    currentDelayMs = timing.minimumMs;
    markActivity({ immediate: true });
  };
  const onBlur = () => schedule();
  const onOnline = () => {
    networkError = false;
    errorCount = 0;
    retryNotBeforeAt = 0;
    if (visible() && (focused() || (lastPointerAt && now() - lastPointerAt <= timing.hoverMemoryMs))) {
      requestImmediate();
    } else schedule();
  };
  const onOffline = () => {
    networkError = true;
    clearPollTimer();
    emit();
  };
  const onPointerEnter = () => {
    pointerInside = true;
    if (focused()) markActivity({ pointer: true });
    else beginDwell();
  };
  const onPointerLeave = () => {
    pointerInside = false;
    cancelDwell();
    schedule();
  };
  const onPointerMove = (event) => {
    const at = now();
    if (focused()) {
      const movement = Math.abs(Number(event?.movementX || 0)) + Math.abs(Number(event?.movementY || 0));
      if (movement >= 4 && at - lastPointerSignalAt >= 1_000) {
        lastPointerSignalAt = at;
        markActivity({ pointer: true });
      }
      return;
    }
    pointerInside = true;
    if (lastPointerAt && at - lastPointerAt <= timing.hoverMemoryMs) {
      if (at - lastPointerSignalAt >= 5_000) {
        lastPointerSignalAt = at;
        lastPointerAt = at;
        emit();
      }
    } else beginDwell();
  };
  const onExplicitActivity = () => {
    const mode = policy().mode;
    markActivity({ immediate: ['suspended', 'quiescent', 'idle'].includes(mode), pointer: true });
  };
  const onKeyDown = () => {
    const mode = policy().mode;
    markActivity({ immediate: mode === 'quiescent' });
  };

  const start = () => {
    unlisten.push(
      listen(documentObject, 'visibilitychange', onVisibilityChange),
      listen(windowObject, 'focus', onFocus),
      listen(windowObject, 'blur', onBlur),
      listen(windowObject, 'online', onOnline),
      listen(windowObject, 'offline', onOffline),
      listen(windowObject, 'pointerenter', onPointerEnter),
      listen(windowObject, 'pointerleave', onPointerLeave),
      listen(windowObject, 'pointermove', onPointerMove, { passive: true }),
      listen(windowObject, 'pointerdown', onExplicitActivity, { passive: true }),
      listen(windowObject, 'touchstart', onExplicitActivity, { passive: true }),
      listen(windowObject, 'wheel', onExplicitActivity, { passive: true }),
      listen(windowObject, 'keydown', onKeyDown),
    );
    schedule({ immediate: true });
  };

  const wake = () => {
    cancelDwell();
    currentDelayMs = timing.minimumMs;
    markActivity({ immediate: true, pointer: true });
  };

  const dispose = () => {
    stopped = true;
    clearPollTimer();
    cancelDwell();
    unlisten.splice(0).forEach((remove) => remove());
  };

  return { start, wake, dispose, snapshot };
}
