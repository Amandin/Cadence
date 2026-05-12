import React from 'react';
import { STORAGE_KEY } from '../constants.js';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  resetLocalData = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return <div className="app"><div className="shell"><div className="sheet" style={{ marginTop: 24 }}><h1>Cadence a rencontré une erreur</h1><p className="muted">L’interface a été interrompue au lieu de continuer sur un état incohérent.</p><pre className="error-box">{this.state.error?.message || 'Erreur inconnue'}</pre><div className="grid2"><button className="primary" onClick={() => window.location.reload()}>Recharger</button><button className="danger-btn" onClick={this.resetLocalData}>Réinitialiser les données locales</button></div></div></div></div>;
  }
}
