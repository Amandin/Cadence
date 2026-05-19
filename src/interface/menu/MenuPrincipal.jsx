import { useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function MenuEntete({ sombre, onChangerTheme, onClose }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';

  return (
    <div className="menu-brand menu-brand-header">
      <img src={logo} alt="Cadence" />
      <div>
        <strong>Menu</strong>
        <span className="muted">Cadence · v{APP_VERSION}</span>
      </div>
      <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre">
        <span>☀</span>
        <span>☾</span>
        <i />
      </button>
      <button className="icon-btn menu-close-btn" onClick={onClose} aria-label="Fermer le menu">×</button>
    </div>
  );
}

function tempsEcoule(compteur) {
  const base = Math.max(0, Number(compteur.elapsedMs || 0));
  if (!compteur.running || !compteur.startedAt) return base;
  return base + Math.max(0, Date.now() - Number(compteur.startedAt));
}

function formaterTemps(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function OptionsCompteurScene({ scene, compteur, onModifier, onChanger }) {
  const courant = compteur || { enabled: false, name: 'Menace', mode: 'clock', current: 0, max: 10, auto: false, running: false, startedAt: null, elapsedMs: 0 };
  const tempsReel = ['stopwatch', 'timer'].includes(courant.mode);
  const enPreparation = scene?.round < 0;
  const temps = tempsEcoule(courant);
  const dureeSecondes = Math.max(1, Number(courant.max || 60));
  const affichageTemps = courant.mode === 'timer' ? formaterTemps(Math.max(0, dureeSecondes * 1000 - temps)) : formaterTemps(temps);
  const modifier = (patch) => onModifier({ ...courant, ...patch });
  const demarrer = () => {
    if (enPreparation) return;
    modifier({ running: true, startedAt: Date.now() });
  };
  const pause = () => modifier({ running: false, startedAt: null, elapsedMs: temps });
  const resetTemps = () => modifier({ running: false, startedAt: null, elapsedMs: 0 });

  return (
    <div className="scene-options compact-options">
      <div className="compact-option-title">
        <h3>Compteur de scène</h3>
        <button className={`scene-clock-toggle ${courant.enabled ? 'active' : ''}`} onClick={() => modifier({ enabled: !courant.enabled })} aria-label="Activer ou désactiver le compteur de scène" title="Compteur de scène">
          <span>{courant.enabled ? '◷' : '○'}</span>
        </button>
      </div>
      <div className="menu-counter-config">
        <label className="field">Nom<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder="Menace" /></label>
        <div className="grid2">
          <label className="field">Type<select value={courant.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronomètre</option><option value="timer">Minuteur</option></select></label>
          {!tempsReel && <label className="field">Valeur<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {courant.mode === 'timer' && <label className="field">Minutes<input type="number" inputMode="numeric" min="1" value={Math.max(1, Math.round(dureeSecondes / 60))} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {!tempsReel && <label className="row counter-auto-row"><input type="checkbox" checked={!!courant.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avance à chaque nouveau round</label>}
        {!tempsReel && <div className="grid2"><button className="small-btn" onClick={() => onChanger(-1)}>−1</button><button className="small-btn" onClick={() => onChanger(1)}>+1</button></div>}
        {tempsReel && <div className="timer-control-panel menu-timer-panel">
          <strong>{affichageTemps}</strong>
          {enPreparation && <p className="muted compact-help">Le temps démarrera avec Commencer.</p>}
          <div className="grid2">
            <button className="primary" onClick={courant.running ? pause : demarrer} disabled={enPreparation && !courant.running}>{courant.running ? 'Pause' : 'Démarrer'}</button>
            <button className="small-btn" onClick={resetTemps}>Reset</button>
          </div>
        </div>}
      </div>
    </div>
  );
}

function ActionsScene({ onAjouterParticipant, onSaisirInitiatives }) {
  return (
    <div className="scene-options compact-options menu-action-section">
      <h3>Scène</h3>
      <div className="menu-action-grid">
        <button className="primary" onClick={onAjouterParticipant}>Ajouter</button>
        <button className="small-btn" onClick={onSaisirInitiatives}>Initiatives</button>
      </div>
    </div>
  );
}

function OptionsDerouleScene({ scene, points, pointActif, onChoisirPoint, onRestaurer, onRetourPreparation, onAvancerRound, onResetSuivis, onEffacerEtats }) {
  if (!scene) return null;

  return (
    <div className="scene-options compact-options">
      <div className="compact-option-title">
        <h3>Déroulé</h3>
        {scene.round >= 0 && <button className="small-btn" onClick={onRetourPreparation}>Préparation</button>}
      </div>
      <p className="muted" style={{ marginTop: 4, fontSize: 12 }}>Replace la scène avant le lancement de l’initiative.</p>
      <div className="menu-action-grid scene-management-grid">
        <button className="small-btn" onClick={onAvancerRound}>Round +1</button>
        <button className="small-btn" onClick={onResetSuivis}>Reset suivis</button>
        <button className="small-btn" onClick={onEffacerEtats}>Effacer états</button>
      </div>
      {points.length > 0 && <RestaurationScene points={points} pointActif={pointActif} onChoisirPoint={onChoisirPoint} onRestaurer={onRestaurer} />}
    </div>
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

export function MenuPrincipal({ scene, restorePoints = [], onRestore, onReturnToPreparation, onAdvanceRound, onResetTrackers, onClearStatuses, onClose, dark, setDark, onAddParticipant, onOpenInitiativeRoller, onOpenCampaignHub, onGlobalTracker, onStepGlobalTracker }) {
  const pointsRestauration = [...restorePoints].sort((a, b) => a.round - b.round);
  const [pointRestaurationId, setPointRestaurationId] = useState(pointsRestauration.at(-1)?.id || '');

  return (
    <Fenetre title="Menu" onClose={onClose} header={<MenuEntete sombre={dark} onChangerTheme={setDark} onClose={onClose} />}>
      <button className="primary hub-menu-main-action" onClick={onOpenCampaignHub}>Hub de campagne</button>
      <ActionsScene onAjouterParticipant={onAddParticipant} onSaisirInitiatives={onOpenInitiativeRoller} />
      <OptionsDerouleScene scene={scene} points={pointsRestauration} pointActif={pointRestaurationId} onChoisirPoint={setPointRestaurationId} onRestaurer={onRestore} onRetourPreparation={onReturnToPreparation} onAvancerRound={onAdvanceRound} onResetSuivis={onResetTrackers} onEffacerEtats={onClearStatuses} />
      <OptionsCompteurScene scene={scene} compteur={scene?.globalTracker} onModifier={onGlobalTracker} onChanger={onStepGlobalTracker} />
    </Fenetre>
  );
}
