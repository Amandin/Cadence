import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdaptiveStreamPoller } from './adaptivePoller.js';

class TestDocument extends EventTarget {
  constructor() {
    super();
    this.visibilityState = 'visible';
    this.focused = true;
  }

  hasFocus() {
    return this.focused;
  }
}

function pointerEvent(type, movementX = 0, movementY = 0) {
  const event = new Event(type);
  Object.defineProperties(event, {
    movementX: { value: movementX },
    movementY: { value: movementY },
  });
  return event;
}

describe('createAdaptiveStreamPoller', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-31T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stops all polling while hidden and refreshes immediately when focused again', async () => {
    const windowObject = new EventTarget();
    const documentObject = new TestDocument();
    const refresh = vi.fn(async () => ({
      ok: true,
      initial: refresh.mock.calls.length === 1,
      unchanged: refresh.mock.calls.length > 1,
      revision: 1,
      stream: {
        revision: 1,
        updatedAt: '2026-07-31T12:00:00.000Z',
        serverTime: new Date().toISOString(),
      },
    }));
    const onPause = vi.fn();
    const poller = createAdaptiveStreamPoller({
      refresh,
      onPause,
      windowObject,
      documentObject,
      navigatorObject: { onLine: true },
      random: () => 0.5,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledOnce();

    documentObject.visibilityState = 'hidden';
    documentObject.dispatchEvent(new Event('visibilitychange'));
    expect(onPause).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(60 * 60_000);
    expect(refresh).toHaveBeenCalledOnce();

    documentObject.visibilityState = 'visible';
    documentObject.focused = true;
    documentObject.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(2);
    poller.dispose();
  });

  it('requires three continuous seconds of hover to wake a suspended unfocused window', async () => {
    const windowObject = new EventTarget();
    const documentObject = new TestDocument();
    const states = [];
    let revision = 1;
    const refresh = vi.fn(async () => ({
      ok: true,
      initial: refresh.mock.calls.length === 1,
      unchanged: refresh.mock.calls.length > 1,
      revision,
      stream: {
        revision,
        updatedAt: '2026-07-31T12:00:00.000Z',
        serverTime: new Date().toISOString(),
      },
    }));
    const poller = createAdaptiveStreamPoller({
      refresh,
      onStateChange: (state) => states.push(state),
      windowObject,
      documentObject,
      navigatorObject: { onLine: true },
      random: () => 0.5,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    documentObject.focused = false;
    windowObject.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(states.at(-1)).toMatchObject({ mode: 'suspended', suspended: true });
    const callsAtSuspension = refresh.mock.calls.length;

    windowObject.dispatchEvent(pointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(2_999);
    expect(refresh).toHaveBeenCalledTimes(callsAtSuspension);
    expect(states.at(-1).wakePending).toBe(true);
    windowObject.dispatchEvent(pointerEvent('pointerleave'));
    await vi.advanceTimersByTimeAsync(10);
    expect(states.at(-1).wakePending).toBe(false);

    windowObject.dispatchEvent(pointerEvent('pointerenter'));
    await vi.advanceTimersByTimeAsync(3_000);
    expect(refresh).toHaveBeenCalledTimes(callsAtSuspension + 1);
    expect(states.at(-1)).toMatchObject({ mode: 'attentive', suspended: false, wakePending: false });
    poller.dispose();
  });

  it('wakes a suspended window immediately when focus returns', async () => {
    const windowObject = new EventTarget();
    const documentObject = new TestDocument();
    const refresh = vi.fn(async () => ({ ok: true, unchanged: true, revision: 1 }));
    const poller = createAdaptiveStreamPoller({
      refresh,
      windowObject,
      documentObject,
      navigatorObject: { onLine: true },
      random: () => 0.5,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    documentObject.focused = false;
    windowObject.dispatchEvent(new Event('blur'));
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    const callsBeforeFocus = refresh.mock.calls.length;

    documentObject.focused = true;
    windowObject.dispatchEvent(new Event('focus'));
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledTimes(callsBeforeFocus + 1);
    poller.dispose();
  });

  it('does not postpone a scheduled poll while the pointer keeps moving', async () => {
    const windowObject = new EventTarget();
    const documentObject = new TestDocument();
    const refresh = vi.fn(async () => ({
      ok: true,
      initial: refresh.mock.calls.length === 1,
      unchanged: refresh.mock.calls.length > 1,
      revision: 1,
      stream: {
        revision: 1,
        updatedAt: '2026-07-31T12:00:00.000Z',
        serverTime: new Date().toISOString(),
      },
    }));
    const poller = createAdaptiveStreamPoller({
      refresh,
      windowObject,
      documentObject,
      navigatorObject: { onLine: true },
      random: () => 0.5,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledOnce();
    for (let second = 0; second < 12; second += 1) {
      windowObject.dispatchEvent(pointerEvent('pointermove', 5, 0));
      await vi.advanceTimersByTimeAsync(1_000);
    }
    expect(refresh).toHaveBeenCalledTimes(2);
    poller.dispose();
  });

  it('does not retry before Retry-After after a 429', async () => {
    const windowObject = new EventTarget();
    const documentObject = new TestDocument();
    const refresh = vi.fn()
      .mockResolvedValueOnce({
        ok: false,
        error: { status: 429, retryAfterMs: 10_000 },
      })
      .mockResolvedValue({ ok: true, unchanged: true, revision: 1 });
    const poller = createAdaptiveStreamPoller({
      refresh,
      windowObject,
      documentObject,
      navigatorObject: { onLine: true },
      random: () => 0,
      setTimer: setTimeout,
      clearTimer: clearTimeout,
    });

    poller.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(refresh).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(9_999);
    expect(refresh).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(2);
    poller.dispose();
  });
});
