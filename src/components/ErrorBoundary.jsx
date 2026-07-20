import React from 'react';
import { clearAllCadenceStorage } from '../localCampaignStorage.js';
import { t } from '../i18n/index.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  resetLocalData = () => {
    clearAllCadenceStorage();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return <div className="app"><div className="shell"><div className="sheet" style={{ marginTop: 24 }}><h1>{t('errors.title')}</h1><p className="muted">{t('errors.description')}</p><pre className="error-box">{this.state.error?.message || t('errors.unknown')}</pre><div className="grid2"><button className="primary" onClick={() => window.location.reload()}>{t('errors.reload')}</button><button className="danger-btn" onClick={this.resetLocalData}>{t('errors.resetLocalData')}</button></div></div></div></div>;
  }
}
