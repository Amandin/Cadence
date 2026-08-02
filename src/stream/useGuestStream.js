import { useCallback, useEffect, useRef, useState } from 'react';
import { streamApi } from './api.js';
import { createIndicatorWriteBatcher } from './indicatorWriteBatcher.js';
import { useAdaptiveStreamPolling } from './useAdaptiveStreamPolling.js';

function clientIndicatorKey(sceneId, participantId, indicatorId) {
  return JSON.stringify([sceneId, participantId, indicatorId]);
}

function updateViewIndicator(view, participantId, indicatorId, update) {
  if (!view?.scene) return view;
  const updateParticipant = (participant) => participant.id !== participantId ? participant : ({
    ...participant,
    indicators: (participant.indicators || []).map((indicator) => (
      indicator.id === indicatorId ? update(indicator) : indicator
    )),
  });
  return {
    ...view,
    scene: {
      ...view.scene,
      participants: (view.scene.participants || []).map(updateParticipant),
      reserve: (view.scene.reserve || []).map(updateParticipant),
    },
  };
}

export function useGuestStream(token) {
  const [view, setView] = useState(null);
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');
  const revisionRef = useRef(null);
  const viewRef = useRef(null);
  const mountedRef = useRef(true);
  const terminalRef = useRef(false);
  const tokenRef = useRef(token);
  const batcherRef = useRef(null);
  const refreshRef = useRef(null);
  tokenRef.current = token;

  useEffect(() => { viewRef.current = view; }, [view]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const replaceIndicator = useCallback((participantId, indicatorId, update) => {
    setView((current) => {
      const next = updateViewIndicator(current, participantId, indicatorId, update);
      viewRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    revisionRef.current = null;
    terminalRef.current = false;
    setView(null);
    viewRef.current = null;
    setStatus('loading');
    setMessage('');

    const batcher = createIndicatorWriteBatcher({
      sendBatch: (payloads, options) => streamApi.writeBatch(token, payloads, options),
      onSuccess: (payload, result) => {
        revisionRef.current = Math.max(
          Number(revisionRef.current || 0),
          Number(result.revision || 0),
        );
        const key = clientIndicatorKey(payload.sceneId, payload.participantId, payload.indicatorId);
        const latest = batcher.pending(key);
        replaceIndicator(payload.participantId, payload.indicatorId, (indicator) => ({
          ...indicator,
          ...result.indicator,
          value: latest && JSON.stringify(latest.value) !== JSON.stringify(payload.value)
            ? latest.value
            : result.indicator.value,
        }));
        if (mountedRef.current) {
          setStatus('live');
          setMessage('');
        }
      },
      onConflict: (payload, error) => {
        const current = error?.data?.indicator;
        if (current) {
          replaceIndicator(payload.participantId, payload.indicatorId, () => current);
          revisionRef.current = Math.max(
            Number(revisionRef.current || 0),
            Number(error.data?.revision || 0),
          );
        }
        if (mountedRef.current) {
          setMessage(error?.status === 409 ? 'conflict' : 'write-refused');
        }
        if (!current) window.setTimeout(() => refreshRef.current?.({ force: true }), 0);
      },
      onError: () => {
        if (mountedRef.current) {
          setStatus('offline');
          setMessage('write-error');
        }
      },
      onRateLimited: () => {
        if (mountedRef.current) {
          setStatus('live');
          setMessage('rate-limited');
        }
      },
    });
    batcherRef.current = batcher;
    return () => {
      batcher.dispose();
      if (batcherRef.current === batcher) batcherRef.current = null;
    };
  }, [replaceIndicator, token]);

  const mergePendingValues = useCallback((nextView) => {
    let merged = nextView;
    for (const { payload } of batcherRef.current?.pendingEntries?.() || []) {
      if (payload.sceneId !== nextView?.scene?.id) continue;
      merged = updateViewIndicator(merged, payload.participantId, payload.indicatorId, (indicator) => ({
        ...indicator,
        value: payload.value,
      }));
    }
    return merged;
  }, []);

  const refresh = useCallback(async ({ force = false } = {}) => {
    if (terminalRef.current && !force) return { ok: false, terminal: true };
    try {
      const since = force ? undefined : revisionRef.current;
      const initial = revisionRef.current == null;
      const result = await streamApi.guest(token, Number.isInteger(since) ? since : undefined);
      if (tokenRef.current !== token) return { ok: false, stale: true };
      if (result.unchanged) {
        if (mountedRef.current) {
          setStatus('live');
          setMessage('');
        }
        return { ok: true, unchanged: true, revision: result.revision };
      }
      const nextRevision = Number(result.stream?.revision || 0);
      if (revisionRef.current != null && nextRevision < revisionRef.current) {
        return { ok: true, stale: true };
      }
      const previousSceneId = viewRef.current?.scene?.id;
      const nextSceneId = result.view?.scene?.id;
      if (previousSceneId && nextSceneId && previousSceneId !== nextSceneId) {
        await batcherRef.current?.flushAll();
      }
      revisionRef.current = nextRevision;
      terminalRef.current = false;
      const nextView = mergePendingValues(result.view);
      viewRef.current = nextView;
      if (mountedRef.current) {
        setView(nextView);
        setStatus(nextView ? 'live' : 'waiting');
        setMessage('');
      }
      return {
        ok: true,
        initial,
        changed: !initial && nextRevision > Number(since || 0),
        revisionDelta: initial ? 0 : Math.max(0, nextRevision - Number(since || 0)),
        revision: nextRevision,
        stream: result.stream,
      };
    } catch (requestError) {
      if (!mountedRef.current || tokenRef.current !== token) return { ok: false, stale: true };
      if (requestError.status === 404) {
        terminalRef.current = true;
        revisionRef.current = null;
        viewRef.current = null;
        setView(null);
        setStatus('unavailable');
        setMessage('');
      } else {
        setStatus('offline');
      }
      return { ok: false, terminal: requestError.status === 404, error: requestError };
    }
  }, [mergePendingValues, token]);
  refreshRef.current = refresh;

  const polling = useAdaptiveStreamPolling({
    enabledKey: token || 'invalid-stream-token',
    refresh,
    onPause: () => { void batcherRef.current?.flushAll({ keepalive: true }); },
  });

  useEffect(() => {
    const flush = () => { void batcherRef.current?.flushAll({ keepalive: true }); };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, []);

  const changeIndicator = useCallback((participantId, indicator, value, {
    baseVersion = indicator.version,
    immediate = false,
  } = {}) => {
    const sceneId = viewRef.current?.scene?.id;
    if (!sceneId || !indicator?.writable) return;
    const key = clientIndicatorKey(sceneId, participantId, indicator.id);
    replaceIndicator(participantId, indicator.id, (current) => ({ ...current, value }));
    batcherRef.current?.enqueue(key, {
      sceneId,
      participantId,
      indicatorId: indicator.id,
      baseVersion,
      value,
    });
    if (immediate) void batcherRef.current?.flush(key).catch(() => {});
  }, [replaceIndicator]);

  const flushAll = useCallback((options) => batcherRef.current?.flushAll(options) || Promise.resolve([]), []);

  return {
    view,
    status,
    message,
    changeIndicator,
    flushAll,
    refresh,
    polling,
  };
}
