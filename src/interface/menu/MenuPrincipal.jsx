import { useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function LogoMenu({ sombre }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <div className="menu-brand">
      <img src={logo} alt="Cadence" />
      <div>
        <strong>Cadence</strong>
        <span className="muted">Initiative & scènes</span>
      </div>
    </div>
  );
}

function LigneVersionEtTheme({ sombre, onChangerTheme }) {
  return (
    <div className="menu-topline">
      <span className="version-chip">v{APP_VERSION}</span>
      <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre">
        <span>☀</span>
        <span>☾</span>
        <i />
      </button>
    </div>
  );
}

function ListeScenes({ scenes, onChoisirScene, onFermer }) {
  return (
    <>
      <h3>Scènes</h3>
      <div className="stack">
        {scenes.map((scene, index) => (
          <button className="small-btn" key={scene.id} onClick={() => { onChoisirScene(index); onFermer(); }}>
            {scene.title} · R{scene.round}
          </button>
        ))}
      </div>
    </>
  );
}

function OptionsCompteurScene({ compteur, onModifier }) {
  const courant = compteur || { enabled: false, name: 'Menace', mode: 'clock', current: 0, max: 10, auto: false };

  return (
    <div className="scene-options compact-options">
      <div className="compact-option-title">
        <h3>Compteur de scène</h3>
        <button className={`theme-toggle mini-switch ${courant.enabled ? 'dark-on' : 'light-on'}`} onClick={() => onModifier({ ...courant, enabled: !courant.enabled })} aria-label="Activer ou désactiver le compteur de scène">
          <span>○</span>
          <span>●</span>
          <i />
        </button>
      </div>
      <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>Tape l’horloge dans l’entête pour la configurer.</p>
    </div>
  );
}

function ActionsScene({ onAjouterParticipant, onNouvelleScene }) {
  return (
    <div className="stack" style={{ marginTop: 12 }}>
      <button className="primary" onClick={onAjouterParticipant}>Ajouter un personnage</button>
      <button className="small-btn" onClick={onNouvelleScene}>Nouvelle scène</button>
    </div>
  );
}

function ActionsSauvegarde({ onExporter, onImporter, onReinitialiser }) {
  return (
    <>
      <h3>Sauvegarde</h3>
      <div className="grid2">
        <button className="primary" onClick={onExporter}>Exporter</button>
        <label className="small-btn" style={{ textAlign: 'center' }}>
          Importer
          <input type="file" accept=".json,application/json" style={{ display: 'none' }} onChange={(event) => event.target.files?.[0] && onImporter(event.target.files[0])} />
        </label>
      </div>
      <button className="danger-btn" style={{ marginTop: 8, width: '100%' }} onClick={onReinitialiser}>Réinitialiser la démo</button>
    </>
  );
}

function RestaurationScene({ points, pointActif, onChoisirPoint, onRestaurer }) {
  if (points.length === 0) return null;

  return (
    <div className="restore-row discreet">
      <label>Restaurer</label>
      <select value={pointActif} onChange={(event) => onChoisirPoint(event.target.value)}>
        {points.map((point) => <option key={point.id} value={point.id}>{point.title}</option>)}
      </select>
      <button className="small-btn" disabled={!pointActif} onClick={() => onRestaurer(pointActif)}>OK</button>
    </div>
  );
}

export function MenuPrincipal({ scenes, scene, restorePoints = [], onRestore, onClose, setSceneIndex, dark, setDark, onAddParticipant, onNewScene, onExport, onImport, onReset, onGlobalTracker }) {
  const pointsRestauration = [...restorePoints].sort((a, b) => a.round - b.round);
  const [pointRestaurationId, setPointRestaurationId] = useState(pointsRestauration.at(-1)?.id || '');

  return (
    <Fenetre title="Menu" onClose={onClose}>
      <LogoMenu sombre={dark} />
      <LigneVersionEtTheme sombre={dark} onChangerTheme={setDark} />
      <ListeScenes scenes={scenes} onChoisirScene={setSceneIndex} onFermer={onClose} />
      <OptionsCompteurScene compteur={scene?.globalTracker} onModifier={onGlobalTracker} />
      <ActionsScene onAjouterParticipant={onAddParticipant} onNouvelleScene={onNewScene} />
      <ActionsSauvegarde onExporter={onExport} onImporter={onImport} onReinitialiser={onReset} />
      <RestaurationScene points={pointsRestauration} pointActif={pointRestaurationId} onChoisirPoint={setPointRestaurationId} onRestaurer={onRestore} />
    </Fenetre>
  );
}
