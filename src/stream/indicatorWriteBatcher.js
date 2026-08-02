import {
  SCENE_STREAM_MAX_BATCH_CHANGES,
  SCENE_STREAM_MAX_WRITE_BYTES,
  SCENE_STREAM_TARGET_BATCH_BYTES,
} from '../../shared/scene-stream-protocol.js';

const encoder = new TextEncoder();

export function streamWriteBatchBytes(payloads) {
  return encoder.encode(JSON.stringify({ changes: payloads })).byteLength;
}

function terminalWriteError(error) {
  return error?.status === 409
    || error?.code === 'INDICATOR_VERSION_CONFLICT'
    || [400, 403, 404].includes(error?.status);
}

function oversizedWriteError() {
  return Object.assign(new Error('Cet indicateur est trop volumineux pour être modifié via la diffusion.'), {
    status: 413,
    code: 'STREAM_WRITE_TOO_LARGE',
    data: null,
  });
}

function outcomeError(outcome, response) {
  if (outcome?._error) return outcome._error;
  return Object.assign(new Error(outcome?.error?.message || 'Modification refusée.'), {
    status: Number(outcome?.status || 0),
    code: outcome?.error?.code || 'STREAM_WRITE_FAILED',
    data: {
      revision: response?.revision,
      stream: response?.stream,
      indicator: outcome?.indicator,
    },
  });
}

