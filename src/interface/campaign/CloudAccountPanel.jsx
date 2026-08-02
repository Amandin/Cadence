import { useState } from 'react';
import { t } from '../../i18n/index.js';
import { SCENE_STREAM_INACTIVITY_TTL_MS } from '../../../shared/scene-stream-protocol.js';

function remoteDate(remoteCampaign) {
  if (!remoteCampaign?.updatedAt) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(remoteCampaign.updatedAt));
  } catch {
    return remoteCampaign.updatedAt;
  }
}

function streamExpiryDate(stream) {
  const updatedAt = Date.parse(stream?.updatedAt || '');
  if (!Number.isFinite(updatedAt)) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(updatedAt + SCENE_STREAM_INACTIVITY_TTL_MS));
}

function SceneStreamPanel({ sceneStream }) {
  const [copied, setCopied] = useState(false);
  if (!sceneStream) return null;
  const busy = ['creating', 'revoking'].includes(sceneStream?.status);
  const copyLink = async () => {
    if (!sceneStream?.shareUrl) return;
    try {
      await navigator.clipboard.writeText(sceneStream.shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1_800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="scene-stream-panel">
      <div className="hub-section-head">
        <div>
          <h4>{t('stream.owner.title')}</h4>
          <p className="muted compact-help">{t('stream.owner.help')}</p>
        </div>
        {sceneStream?.active && <span className="chip hot">{t('stream.owner.active')}</span>}
      </div>
      {!sceneStream?.active ? (
        <div className="stack">
          {sceneStream?.status === 'expired' && (
            <p className="campaign-save-status status-ready" role="status">{t('stream.owner.expired')}</p>
          )}
          <button className="primary" type="button" onClick={sceneStream?.generate} disabled={busy}>
            {t('stream.owner.generate')}
          </button>
        </div>
      ) : (
        <div className="stack">
          {sceneStream.shareUrl ? (
            <div className="scene-stream-link-row">
              <input aria-label={t('stream.owner.link')} value={sceneStream.shareUrl} readOnly />
              <button className="small-btn" type="button" onClick={copyLink}>{copied ? t('stream.owner.copied') : t('stream.owner.copy')}</button>
            </div>
          ) : <p className="muted compact-help">{t('stream.owner.linkUnavailable')}</p>}
          <p className="muted compact-help">{t('stream.owner.privateWarning')}</p>
          <p className="muted compact-help" role="status">
            {t('stream.owner.expiryNotice', { date: streamExpiryDate(sceneStream.stream) })}
          </p>
          <div className="scene-stream-actions">
            <button className="small-btn" type="button" onClick={sceneStream.generate} disabled={busy}>{t('stream.owner.regenerate')}</button>
            <button className="danger-btn mini-danger" type="button" onClick={sceneStream.revoke} disabled={busy}>{t('stream.owner.revoke')}</button>
          </div>
        </div>
      )}
      {sceneStream?.error && <p className="campaign-save-status status-error" role="alert">{sceneStream.error}</p>}
    </section>
  );
}

export function CloudAccountPanel({ cloudSync, sceneStream }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!cloudSync || cloudSync.availability === 'unavailable') {
    return (
      <section className="stack hub-section panel cloud-account-panel">
        <div className="hub-section-head">
          <div>
            <h3>{t('cloud.title')}</h3>
            <p className="muted compact-help">{t('cloud.unavailableHelp')}</p>
          </div>
        </div>
      </section>
    );
  }

  const connect = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const result = await cloudSync.login(username, password);
    setSubmitting(false);
    if (result.ok) setPassword('');
  };

  const busy = ['checking', 'loading', 'saving'].includes(cloudSync.status);
  const remoteAvailable = !!cloudSync.remoteCampaign;
  const needsChoice = ['remote-available', 'conflict'].includes(cloudSync.status);

  return (
    <section className="stack hub-section panel cloud-account-panel">
      <div className="hub-section-head">
        <div>
          <h3>{t('cloud.title')}</h3>
          <p className="muted compact-help">{t('cloud.privateHelp')}</p>
        </div>
        {cloudSync.user && <span className={`chip ${cloudSync.linked ? 'hot' : ''}`}>{cloudSync.linked ? t('cloud.synced') : t('cloud.connected')}</span>}
      </div>

      {!cloudSync.user ? (
        <form className="cloud-login-form" onSubmit={connect}>
          <label className="field">
            {t('cloud.username')}
            <input type="text" autoComplete="username" required minLength={3} maxLength={48} value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label className="field">
            {t('cloud.password')}
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={submitting || busy}>{t('cloud.login')}</button>
          {cloudSync.error && <p className="campaign-save-status status-error" role="alert">{cloudSync.error}</p>}
        </form>
      ) : (
        <>
          <div className="cloud-account-summary">
            <div>
              <strong>{cloudSync.user.displayName}</strong>
              <span className="muted">@{cloudSync.user.username}</span>
            </div>
            <button type="button" className="small-btn" onClick={cloudSync.logout}>{t('cloud.logout')}</button>
          </div>

          <div className={`campaign-save-status status-${cloudSync.status}`}>{cloudSync.message}</div>
          {remoteAvailable && <p className="muted compact-help">{t('cloud.remoteMeta', { date: remoteDate(cloudSync.remoteCampaign), revision: cloudSync.remoteCampaign.revision })}</p>}

          {(needsChoice || cloudSync.status === 'ready-empty') && (
            <div className="cloud-sync-choice">
              {remoteAvailable && <button type="button" className="primary" onClick={cloudSync.useRemote} disabled={busy}>{t('cloud.pull')}</button>}
              <button type="button" className="small-btn" onClick={() => cloudSync.upload({ overwrite: needsChoice })} disabled={busy}>
                {remoteAvailable ? t('cloud.replace') : t('cloud.push')}
              </button>
              {needsChoice && <p className="muted compact-help">{t('cloud.choiceHelp')}</p>}
            </div>
          )}
          <SceneStreamPanel sceneStream={sceneStream} />
        </>
      )}
    </section>
  );
}
