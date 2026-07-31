import { useCallback, useEffect, useRef, useState } from 'react';
import { cloudApi, CloudApiError } from './api.js';
import {
  campaignContentHash,
  campaignSyncSignature,
  createCampaignPatch,
  serializedBytes,
} from '../../shared/cloud-sync-protocol.js';
import { t } from '../i18n/index.js';

const LINK_STORAGE_KEY = 'cadence:cloud-link:v2';
const AUTO_SAVE_DELAY_MS = 30_000;
const REMOTE_CHECK_INTERVAL_MS = 5 * 60_000;
const KEEPALIVE_SAFE_BYTES = 48 * 1024;
const PATCH_COMPACTION_LIMIT = 100;

function clonePayload(payload) {
  return typeof structuredClone === 'function'
    ? structuredClone(payload)
    : JSON.parse(JSON.stringify(payload));
}

function readStoredLink() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LINK_STORAGE_KEY));
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function storeLink(value) {
  try {
    if (value) window.localStorage.setItem(LINK_STORAGE_KEY, JSON.stringify(value));
    else window.localStorage.removeItem(LINK_STORAGE_KEY);
  } catch {
    // La synchronisation continue pour la session même sans stockage local.
  }
}

function statusMessage(status, error) {
  if (error) return error;
  const key = {
    checking: 'cloud.status.checking',
    'signed-out': 'cloud.status.signedOut',
    loading: 'cloud.status.loading',
    'ready-empty': 'cloud.status.readyEmpty',
    'remote-available': 'cloud.status.remoteAvailable',
    synced: 'cloud.status.synced',
    saving: 'cloud.status.saving',
    conflict: 'cloud.status.conflict',
    offline: 'cloud.status.offline',
    unavailable: 'cloud.status.unavailable',
    error: 'cloud.status.error',
  }[status];
  return key ? t(key) : '';
}

function plannedRequest(previous, next, metadata) {
  const full = !previous || !metadata?.hash || Number(metadata.patchCount || 0) >= PATCH_COMPACTION_LIMIT;
  if (full) return { full: true, bytes: serializedBytes({ payload: next, baseRevision: metadata?.revision || 0 }) };
  const patch = createCampaignPatch(previous, next);
  return {
    full: false,
    patch,
    bytes: serializedBytes({
      patch,
      baseRevision: metadata.revision,
      baseHash: metadata.hash,
      resultHash: '0'.repeat(64),
    }),
  };
}

