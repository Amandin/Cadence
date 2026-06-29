import { describe, expect, it, vi } from 'vitest';
import { keepScreenAwakeWhileForeground } from './screenWakeLock.js';

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

function makeEnvironment() {
  const documentRef = new EventTarget();
  const windowRef = new EventTarget();
  let focused = true;
  documentRef.visibilityState = 'visible';
  documentRef.hasFocus = () => focused;

  const locks = [];
  const navigatorRef = {
    wakeLock: {
      request: vi.fn(async () => {
        const lock = new EventTarget();
        lock.released = false;
        lock.release = vi.fn(async () => {
          if (lock.released) return;
          lock.released = true;
          lock.dispatchEvent(new Event('release'));
        });
        locks.push(lock);
        return lock;
      }),
    },
  };

  return {
    documentRef,
    windowRef,
    navigatorRef,
    locks,
    setFocused(value) {
      focused = value;
      windowRef.dispatchEvent(new Event(value ? 'focus' : 'blur'));
    },
    setVisibility(value) {
      documentRef.visibilityState = value;
      documentRef.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

describe('screen wake lock', () => {
  it('keeps the screen awake only while Cadence has focus', async () => {
    const environment = makeEnvironment();
    const cleanup = keepScreenAwakeWhileForeground(environment);
    await flushPromises();

    expect(environment.navigatorRef.wakeLock.request).toHaveBeenCalledWith('screen');
    expect(environment.locks).toHaveLength(1);

    environment.setFocused(false);
    await flushPromises();
    expect(environment.locks[0].release).toHaveBeenCalledOnce();

    environment.setFocused(true);
    await flushPromises();
    expect(environment.navigatorRef.wakeLock.request).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('releases the lock while hidden and requests it again when visible', async () => {
    const environment = makeEnvironment();
    const cleanup = keepScreenAwakeWhileForeground(environment);
    await flushPromises();

    environment.setVisibility('hidden');
    await flushPromises();
    expect(environment.locks[0].release).toHaveBeenCalledOnce();

    environment.setVisibility('visible');
    await flushPromises();
    expect(environment.navigatorRef.wakeLock.request).toHaveBeenCalledTimes(2);

    cleanup();
  });

  it('requests a new lock after an unexpected browser release', async () => {
    const environment = makeEnvironment();
    const cleanup = keepScreenAwakeWhileForeground(environment);
    await flushPromises();

    environment.locks[0].released = true;
    environment.locks[0].dispatchEvent(new Event('release'));
    await flushPromises();

    expect(environment.navigatorRef.wakeLock.request).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('does nothing when the browser does not support wake locks', async () => {
    const documentRef = new EventTarget();
    const windowRef = new EventTarget();
    documentRef.visibilityState = 'visible';
    documentRef.hasFocus = () => true;

    const cleanup = keepScreenAwakeWhileForeground({ documentRef, windowRef, navigatorRef: {} });
    windowRef.dispatchEvent(new Event('blur'));
    windowRef.dispatchEvent(new Event('focus'));
    await flushPromises();

    expect(() => cleanup()).not.toThrow();
  });

  it('releases a pending lock if Cadence leaves the foreground before it resolves', async () => {
    const documentRef = new EventTarget();
    const windowRef = new EventTarget();
    let focused = true;
    documentRef.visibilityState = 'visible';
    documentRef.hasFocus = () => focused;

    let resolveRequest;
    const request = vi.fn(() => new Promise((resolve) => { resolveRequest = resolve; }));
    const cleanup = keepScreenAwakeWhileForeground({
      documentRef,
      windowRef,
      navigatorRef: { wakeLock: { request } },
    });
    focused = false;
    windowRef.dispatchEvent(new Event('blur'));

    const lock = new EventTarget();
    lock.released = false;
    lock.release = vi.fn(async () => { lock.released = true; });
    resolveRequest(lock);
    await flushPromises();

    expect(lock.release).toHaveBeenCalledOnce();
    cleanup();
  });
});
