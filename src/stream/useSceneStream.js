import { useCallback, useEffect, useRef, useState } from 'react';
import {
  sceneStreamSignature,
  streamIndicatorValue,
} from '../../shared/scene-stream-protocol.js';
import { streamApi, StreamApiError, streamShareUrl } from './api.js';
import { useAdaptiveStreamPolling } from './useAdaptiveStreamPolling.js';

const OWNER_PUBLISH_DEBOUNCE_MS = 550;

function ownerStreamStatus(stream) {
  return stream?.paused ? 'paused' : stream ? 'active' : 'inactive';
}

function storedShareLink(userId, streamId) {
  try {
    const value = JSON.parse(window.sessionStorage.getItem('cadence:scene-stream-link:v1'));
    return value?.userId === userId
      && value?.streamId === streamId
      && typeof value.url === 'string'
      ? value.url
      : '';
  } catch {
    return '';
  }
}

function storeShareLink(userId, streamId, url) {
  try {
    if (userId && streamId && url) {
      window.sessionStorage.setItem('cadence:scene-stream-link:v1', JSON.stringify({ userId, streamId, url }));
    } else {
      window.sessionStorage.removeItem('cadence:scene-stream-link:v1');
    }
  } catch {
    // Le lien reste disponible pour la session React.
  }
}

function indicatorValueSnapshot(scene, change) {
  if (!scene || scene.id !== change.sceneId) return undefined;
  const participant = [
    ...(Array.isArray(scene.participants) ? scene.participants : []),
    ...(Array.isArray(scene.reserve) ? scene.reserve : []),
  ].find((entry) => entry.id === change.participantId);
  const indicator = (participant?.trackers || []).find((entry) => entry.id === change.indicatorId);
  return indicator ? JSON.stringify(streamIndicatorValue(indicator)) : undefined;
}

