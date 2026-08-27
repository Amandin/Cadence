import { useCallback, useEffect, useRef, useState } from 'react';
import { createAdaptiveStreamPoller } from './adaptivePoller.js';

const INITIAL_STATE = Object.freeze({
  mode: 'disabled',
  intervalMs: null,
  suspended: false,
  wakePending: false,
  calmProgress: 0,
  lastPollAt: 0,
  lastChangeAt: 0,
});

export function useAdaptiveStreamPolling({ enabledKey, refresh, onPause }) {
  const [state, setState] = useState(INITIAL_STATE);
  const refreshRef = useRef(refresh);
  const pauseRef = useRef(onPause);
  const pollerRef = useRef(null);
  refreshRef.current = refresh;
  pauseRef.current = onPause;

  useEffect(() => {
    if (!enabledKey) {
      setState(INITIAL_STATE);
      return undefined;
    }
    const poller = createAdaptiveStreamPoller({
      refresh: () => refreshRef.current?.(),
      onPause: () => pauseRef.current?.(),
      onStateChange: setState,
    });
    pollerRef.current = poller;
    poller.start();
    return () => {
      poller.dispose();
      if (pollerRef.current === poller) pollerRef.current = null;
    };
  }, [enabledKey]);

  const wake = useCallback(() => pollerRef.current?.wake(), []);
  return { ...state, wake };
}
