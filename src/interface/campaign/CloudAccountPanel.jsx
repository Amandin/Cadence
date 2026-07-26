import { useState } from 'react';
import { t } from '../../i18n/index.js';

function remoteDate(remoteCampaign) {
  if (!remoteCampaign?.updatedAt) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(remoteCampaign.updatedAt));
  } catch {
    return remoteCampaign.updatedAt;
  }
}

export function CloudAccountPanel({ cloudSync }) {
  const [email, setEmail] = useState('');
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
    const result = await cloudSync.login(email, password);
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
            {t('cloud.email')}
            <input type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label className="field">
            {t('cloud.password')}
            <input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <button className="primary" type="submit" disabled={submitting || busy}>{t('cloud.login')}</button>
        </form>
      ) : (
        <>
          <div className="cloud-account-summary">
            <div>
              <strong>{cloudSync.user.displayName}</strong>
              <span className="muted">{cloudSync.user.email}</span>
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
        </>
      )}
    </section>
  );
}