export function createIndicatorWriteBatcher({
  send,
  sendBatch,
  onSuccess = () => {},
  onConflict = () => {},
  onError = () => {},
  onRateLimited = () => {},
  delayMs = 450,
  retryMs = 2_000,
  sustainedIntervalMs = 5_000,
  maxBatchSize = SCENE_STREAM_MAX_BATCH_CHANGES,
  targetBatchBytes = SCENE_STREAM_TARGET_BATCH_BYTES,
  maximumRequestBytes = SCENE_STREAM_MAX_WRITE_BYTES,
  now = () => Date.now(),
  setTimer = (callback, delay) => window.setTimeout(callback, delay),
  clearTimer = (timer) => window.clearTimeout(timer),
}) {
  const entries = new Map();
  let disposed = false;
  let timer = null;
  let inFlight = false;
  let activePromise = null;
  let firstQueuedAt = 0;
  let lastActivityAt = 0;
  let lastSendAt = -Infinity;
  let retryNotBeforeAt = 0;
  let adaptiveBatchSize = maxBatchSize;

  const fallbackSendBatch = async (payloads, options) => {
    const results = [];
    for (const payload of payloads) {
      try {
        results.push({ ok: true, ...await send(payload, options) });
      } catch (error) {
        if (!terminalWriteError(error)) throw error;
        results.push({
          ok: false,
          status: error.status,
          error: { code: error.code, message: error.message },
          indicator: error.data?.indicator,
          _error: error,
        });
      }
    }
    return { ok: true, results };
  };
  const transmit = sendBatch || fallbackSendBatch;

  const clearSchedule = () => {
    if (timer != null) clearTimer(timer);
    timer = null;
  };

  let flushBatch;
  const schedule = (minimumDelay = 0) => {
    if (disposed || inFlight || entries.size === 0) return;
    clearSchedule();
    const at = now();
    const calmDueAt = lastActivityAt + delayMs;
    const maximumDueAt = Math.max(
      firstQueuedAt + sustainedIntervalMs,
      Number.isFinite(lastSendAt) ? lastSendAt + sustainedIntervalMs : -Infinity,
    );
    let dueAt = Math.min(calmDueAt, maximumDueAt);
    if (Number.isFinite(lastSendAt)) dueAt = Math.max(dueAt, lastSendAt + sustainedIntervalMs);
    dueAt = Math.max(dueAt, retryNotBeforeAt, at + minimumDelay);
    timer = setTimer(() => {
      timer = null;
      void flushBatch().catch(() => {});
    }, Math.max(0, dueAt - at));
  };

  const refreshQueueTimes = () => {
    if (entries.size === 0) {
      firstQueuedAt = 0;
      lastActivityAt = 0;
      return;
    }
    firstQueuedAt = Math.min(...[...entries.values()].map((entry) => entry.queuedAt));
    lastActivityAt = Math.max(...[...entries.values()].map((entry) => entry.updatedAt));
  };

  const enqueue = (key, payload) => {
    if (disposed) return;
    const at = now();
    const current = entries.get(key);
    if (current) {
      current.payload = { ...payload, baseVersion: current.payload.baseVersion };
      current.sequence += 1;
      current.updatedAt = at;
    } else {
      entries.set(key, {
        key,
        payload,
        sequence: 1,
        queuedAt: at,
        updatedAt: at,
      });
    }
    refreshQueueTimes();
    schedule();
  };

  flushBatch = async (options = {}) => {
    if (disposed || entries.size === 0) return null;
    clearSchedule();
    if (inFlight) {
      return activePromise.then(
        () => entries.size ? flushBatch(options) : null,
        (error) => entries.size ? flushBatch(options) : Promise.reject(error),
      );
    }

    for (const entry of [...entries.values()]) {
      if (streamWriteBatchBytes([entry.payload]) <= maximumRequestBytes) continue;
      entries.delete(entry.key);
      onConflict(entry.payload, oversizedWriteError());
    }
    refreshQueueTimes();
    if (entries.size === 0) return { ok: false, oversized: true, results: [] };

    const snapshot = [];
    for (const entry of entries.values()) {
      if (snapshot.length >= adaptiveBatchSize) break;
      const candidatePayloads = [...snapshot.map((item) => item.payload), entry.payload];
      if (snapshot.length > 0 && streamWriteBatchBytes(candidatePayloads) > targetBatchBytes) break;
      snapshot.push({ key: entry.key, sequence: entry.sequence, payload: entry.payload });
    }
    inFlight = true;
    lastSendAt = now();
    activePromise = (async () => {
      try {
        const response = await transmit(snapshot.map((entry) => entry.payload), options);
        if (!Array.isArray(response?.results) || response.results.length !== snapshot.length) {
          throw new Error('STREAM_BATCH_RESPONSE_INVALID');
        }
        retryNotBeforeAt = 0;
        response.results.forEach((outcome, index) => {
          const sent = snapshot[index];
          const current = entries.get(sent.key);
          if (!current) return;
          if (outcome.ok) {
            const result = { ...response, ...outcome, results: undefined };
            onSuccess(sent.payload, result);
            if (current.sequence === sent.sequence) entries.delete(sent.key);
            else current.payload = {
              ...current.payload,
              baseVersion: Number(outcome.indicator?.version || current.payload.baseVersion),
            };
          } else {
            entries.delete(sent.key);
            onConflict(sent.payload, outcomeError(outcome, response));
          }
        });
        return response;
      } catch (error) {
        if (!disposed) {
          if (error?.status === 413) {
            if (snapshot.length > 1) {
              adaptiveBatchSize = Math.max(1, Math.floor(snapshot.length / 2));
              retryNotBeforeAt = 0;
              return { ok: false, split: true, results: [] };
            }
            const [sent] = snapshot;
            entries.delete(sent.key);
            onConflict(sent.payload, oversizedWriteError());
            return { ok: false, oversized: true, results: [] };
          }
          const rateLimited = error?.status === 429 || error?.code === 'RATE_LIMITED';
          const retryDelay = rateLimited
            ? Math.max(retryMs, Number(error?.retryAfterMs || 0))
            : retryMs;
          retryNotBeforeAt = now() + retryDelay;
          snapshot.forEach(({ payload }) => {
            if (rateLimited) onRateLimited(payload, error);
            else onError(payload, error);
          });
        }
        throw error;
      } finally {
        inFlight = false;
        activePromise = null;
        refreshQueueTimes();
        if (!disposed && entries.size) schedule();
      }
    })();
    return activePromise;
  };

  const flush = () => flushBatch();

  const flushAll = async (options = {}) => {
    const results = [];
    while (!disposed && entries.size) {
      results.push(...await Promise.allSettled([flushBatch(options)]));
      if (results.at(-1)?.status === 'rejected') break;
    }
    return results;
  };

  const cancel = (key) => {
    entries.delete(key);
    refreshQueueTimes();
    if (entries.size) schedule();
    else clearSchedule();
  };

  const dispose = () => {
    disposed = true;
    clearSchedule();
    entries.clear();
  };

  return {
    enqueue,
    flush,
    flushAll,
    cancel,
    dispose,
    pendingCount: () => entries.size,
    pending: (key) => entries.get(key)?.payload || null,
    pendingEntries: () => [...entries.entries()].map(([key, entry]) => ({ key, payload: entry.payload })),
  };
}
