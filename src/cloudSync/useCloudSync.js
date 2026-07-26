import { useCallback, useEffect, useRef, useState } from 'react';
import { cloudApi, CloudApiError } from './api.js';
import { t } from '../i18n/index.js';

const LINK_STORAGE_KEY = 'cadence:cloud-link:v1';
const AUTO_SAVE_DELAY_MS = 1_500;
const REMOTE_CHECK_INTERVAL_MS = 45_000;

export function campaignSyncSignature(payload) {
  if (!payload || typeof payload !== 'object') return '';
  const { savedAt: _savedAt, appVersion: _appVersion, ...content } = payload;
  return JSON.stringify(content);
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
  const lastSyncedSignatureRef = useRef('');
  const pendingPullRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => { snapshotRef.current = snapshot; }, [snapshot]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { csrfRef.current = csrfToken; }, [csrfToken]);
  useEffect(() => () => { mountedRef.current = false; }, []);

  const rememberSync = useCallback((revision, signature = campaignSyncSignature(snapshotRef.current)) => {
    revisionRef.current = revision;
    lastSyncedSignatureRef.current = signature;
    if (userRef.current) storeLink({ userId: userRef.current.id, revision, signature });
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
    rememberSync(pending.revision, campaignSyncSignature(snapshot));
    setLinked(true);
    setStatus('synced');
    setError('');
  }, [rememberSync, snapshot]);

  const loadRemote = useCallback(async ({ restoreLink = false } = {}) => {
    setStatus('loading');
    const result = await cloudApi.campaign();
    const remote = result.campaign || null;
    setRemoteCampaign(remote);
    if (!remote) {
      revisionRef.current = 0;
      setLinked(restoreLink);
      setStatus('ready-empty');
      return remote;
    }

    const stored = restoreLink ? readStoredLink() : null;
    const localSignature = campaignSyncSignature(snapshotRef.current);
    if (stored?.userId === userRef.current?.id) {
      if (remote.revision > Number(stored.revision || 0) && localSignature === stored.signature) {
        applyRemote(remote);
        return remote;
      }
      if (remote.revision === Number(stored.revision || 0)) {
        revisionRef.current = remote.revision;
        lastSyncedSignatureRef.current = stored.signature || '';
        setLinked(true);
        setStatus('synced');
        return remote;
      }
      if (remote.revision > Number(stored.revision || 0) && localSignature !== stored.signature) {
        revisionRef.current = remote.revision;
        setLinked(false);
        setStatus('conflict');
        return remote;
      }
    }
    revisionRef.current = remote.revision;
    setLinked(false);
    setStatus('remote-available');
    return remote;
  }, [applyRemote]);

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

  const login = useCallback(async (email, password) => {
    setError('');
    setStatus('loading');
    try {
      const result = await cloudApi.login(email, password);
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
    lastSyncedSignatureRef.current = '';
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

  const upload = useCallback(async ({ overwrite = false } = {}) => {
    if (!userRef.current) return { ok: false };
    setStatus('saving');
    setError('');
    const payload = snapshotRef.current;
    const baseRevision = overwrite ? Number(remoteCampaign?.revision || revisionRef.current || 0) : revisionRef.current;
    try {
      const result = await cloudApi.saveCampaign(payload, baseRevision, csrfRef.current);
      const remote = result.campaign;
      setRemoteCampaign(remote);
      rememberSync(remote.revision, campaignSyncSignature(payload));
      setLinked(true);
      setStatus('synced');
      return { ok: true };
    } catch (requestError) {
      if (requestError instanceof CloudApiError && requestError.code === 'REVISION_CONFLICT') {
        const remote = requestError.data?.campaign || null;
        if (remote) {
          revisionRef.current = remote.revision;
          setRemoteCampaign(remote);
        }
        setLinked(false);
        setStatus('conflict');
      } else {
        setStatus(requestError.status === 0 ? 'offline' : 'error');
      }
      setError(requestError.message);
      return { ok: false, message: requestError.message };
    }
  }, [rememberSync, remoteCampaign?.revision]);

  const useRemote = useCallback(() => {
    if (!remoteCampaign) return;
    applyRemote(remoteCampaign);
  }, [applyRemote, remoteCampaign]);

  useEffect(() => {
    if (!linked || !user || pendingPullRef.current) return undefined;
    const signature = campaignSyncSignature(snapshot);
    if (!signature || signature === lastSyncedSignatureRef.current) return undefined;
    const timer = window.setTimeout(() => upload(), AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [linked, snapshot, upload, user]);

  useEffect(() => {
    if (!linked || !user) return undefined;
    const check = async () => {
      try {
        const result = await cloudApi.campaign();
        const remote = result.campaign;
        if (!remote || remote.revision <= revisionRef.current) return;
        setRemoteCampaign(remote);
        const localUnchanged = campaignSyncSignature(snapshotRef.current) === lastSyncedSignatureRef.current;
        if (localUnchanged) applyRemote(remote);
        else {
          revisionRef.current = remote.revision;
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
  }, [applyRemote, linked, user]);

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