export function useCloudSync({ snapshot, onApplyRemote }) {
  const [availability, setAvailability] = useState('checking');
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState('');
  const [status, setStatus] = useState('checking');
  const [error, setError] = useState('');
  const [remoteCampaign, setRemoteCampaign] = useState(null);
  const [linked, setLinked] = useState(false);
  const snapshotRef = useRef(snapshot);
  const userRef = useRef(null);
  const csrfRef = useRef('');
  const revisionRef = useRef(0);
  const lastSyncedHashRef = useRef('');
  const lastSyncedSignatureRef = useRef('');
  const baseSnapshotRef = useRef(null);
  const remoteMetadataRef = useRef(null);
  const pendingPullRef = useRef(null);
  const pendingPlanRef = useRef({ dirty: false, heavy: false, bytes: 0 });
  const uploadingRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { csrfRef.current = csrfToken; }, [csrfToken]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const rememberSync = useCallback((metadata, hash, payload = snapshotRef.current) => {
    const normalizedMetadata = { ...metadata, hash };
    revisionRef.current = Number(metadata.revision || 0);
    lastSyncedHashRef.current = hash;
    lastSyncedSignatureRef.current = campaignSyncSignature(payload);
    baseSnapshotRef.current = clonePayload(payload);
    remoteMetadataRef.current = normalizedMetadata;
    pendingPlanRef.current = { dirty: false, heavy: false, bytes: 0 };
    setRemoteCampaign((current) => ({ ...(current || {}), ...normalizedMetadata }));
    if (userRef.current) storeLink({ userId: userRef.current.id, revision: revisionRef.current, hash });
  }, []);

  const fetchRemote = useCallback(async () => {
    const result = await cloudApi.campaign();
    return result.campaign || null;
  }, []);

  const applyRemote = useCallback((campaign) => {
    if (!campaign?.payload) return;
    pendingPullRef.current = campaign;
    setLinked(false);
    setRemoteCampaign(campaign);
    onApplyRemote(campaign.payload);
  }, [onApplyRemote]);

  useEffect(() => {
    const pending = pendingPullRef.current;
    if (!pending) return;
    pendingPullRef.current = null;
    (async () => {
      const hash = pending.hash || await campaignContentHash(snapshot);
      rememberSync(pending, hash, snapshot);
      setLinked(true);
      setStatus('synced');
      setError('');
    })();
  }, [rememberSync, snapshot]);

  const loadRemote = useCallback(async ({ restoreLink = false } = {}) => {
    setStatus('loading');
    const metadataResult = await cloudApi.campaignMeta();
    const metadata = metadataResult.campaign || null;
    remoteMetadataRef.current = metadata;
    setRemoteCampaign(metadata);
    if (!metadata) {
      revisionRef.current = 0;
      lastSyncedHashRef.current = '';
      baseSnapshotRef.current = null;
      setLinked(false);
      setStatus('ready-empty');
      return null;
    }

    const localHash = await campaignContentHash(snapshotRef.current);
    const localSignature = campaignSyncSignature(snapshotRef.current);
    const stored = restoreLink ? readStoredLink() : null;

    if (metadata.hash && metadata.hash === localHash) {
      rememberSync(metadata, localHash);
      setLinked(true);
      setStatus('synced');
      return metadata;
    }

    if (stored?.userId === userRef.current?.id && stored.hash === localHash && metadata.revision > Number(stored.revision || 0)) {
      const remote = await fetchRemote();
      applyRemote(remote);
      return remote;
    }

    if (stored?.userId === userRef.current?.id && stored.hash === localHash && metadata.revision === Number(stored.revision || 0)) {
      lastSyncedHashRef.current = stored.hash;
      lastSyncedSignatureRef.current = localSignature;
      baseSnapshotRef.current = clonePayload(snapshotRef.current);
      revisionRef.current = metadata.revision;
      setLinked(true);
      setStatus('synced');
      return metadata;
    }

    const remote = await fetchRemote();
    setRemoteCampaign(remote);
    setLinked(false);
    setStatus('remote-available');
    return remote;
  }, [applyRemote, fetchRemote, rememberSync]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const session = await cloudApi.session();
        if (cancelled) return;
        setAvailability('available');
        if (!session.authenticated) {
          setStatus('signed-out');
          return;
        }
        userRef.current = session.user;
        csrfRef.current = session.csrfToken;
        setUser(session.user);
        setCsrfToken(session.csrfToken);
        await loadRemote({ restoreLink: true });
      } catch (requestError) {
        if (cancelled) return;
        setAvailability(requestError.status === 404 || requestError.status === 0 ? 'unavailable' : 'available');
        setStatus(requestError.status === 404 || requestError.status === 0 ? 'unavailable' : 'error');
        setError(requestError.message);
      }
    })();
    return () => { cancelled = true; };
  }, [loadRemote]);

  const login = useCallback(async (username, password) => {
    setError('');
    setStatus('loading');
    try {
      const result = await cloudApi.login(username, password);
      setAvailability('available');
      userRef.current = result.user;
      csrfRef.current = result.csrfToken;
      setUser(result.user);
      setCsrfToken(result.csrfToken);
      await loadRemote({ restoreLink: false });
      return { ok: true };
    } catch (requestError) {
      setStatus('signed-out');
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    }
  }, [loadRemote]);

  const logout = useCallback(async () => {
    const token = csrfRef.current;
    storeLink(null);
    userRef.current = null;
    csrfRef.current = '';
    revisionRef.current = 0;
    lastSyncedHashRef.current = '';
    lastSyncedSignatureRef.current = '';
    baseSnapshotRef.current = null;
    remoteMetadataRef.current = null;
    pendingPlanRef.current = { dirty: false, heavy: false, bytes: 0 };
    setUser(null);
    setCsrfToken('');
    setRemoteCampaign(null);
    setLinked(false);
    setError('');
    setStatus('signed-out');
    try {
      await cloudApi.logout(token);
    } catch {
      // La session locale est tout de même fermée.
    }
  }, []);

  const resolveConflict = useCallback(async (requestError) => {
    const remote = await fetchRemote().catch(() => requestError.data?.campaign || null);
    if (remote) {
      revisionRef.current = Number(remote.revision || revisionRef.current);
      remoteMetadataRef.current = remote;
      setRemoteCampaign(remote);
    }
    setLinked(false);
    setStatus('conflict');
  }, [fetchRemote]);

  const upload = useCallback(async ({ overwrite = false, keepalive = false } = {}) => {
    if (!userRef.current || uploadingRef.current) return { ok: false };
    const payload = snapshotRef.current;
    const signature = campaignSyncSignature(payload);
    if (!overwrite && signature === lastSyncedSignatureRef.current) return { ok: true, skipped: true };

    uploadingRef.current = true;
    setStatus('saving');
    setError('');
    try {
      const resultHash = await campaignContentHash(payload);
      const metadata = remoteMetadataRef.current;
      const baseRevision = overwrite ? Number(metadata?.revision || revisionRef.current || 0) : revisionRef.current;
      const plan = overwrite ? { full: true } : plannedRequest(baseSnapshotRef.current, payload, metadata);
      let result;

      if (plan.full) {
        result = await cloudApi.saveCampaign(payload, baseRevision, csrfRef.current, { keepalive });
      } else if (plan.patch.operations.length === 0) {
        rememberSync(metadata, resultHash, payload);
        setLinked(true);
        setStatus('synced');
        return { ok: true, skipped: true };
      } else {
        try {
          result = await cloudApi.patchCampaign(
            plan.patch,
            baseRevision,
            lastSyncedHashRef.current,
            resultHash,
            csrfRef.current,
            { keepalive },
          );
        } catch (requestError) {
          if (['FULL_SYNC_REQUIRED', 'PATCH_TOO_LARGE'].includes(requestError.code)) {
            result = await cloudApi.saveCampaign(payload, baseRevision, csrfRef.current, { keepalive: false });
          } else {
            throw requestError;
          }
        }
      }

      rememberSync(result.campaign, result.campaign.hash || resultHash, payload);
      setLinked(true);
      setStatus('synced');
      return { ok: true };
    } catch (requestError) {
      if (requestError instanceof CloudApiError && requestError.code === 'REVISION_CONFLICT') {
        await resolveConflict(requestError);
      } else {
        setStatus(requestError.status === 0 ? 'offline' : 'error');
      }
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    } finally {
      uploadingRef.current = false;
    }
  }, [rememberSync, resolveConflict]);

  const useRemote = useCallback(() => {
    if (!remoteCampaign?.payload) return;
    applyRemote(remoteCampaign);
  }, [applyRemote, remoteCampaign]);

  useEffect(() => {
    if (!linked || !user || pendingPullRef.current) {
      pendingPlanRef.current = { dirty: false, heavy: false, bytes: 0 };
      return undefined;
    }
    const signature = campaignSyncSignature(snapshot);
    if (!signature || signature === lastSyncedSignatureRef.current) {
      pendingPlanRef.current = { dirty: false, heavy: false, bytes: 0 };
      return undefined;
    }
    const plan = plannedRequest(baseSnapshotRef.current, snapshot, remoteMetadataRef.current);
    pendingPlanRef.current = { dirty: true, heavy: plan.bytes > KEEPALIVE_SAFE_BYTES, bytes: plan.bytes };
    const timer = window.setTimeout(() => upload(), AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [linked, snapshot, upload, user]);

  useEffect(() => {
    const warnBeforeLeaving = (event) => {
      if (!pendingPlanRef.current.dirty || !pendingPlanRef.current.heavy) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const flushWhenHidden = () => {
      if (document.visibilityState !== 'hidden') return;
      const pending = pendingPlanRef.current;
      if (pending.dirty && !pending.heavy) upload({ keepalive: true });
    };
    window.addEventListener('beforeunload', warnBeforeLeaving);
    document.addEventListener('visibilitychange', flushWhenHidden);
    return () => {
      window.removeEventListener('beforeunload', warnBeforeLeaving);
      document.removeEventListener('visibilitychange', flushWhenHidden);
    };
  }, [upload]);

  useEffect(() => {
    if (!linked || !user) return undefined;
    const check = async () => {
      try {
        const result = await cloudApi.campaignMeta();
        const metadata = result.campaign;
        if (!metadata) return;
        if (metadata.revision === revisionRef.current && metadata.hash === lastSyncedHashRef.current) return;

        const localUnchanged = campaignSyncSignature(snapshotRef.current) === lastSyncedSignatureRef.current;
        const remote = await fetchRemote();
        if (localUnchanged) applyRemote(remote);
        else {
          remoteMetadataRef.current = metadata;
          setRemoteCampaign(remote);
          setLinked(false);
          setStatus('conflict');
        }
      } catch {
        if (mountedRef.current) setStatus('offline');
      }
    };
    const onFocus = () => { if (document.visibilityState === 'visible') check(); };
    const interval = window.setInterval(check, REMOTE_CHECK_INTERVAL_MS);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [applyRemote, fetchRemote, linked, user]);

  return {
    availability,
    user,
    status,
    message: statusMessage(status, error),
    error,
    remoteCampaign,
    linked,
    login,
    logout,
    upload,
    useRemote,
  };
}
