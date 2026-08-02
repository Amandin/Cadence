import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createIndicatorWriteBatcher,
  streamWriteBatchBytes,
} from './indicatorWriteBatcher.js';

function payload(indicatorId, current, baseVersion = 4) {
  return {
    sceneId: 'scene-1',
    participantId: 'hero-1',
    indicatorId,
    baseVersion,
    value: { current },
  };
}

function successResponse(payloads, revision = 10) {
  return {
    ok: true,
    revision,
    results: payloads.map((change) => ({
      ok: true,
      indicator: {
        id: change.indicatorId,
        version: change.baseVersion + 1,
        value: change.value,
      },
    })),
  };
}

function createBatcher(options = {}) {
  const sendBatch = options.sendBatch || vi.fn(async (payloads) => successResponse(payloads));
  return {
    sendBatch,
    batcher: createIndicatorWriteBatcher({
      sendBatch,
      delayMs: 450,
      retryMs: 2_000,
      sustainedIntervalMs: 5_000,
      maxBatchSize: 32,
      now: () => Date.now(),
      setTimer: setTimeout,
      clearTimer: clearTimeout,
      ...options,
    }),
  };
}

describe('createIndicatorWriteBatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-01T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends only the latest value after 450 ms of calm', async () => {
    const { batcher, sendBatch } = createBatcher();
    batcher.enqueue('health', payload('health', 8));
    batcher.enqueue('health', payload('health', 7));
    batcher.enqueue('health', payload('health', 6));

    await vi.advanceTimersByTimeAsync(449);
    expect(sendBatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(sendBatch).toHaveBeenCalledOnce();
    expect(sendBatch).toHaveBeenCalledWith([payload('health', 6)], {});
    expect(batcher.pendingCount()).toBe(0);
  });

  it('groups several indicators into one network request', async () => {
    const { batcher, sendBatch } = createBatcher();
    batcher.enqueue('health', payload('health', 6, 4));
    batcher.enqueue('mana', payload('mana', 2, 11));
    batcher.enqueue('armor', payload('armor', 3, 7));

    await vi.advanceTimersByTimeAsync(450);
    expect(sendBatch).toHaveBeenCalledOnce();
    expect(sendBatch.mock.calls[0][0]).toEqual([
      payload('health', 6, 4),
      payload('mana', 2, 11),
      payload('armor', 3, 7),
    ]);
  });

  it('caps a continuous sequence at one batch every five seconds', async () => {
    const { batcher, sendBatch } = createBatcher();
    batcher.enqueue('health', payload('health', 10));
    for (let index = 1; index <= 12; index += 1) {
      await vi.advanceTimersByTimeAsync(400);
      batcher.enqueue('health', payload('health', 10 - index));
    }
    expect(sendBatch).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(200);
    expect(sendBatch).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(1);
    batcher.enqueue('health', payload('health', 20, 5));
    for (let index = 1; index <= 12; index += 1) {
      await vi.advanceTimersByTimeAsync(400);
      batcher.enqueue('health', payload('health', 20 + index, 5));
    }
    await vi.advanceTimersByTimeAsync(200);
    expect(sendBatch).toHaveBeenCalledTimes(2);
  });

  it('returns to the short delay after five seconds without writes', async () => {
    const { batcher, sendBatch } = createBatcher();
    batcher.enqueue('health', payload('health', 6));
    await vi.advanceTimersByTimeAsync(450);
    await vi.advanceTimersByTimeAsync(5_000);

    batcher.enqueue('mana', payload('mana', 3));
    await vi.advanceTimersByTimeAsync(449);
    expect(sendBatch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(sendBatch).toHaveBeenCalledTimes(2);
  });

  it('drains all pending indicators in one immediate keepalive batch', async () => {
    const { batcher, sendBatch } = createBatcher();
    batcher.enqueue('health', payload('health', 6));
    batcher.enqueue('mana', payload('mana', 3));

    await batcher.flushAll({ keepalive: true });
    expect(sendBatch).toHaveBeenCalledOnce();
    expect(sendBatch).toHaveBeenCalledWith([
      payload('health', 6),
      payload('mana', 3),
    ], { keepalive: true });
    expect(batcher.pendingCount()).toBe(0);
  });

  it('sends a newer value after an in-flight batch with the returned version', async () => {
    let resolveFirst;
    const sendBatch = vi.fn()
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(async (payloads) => successResponse(payloads, 12));
    const { batcher } = createBatcher({ sendBatch });

    batcher.enqueue('health', payload('health', 7, 4));
    const first = batcher.flush('health');
    batcher.enqueue('health', payload('health', 6, 4));
    const forced = batcher.flushAll({ keepalive: true });
    resolveFirst(successResponse([payload('health', 7, 4)], 11));
    await first;
    await forced;

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(sendBatch).toHaveBeenLastCalledWith([payload('health', 6, 5)], { keepalive: true });
  });

  it('handles success and conflict independently inside one response', async () => {
    const onSuccess = vi.fn();
    const onConflict = vi.fn();
    const sendBatch = vi.fn(async () => ({
      ok: true,
      revision: 15,
      results: [{
        ok: true,
        indicator: { id: 'health', version: 5, value: { current: 6 } },
      }, {
        ok: false,
        status: 409,
        error: { code: 'INDICATOR_VERSION_CONFLICT', message: 'Version obsolète' },
        indicator: { id: 'mana', version: 9, value: { current: 4 } },
      }],
    }));
    const { batcher } = createBatcher({ sendBatch, onSuccess, onConflict });
    batcher.enqueue('health', payload('health', 6, 4));
    batcher.enqueue('mana', payload('mana', 3, 8));

    await batcher.flushAll();
    expect(onSuccess).toHaveBeenCalledOnce();
    expect(onConflict).toHaveBeenCalledOnce();
    expect(onConflict.mock.calls[0][1]).toMatchObject({
      status: 409,
      code: 'INDICATOR_VERSION_CONFLICT',
      data: { indicator: { id: 'mana', version: 9 } },
    });
    expect(batcher.pendingCount()).toBe(0);
  });

  it('keeps a failed batch queued and retries it after the five-second cadence', async () => {
    const networkError = new Error('offline');
    const sendBatch = vi.fn()
      .mockRejectedValueOnce(networkError)
      .mockImplementationOnce(async (payloads) => successResponse(payloads));
    const onError = vi.fn();
    const { batcher } = createBatcher({ sendBatch, onError });
    batcher.enqueue('health', payload('health', 2));

    await vi.advanceTimersByTimeAsync(450);
    expect(sendBatch).toHaveBeenCalledOnce();
    expect(onError).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(4_999);
    expect(sendBatch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(batcher.pendingCount()).toBe(0);
  });

  it('honors Retry-After for a rate-limited batch', async () => {
    const error = Object.assign(new Error('Trop de requêtes'), {
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: 10_000,
    });
    const sendBatch = vi.fn()
      .mockRejectedValueOnce(error)
      .mockImplementationOnce(async (payloads) => successResponse(payloads));
    const onRateLimited = vi.fn();
    const { batcher } = createBatcher({ sendBatch, onRateLimited });
    batcher.enqueue('health', payload('health', 2));

    await vi.advanceTimersByTimeAsync(450);
    await vi.advanceTimersByTimeAsync(9_999);
    expect(sendBatch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(onRateLimited).toHaveBeenCalledOnce();
  });

  it('splits an exceptional drain larger than 32 indicators into bounded batches', async () => {
    const { batcher, sendBatch } = createBatcher();
    for (let index = 0; index < 33; index += 1) {
      batcher.enqueue(`indicator-${index}`, payload(`indicator-${index}`, index));
    }

    await batcher.flushAll({ keepalive: true });
    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(sendBatch.mock.calls[0][0]).toHaveLength(32);
    expect(sendBatch.mock.calls[1][0]).toHaveLength(1);
  });

  it('measures the exact UTF-8 request body and splits before the byte target', async () => {
    const first = payload('santé', 1);
    const second = payload('énergie', 2);
    const singleBytes = streamWriteBatchBytes([first]);
    const targetBytes = Math.max(singleBytes, streamWriteBatchBytes([second])) + 1;
    expect(singleBytes).toBe(new TextEncoder().encode(JSON.stringify({ changes: [first] })).byteLength);
    expect(streamWriteBatchBytes([first, second])).toBeGreaterThan(singleBytes);

    const { batcher, sendBatch } = createBatcher({ targetBatchBytes: targetBytes });
    batcher.enqueue('first', first);
    batcher.enqueue('second', second);
    await batcher.flushAll({ keepalive: true });

    expect(sendBatch).toHaveBeenCalledTimes(2);
    expect(sendBatch.mock.calls.every(([changes]) => streamWriteBatchBytes(changes) <= targetBytes)).toBe(true);
  });

  it('rejects an individually oversized indicator once without retrying forever', async () => {
    const change = payload('large', 1);
    const onConflict = vi.fn();
    const { batcher, sendBatch } = createBatcher({
      maximumRequestBytes: streamWriteBatchBytes([change]) - 1,
      onConflict,
    });
    batcher.enqueue('large', change);

    await batcher.flushAll();
    expect(sendBatch).not.toHaveBeenCalled();
    expect(onConflict).toHaveBeenCalledWith(change, expect.objectContaining({
      status: 413,
      code: 'STREAM_WRITE_TOO_LARGE',
    }));
    expect(batcher.pendingCount()).toBe(0);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(sendBatch).not.toHaveBeenCalled();
  });

  it('halves and retries an unexpectedly rejected multi-indicator batch', async () => {
    const tooLarge = Object.assign(new Error('Lot trop volumineux'), {
      status: 413,
      code: 'STREAM_WRITE_TOO_LARGE',
    });
    const sendBatch = vi.fn()
      .mockRejectedValueOnce(tooLarge)
      .mockImplementation(async (changes) => successResponse(changes));
    const onError = vi.fn();
    const { batcher } = createBatcher({ sendBatch, onError });
    batcher.enqueue('health', payload('health', 6));
    batcher.enqueue('mana', payload('mana', 3));

    await batcher.flushAll({ keepalive: true });
    expect(sendBatch).toHaveBeenCalledTimes(3);
    expect(sendBatch.mock.calls.slice(1).map(([changes]) => changes.length)).toEqual([1, 1]);
    expect(onError).not.toHaveBeenCalled();
    expect(batcher.pendingCount()).toBe(0);
  });
});