export function useSceneStream({ scene, cloudSync, onGuestChange }) {
  const user = cloudSync?.user || null;
  const csrfToken = cloudSync?.csrfToken || '';
  const [stream, setStream] = useState(null);
  const [shareUrl, setShareUrl] = useState('');
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [lastUpdateAt, setLastUpdateAt] = useState('');
  const sceneRef = useRef(scene);
  const streamRef = useRef(null);
  const csrfRef = useRef(csrfToken);
  const revisionRef = useRef(0);
  const lastPublishedSignatureRef = useRef('');
  const publishingRef = useRef(false);
  const publishAgainRef = useRef(false);
  const publishPromiseRef = useRef(null);
  const mountedRef = useRef(true);
  const operationEpochRef = useRef(0);
  const appliedGuestVersionsRef = useRef(new Set());
  const previousSceneIdRef = useRef(scene?.id || '');

  useEffect(() => { sceneRef.current = scene; }, [scene]);
  useEffect(() => { streamRef.current = stream; }, [stream]);
  useEffect(() => { csrfRef.current = csrfToken; }, [csrfToken]);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const applyGuestChanges = useCallback((changes = [], baselineScene = sceneRef.current) => {
    let ownerChanged = false;
    for (const change of changes) {
      const key = JSON.stringify([
        change.sceneId,
        change.participantId,
        change.indicatorId,
        change.version,
      ]);
      if (appliedGuestVersionsRef.current.has(key)) continue;
      appliedGuestVersionsRef.current.add(key);
      const baselineValue = indicatorValueSnapshot(baselineScene, change);
      const currentValue = indicatorValueSnapshot(sceneRef.current, change);
      if (baselineValue === undefined || currentValue !== baselineValue) {
        ownerChanged = true;
        continue;
      }
      onGuestChange?.(change);
    }
    return { ownerChanged };
  }, [onGuestChange]);

  const publish = useCallback(async ({ force = false, keepalive = false } = {}) => {
    const currentStream = streamRef.current;
    const currentScene = sceneRef.current;
    if (!currentStream || currentStream.paused || !currentScene || !csrfRef.current) return { ok: false, skipped: true };
    const operationEpoch = operationEpochRef.current;
    const streamId = currentStream.id;
    const signature = sceneStreamSignature(currentScene);
    if (!force && signature === lastPublishedSignatureRef.current) return { ok: true, skipped: true };
    if (publishingRef.current) {
      publishAgainRef.current = true;
      return publishPromiseRef.current || { ok: false };
    }

    publishingRef.current = true;
    publishAgainRef.current = false;
    const request = (async () => {
      try {
        const result = await streamApi.publish(currentScene, csrfRef.current, {
          keepalive,
          streamId,
        });
        if (operationEpoch !== operationEpochRef.current || streamRef.current?.id !== streamId) {
          return { ok: false, stale: true };
        }
        lastPublishedSignatureRef.current = signature;
        revisionRef.current = Number(result.stream?.revision || revisionRef.current);
        if (mountedRef.current) {
          setStream(result.stream);
          setStatus('active');
          setError('');
          setLastUpdateAt(result.stream?.updatedAt || new Date().toISOString());
        }
        const reconciliation = applyGuestChanges(result.changes, currentScene);
        if (reconciliation.ownerChanged) publishAgainRef.current = true;
        return { ok: true };
      } catch (requestError) {
        if (operationEpoch !== operationEpochRef.current || streamRef.current?.id !== streamId) {
          return { ok: false, stale: true };
        }
        if (requestError.code === 'STREAM_NOT_ACTIVE' || requestError.code === 'STREAM_REVOKED') {
          streamRef.current = null;
          revisionRef.current = 0;
          if (mountedRef.current) {
            setStream(null);
            setStatus('inactive');
          }
        } else if (requestError.code === 'STREAM_EXPIRED') {
          streamRef.current = null;
          revisionRef.current = 0;
          lastPublishedSignatureRef.current = '';
          storeShareLink('', '', '');
          if (mountedRef.current) {
            setStream(null);
            setShareUrl('');
            setStatus('expired');
            setError('');
          }
        } else if (mountedRef.current) {
          setStatus(requestError.status === 0 ? 'offline' : 'error');
          setError(requestError.message);
        }
        return { ok: false, error: requestError };
      } finally {
        publishingRef.current = false;
        publishPromiseRef.current = null;
        if (publishAgainRef.current && streamRef.current) {
          publishAgainRef.current = false;
          window.setTimeout(() => publish(), 0);
        }
      }
    })();
    publishPromiseRef.current = request;
    return request;
  }, [applyGuestChanges]);

  const refresh = useCallback(async ({ publishFirst = true } = {}) => {
    if (!streamRef.current) return { ok: false, disabled: true };
    if (!streamRef.current?.paused && publishFirst && sceneStreamSignature(sceneRef.current) !== lastPublishedSignatureRef.current) {
      const publication = await publish();
      if (!publication.ok) return publication;
    }
    const operationEpoch = operationEpochRef.current;
    const streamId = streamRef.current?.id;
    const baselineScene = sceneRef.current;
    const requestedRevision = revisionRef.current;
    if (!streamId) return;
    try {
      const result = await streamApi.owner(requestedRevision);
      if (operationEpoch !== operationEpochRef.current || streamRef.current?.id !== streamId) return;
      if (result.unchanged) {
        if (mountedRef.current) {
          setStatus(ownerStreamStatus(streamRef.current));
          setError('');
        }
        return { ok: true, unchanged: true, revision: result.revision };
      }
      const nextRevision = Number(result.stream?.revision || revisionRef.current);
      if (nextRevision < revisionRef.current) return;
      if (!result.stream) {
        streamRef.current = null;
        revisionRef.current = 0;
        lastPublishedSignatureRef.current = '';
        storeShareLink('', '', '');
        if (mountedRef.current) {
          setStream(null);
          setShareUrl('');
          setStatus(result.expired ? 'expired' : 'inactive');
          setError('');
        }
        return { ok: false, terminal: true, expired: result.expired === true };
      }
      revisionRef.current = nextRevision;
      if (mountedRef.current) {
        setStream(result.stream);
        setStatus(ownerStreamStatus(result.stream));
        setError('');
        setLastUpdateAt((current) => result.stream?.updatedAt || current);
      }
      const reconciliation = applyGuestChanges(result.changes, baselineScene);
      if (reconciliation.ownerChanged) void publish({ force: true });
      return {
        ok: true,
        changed: nextRevision > requestedRevision,
        revisionDelta: Math.max(0, nextRevision - requestedRevision),
        revision: nextRevision,
        stream: result.stream,
      };
    } catch (requestError) {
      if (!mountedRef.current
        || operationEpoch !== operationEpochRef.current
        || streamRef.current?.id !== streamId) return;
      if (requestError instanceof StreamApiError && requestError.status === 401) {
        setStream(null);
        setStatus('inactive');
        return;
      }
      setStatus(requestError.status === 0 ? 'offline' : 'error');
      setError(requestError.message);
      return { ok: false, error: requestError };
    }
  }, [applyGuestChanges, publish]);

  const polling = useAdaptiveStreamPolling({
    enabledKey: stream?.id && !stream.paused ? stream.id : '',
    refresh,
    onPause: () => {
      if (!streamRef.current || sceneStreamSignature(sceneRef.current) === lastPublishedSignatureRef.current) return;
      void publish({ keepalive: true });
    },
  });

  useEffect(() => {
    let cancelled = false;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    lastPublishedSignatureRef.current = '';
    appliedGuestVersionsRef.current.clear();
    if (!user) {
      streamRef.current = null;
      revisionRef.current = 0;
      setStream(null);
      setShareUrl('');
      setStatus('inactive');
      setError('');
      return undefined;
    }
    setStatus('checking');
    setShareUrl('');
    (async () => {
      try {
        const result = await streamApi.link();
        if (cancelled || operationEpoch !== operationEpochRef.current) return;
        streamRef.current = result.stream;
        revisionRef.current = Number(result.stream?.revision || 0);
        const recoveredUrl = storedShareLink(user.id, result.stream?.id);
        setStream(result.stream);
        setShareUrl(recoveredUrl);
        if (!recoveredUrl) storeShareLink('', '', '');
        setStatus(result.stream ? ownerStreamStatus(result.stream) : result.expired ? 'expired' : 'inactive');
        setError('');
      } catch (requestError) {
        if (cancelled || operationEpoch !== operationEpochRef.current) return;
        setStatus(requestError.status === 0 ? 'offline' : 'error');
        setError(requestError.message);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    if (!stream?.id || stream.paused) return undefined;
    const sceneChanged = previousSceneIdRef.current && previousSceneIdRef.current !== scene?.id;
    previousSceneIdRef.current = scene?.id || '';
    const timer = window.setTimeout(() => publish({ force: sceneChanged }), sceneChanged ? 0 : OWNER_PUBLISH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [publish, scene, stream?.id, stream?.paused]);

  useEffect(() => {
    const flush = () => {
      if (!streamRef.current || sceneStreamSignature(sceneRef.current) === lastPublishedSignatureRef.current) return;
      void publish({ keepalive: true });
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [publish]);

  const generate = useCallback(async () => {
    if (!user || !csrfRef.current) return { ok: false };
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const previousStream = streamRef.current;
    streamRef.current = null;
    setStream(null);
    setStatus('creating');
    setError('');
    try {
      const result = await streamApi.createLink(csrfRef.current);
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      const url = streamShareUrl(result.token);
      streamRef.current = result.stream;
      revisionRef.current = Number(result.stream?.revision || 0);
      lastPublishedSignatureRef.current = '';
      setStream(result.stream);
      setShareUrl(url);
      storeShareLink(user.id, result.stream.id, url);
      setStatus('active');
      await publish({ force: true });
      return { ok: true, url };
    } catch (requestError) {
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      streamRef.current = previousStream;
      setStream(previousStream);
      setStatus(requestError.status === 0 ? 'offline' : 'error');
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    }
  }, [publish, user]);

  const revoke = useCallback(async () => {
    if (!user || !csrfRef.current) return { ok: false };
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const previousStream = streamRef.current;
    streamRef.current = null;
    setStream(null);
    setStatus('revoking');
    setError('');
    try {
      await streamApi.revokeLink(csrfRef.current);
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      streamRef.current = null;
      revisionRef.current = 0;
      lastPublishedSignatureRef.current = '';
      setStream(null);
      setShareUrl('');
      storeShareLink('', '', '');
      setStatus('inactive');
      return { ok: true };
    } catch (requestError) {
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      streamRef.current = previousStream;
      setStream(previousStream);
      setStatus(requestError.status === 0 ? 'offline' : 'error');
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    }
  }, [user]);

  const setEnabled = useCallback(async (enabled) => {
    const current = streamRef.current;
    if (!user || !csrfRef.current || !current || current.paused === !enabled) return { ok: !!current };
    if (!enabled) await publish({ force: true });
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    setStatus(enabled ? 'resuming' : 'pausing');
    setError('');
    try {
      const result = await streamApi.setLinkEnabled(current.id, enabled, csrfRef.current);
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      streamRef.current = result.stream;
      revisionRef.current = Number(result.stream?.revision || revisionRef.current);
      setStream(result.stream);
      setStatus(ownerStreamStatus(result.stream));
      setLastUpdateAt(result.stream?.updatedAt || new Date().toISOString());
      if (enabled) await publish({ force: true });
      return { ok: true };
    } catch (requestError) {
      if (operationEpoch !== operationEpochRef.current) return { ok: false, stale: true };
      streamRef.current = current;
      setStream(current);
      setStatus(requestError.status === 0 ? 'offline' : ownerStreamStatus(current));
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    }
  }, [publish, user]);

  return {
    active: !!stream && !stream.paused,
    available: !!stream,
    paused: !!stream?.paused,
    stream,
    shareUrl,
    status,
    error,
    lastUpdateAt,
    generate,
    setEnabled,
    revoke,
    refresh,
    publish,
    polling,
  };
}
