import { useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { activeGlobalTrackerThresholds, globalTrackerDisplayValue, globalTrackerTimerState } from '../../domain/globalTracker.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';
import { EtiquetteEtat, Fenetre } from '../commun/ComposantsCommuns.jsx';
import { EditeurSeuilsCompteurScene } from '../suivis/CompteurGlobal.jsx';

function MenuEntete({ sombre, onChangerTheme, onClose }) {
  const logo = getCadenceLogo(sombre);

  return (
    <div className="menu-brand menu-brand-header">
      <img src={logo} alt="Cadence" />
      <div>
        <strong className="brand-title">Cadence</strong>
        <span className="muted brand-meta">{t('menu.brandMeta', { version: APP_VERSION })}</span>
      </div>
      <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label={t('menu.toggleTheme')}>
        <span>{uiGlyphs.themeLight}</span>
        <span>{uiGlyphs.themeDark}</span>
        <i />
      </button>
      <button className="icon-btn menu-close-btn" onClick={onClose} aria-label={t('common.close')}>{uiGlyphs.close}</button>
    </div>
  );
}

function tempsEcoule(compteur) {
  const base = Math.max(0, Number(compteur.elapsedMs || 0));
  if (!compteur.running || !compteur.startedAt) return base;
  return base + Math.max(0, Date.now() - Number(compteur.startedAt));
}

function formaterSecondes(secondes) {
  const total = Math.max(0, Math.floor(secondes));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function formaterTemps(ms) {
  return formaterSecondes(Math.max(0, Math.floor(ms / 1000)));
}

function resumeIndicateurScene(compteur) {
  if (!compteur?.enabled) return '';
  const nom = compteur.name || (compteur.mode === 'timer' ? t('menu.indicator.defaultTimer') : compteur.mode === 'stopwatch' ? t('menu.indicator.defaultStopwatch') : t('menu.indicator.defaultScene'));

  if (compteur.mode === 'timer') {
    const etat = globalTrackerTimerState(compteur);
    const valeur = compteur.limitMode === 'overflow' && etat.complete ? `+${formaterSecondes(etat.overrunSeconds)}` : formaterSecondes(etat.remainingSeconds);
    return t('menu.indicator.summary.timer', { name: nom, value: valeur });
  }

  if (compteur.mode === 'stopwatch') {
    return t('menu.indicator.summary.stopwatch', { name: nom, value: formaterSecondes(globalTrackerDisplayValue(compteur)) });
  }

  const max = Math.max(1, Number(compteur.max || 1));
  const valeur = Math.max(0, Number(compteur.current || 0));
  const seuil = activeGlobalTrackerThresholds(compteur)[0]?.label || '';

  if (compteur.mode === 'counter') {
    return t('menu.indicator.summary.counter', { name: nom, value: valeur, threshold: seuil ? `, seuil : ${seuil}` : '' });
  }

  if (compteur.limitMode === 'loop') {
    const boucles = Math.max(0, Number(compteur.loops || 0));
    return t('menu.indicator.summary.loop', { name: nom, loops: boucles, suffix: boucles > 1 ? 's' : '', threshold: seuil ? `, seuil : ${seuil}` : '' });
  }

  if (max === 1 && seuil) {
    return t('menu.indicator.summary.thresholdOnly', { name: nom, threshold: `, seuil : ${seuil}` });
  }

  return t('menu.indicator.summary.ratio', { name: nom, value: valeur, max, threshold: seuil ? `, seuil : ${seuil}` : '' });
}

function ActionsScene({ onAjouterParticipant, onSaisirInitiatives }) {
  return (
    <div className="scene-options compact-options menu-action-section">
      <div className={`menu-action-grid ${onSaisirInitiatives ? '' : 'single-action'}`}>
        <button className="primary" onClick={onAjouterParticipant}>{t('menu.addCharacter')}</button>
        {onSaisirInitiatives && <button className="small-btn" onClick={onSaisirInitiatives}>{t('menu.enterInitiatives')}</button>}
      </div>
    </div>
  );
}

function ElementsSceneMenu({ scene, onIndicateurScene, onModifierIndicateurScene, onAjouterEtatScene, onModifierEtatScene, onRetirerEtatScene, onEffacerEtats }) {
  const compteur = scene?.globalTracker || {};
  const etats = scene?.statuses || [];
  const indicateurActif = !!compteur.enabled;
  const hasDetails = indicateurActif || etats.length > 0;
  const resume = resumeIndicateurScene(compteur);

  return (
    <div className="scene-options compact-options menu-scene-elements">
      <div className="compact-option-title">
        <h3>{t('menu.sceneElements.title')}</h3>
      </div>
      <div className="menu-action-grid">
        <button className="small-btn" onClick={onModifierIndicateurScene}>{indicateurActif ? t('menu.sceneElements.editIndicator') : t('menu.sceneElements.activateIndicator')}</button>
        <button className="small-btn" onClick={onAjouterEtatScene}>{t('menu.sceneElements.addStatus')}</button>
      </div>
      {hasDetails && (
        <div className="stack menu-scene-elements-details">
          {indicateurActif && (
            <div className="menu-scene-indicator-row">
              <span>{resume}</span>
              <label className={`global-switch ${indicateurActif ? 'active' : ''}`}>
                <span>{indicateurActif ? t('common.on') : t('common.off')}</span>
                <input type="checkbox" checked={indicateurActif} onChange={(event) => onIndicateurScene({ ...compteur, enabled: event.target.checked })} aria-label={t('menu.sceneElements.toggleIndicator')} />
              </label>
            </div>
          )}
          {etats.length > 0 && (
            <>
              <div className="statuses status-control-row menu-status-list">
                {etats.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onModifier={() => onModifierEtatScene?.(etat.id)} onRetirer={() => onRetirerEtatScene?.(etat.id)} />)}
              </div>
              <button className="small-btn subtle-danger menu-clear-statuses" onClick={onEffacerEtats}>{t('menu.sceneElements.clearStatuses')}</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function RestaurationScene({ points, pointActif, onChoisirPoint, onRestaurer }) {
  if (points.length === 0) return null;

  return (
    <div className="restore-row discreet">
      <label>{t('menu.restore.title')}</label>
      <select value={pointActif} onChange={(event) => onChoisirPoint(event.target.value)}>
        {points.map((point) => <option key={point.id} value={point.id}>{point.title}</option>)}
      </select>
      <button className="small-btn" disabled={!pointActif} onClick={() => onRestaurer(pointActif)}>{t('common.ok')}</button>
    </div>
  );
}

function FenetreEditionIndicateurScene({ scene, compteur, onModifier, onChanger, onFermer }) {
  const courant = compteur || { enabled: false, name: 'Menace', mode: 'clock', current: 0, max: 10, auto: false, trigger: 'manual', thresholds: [], running: false, startedAt: null, elapsedMs: 0 };
  const tempsReel = ['stopwatch', 'timer'].includes(courant.mode);
  const enPreparation = scene?.round < 0;
  const avanceAuRound = (courant.trigger || (courant.auto ? 'round' : 'manual')) === 'round';
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
    <Fenetre title={t('dialogs.sceneIndicator.title')} onClose={onFermer}>
      <div className="stack menu-counter-config">
        <label className="field">{t('dialogs.sceneIndicator.name')}<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder={t('dialogs.sceneIndicator.placeholder')} /></label>
        <div className="grid2">
          <label className="field">{t('dialogs.sceneIndicator.type')}<select value={courant.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, enabled: true, running: false, startedAt: null })}><option value="clock">{t('dialogs.sceneIndicator.clock')}</option><option value="counter">{t('dialogs.sceneIndicator.counter')}</option><option value="stopwatch">{t('dialogs.sceneIndicator.stopwatch')}</option><option value="timer">{t('dialogs.sceneIndicator.timer')}</option></select></label>
          {!tempsReel && <label className="field">{t('dialogs.sceneIndicator.value')}<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value), enabled: true })} /></label>}
          {courant.mode === 'timer' && <label className="field">{t('dialogs.sceneIndicator.minutes')}<input type="number" inputMode="numeric" min="1" value={Math.max(1, Math.round(dureeSecondes / 60))} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60, enabled: true })} /></label>}
        </div>
        {!tempsReel && <label className="field">{t('dialogs.sceneIndicator.maximum')}<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1), enabled: true })} /></label>}
        {!tempsReel && <label className={`reset-switch counter-auto-row ${avanceAuRound ? 'active' : ''}`}>
          <span>{t('dialogs.sceneIndicator.autoRound')}</span>
          <input type="checkbox" checked={avanceAuRound} onChange={(event) => modifier({ auto: event.target.checked, trigger: event.target.checked ? 'round' : 'manual', enabled: true })} />
        </label>}
        {!tempsReel && <div className="grid2"><button className="small-btn" onClick={() => onChanger(-1)}>−1</button><button className="small-btn" onClick={() => onChanger(1)}>+1</button></div>}
        {tempsReel && <div className="timer-control-panel menu-timer-panel">
          <strong>{affichageTemps}</strong>
          {enPreparation && <p className="muted compact-help">{t('dialogs.sceneIndicator.prepHelp')}</p>}
          <div className="grid2">
            <button className="primary" onClick={courant.running ? pause : demarrer} disabled={enPreparation && !courant.running}>{courant.running ? t('dialogs.sceneIndicator.pause') : t('dialogs.sceneIndicator.start')}</button>
            <button className="small-btn" onClick={resetTemps}>{t('dialogs.sceneIndicator.reset')}</button>
          </div>
        </div>}
        <details className="advanced-options" open>
          <summary>{t('trackers.global.thresholds.summary')}</summary>
          <EditeurSeuilsCompteurScene compteur={courant} onModifier={(patch) => modifier({ ...patch, enabled: true })} />
        </details>
      </div>
    </Fenetre>
  );
}

function ajusterHauteurTextarea(element) {
  if (!element) return;
  element.style.height = 'auto';
  element.style.height = `${Math.max(92, element.scrollHeight)}px`;
}

function NotesSceneMenuOuvert({ scene, onModifierNotes }) {
  const textareaRef = useRef(null);
  useEffect(() => ajusterHauteurTextarea(textareaRef.current), [scene?.notes]);

  return (
    <div className="scene-options compact-options menu-scene-notes">
      <div className="compact-option-title">
        <h3>{t('menu.sceneNotes.title')}</h3>
      </div>
      <label className="field"><textarea ref={textareaRef} rows={4} value={scene?.notes || ''} onInput={(event) => ajusterHauteurTextarea(event.currentTarget)} onChange={(event) => onModifierNotes?.(event.target.value)} placeholder={t('menu.sceneNotes.placeholder')} /></label>
    </div>
  );
}

function OptionsDerouleSceneMenu({ scene, points, pointActif, onChoisirPoint, onRestaurer, onDemanderRetourPreparation, onAvancerRound, onReculerRound, onChangerRoundAvecAutomatismes, onAvancerAutomatismes, onReculerAutomatismes, onResetSuivis }) {
  const [roundAvecAutomatismes, setRoundAvecAutomatismes] = useState(false);
  if (!scene) return null;
  const enPreparation = scene.round < 0;
  const pointsRestauration = points.filter((point) => point?.kind !== 'pre-initiative' && Number(point?.round) >= 0);
  const pointActifFiltre = pointsRestauration.some((point) => point.id === pointActif) ? pointActif : pointsRestauration.at(-1)?.id || '';
  const changerRound = (delta) => {
    if (onChangerRoundAvecAutomatismes) {
      onChangerRoundAvecAutomatismes(delta, { applyAutomations: roundAvecAutomatismes });
      return;
    }
    if (delta > 0) onAvancerRound?.();
    else onReculerRound?.();
  };

  return (
    <details className="scene-options compact-options menu-flow-section">
      <summary>{t('menu.flow.title')}</summary>
      <div className="menu-action-grid scene-management-grid">
        {!enPreparation && <button className="primary prep-return-menu-btn" onClick={onDemanderRetourPreparation}>{t('menu.flow.returnPreparation')}</button>}
        <button className="small-btn" onClick={onResetSuivis}>{t('menu.flow.resetTrackers')}</button>
        {!enPreparation && <button className="small-btn" onClick={() => changerRound(-1)} disabled={scene.round <= 0}>{t('menu.flow.decreaseRound')}</button>}
        {!enPreparation && <button className="small-btn" onClick={() => changerRound(1)}>{t('menu.flow.advanceRound')}</button>}
        <button className="small-btn" onClick={onReculerAutomatismes}>{t('menu.flow.rewindAutomations')}</button>
        <button className="small-btn" onClick={onAvancerAutomatismes}>{t('menu.flow.advanceAutomations')}</button>
      </div>
      {!enPreparation && <label className={`reset-switch menu-round-automation-toggle ${roundAvecAutomatismes ? 'active' : ''}`}>
        <span>{t('menu.flow.roundAutomations')}</span>
        <input type="checkbox" checked={roundAvecAutomatismes} onChange={(event) => setRoundAvecAutomatismes(event.target.checked)} />
      </label>}
      {!enPreparation && pointsRestauration.length > 0 && <RestaurationScene points={pointsRestauration} pointActif={pointActifFiltre} onChoisirPoint={onChoisirPoint} onRestaurer={onRestaurer} />}
      <p className="muted compact-help">{t('menu.flow.help')}</p>
    </details>
  );
}

function FenetreRetourPreparation({ onFermer, onValider }) {
  const [resetTrackers, setResetTrackers] = useState(false);
  const [endTemporaryEffects, setEndTemporaryEffects] = useState(false);

  return (
    <Fenetre title={t('dialogs.returnPreparation.title')} onClose={onFermer}>
      <div className="stack return-preparation-options">
        <p className="muted compact-help">{t('dialogs.returnPreparation.help1')}</p>
        <label className={`reset-switch ${resetTrackers ? 'active' : ''}`}>
          <span>{t('dialogs.returnPreparation.resetTrackers')}</span>
          <input type="checkbox" checked={resetTrackers} onChange={(event) => setResetTrackers(event.target.checked)} />
        </label>
        <label className={`reset-switch ${endTemporaryEffects ? 'active' : ''}`}>
          <span>{t('dialogs.returnPreparation.endTemporaryEffects')}</span>
          <input type="checkbox" checked={endTemporaryEffects} onChange={(event) => setEndTemporaryEffects(event.target.checked)} />
        </label>
        <p className="muted compact-help">{t('dialogs.returnPreparation.help2')}</p>
        <div className="grid2">
          <button className="primary" onClick={() => onValider({ resetTrackers, endTemporaryEffects })}>{t('dialogs.returnPreparation.confirm')}</button>
          <button className="small-btn" onClick={onFermer}>{t('dialogs.returnPreparation.cancel')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function MenuPrincipal({ scene, restorePoints = [], onRestore, onReturnToPreparation, onReturnToPreparationWithOptions, onAdvanceRound, onDecreaseRound, onChangeRoundWithAutomations, onAdvanceAutomations, onRewindAutomations, onResetTrackers, onClearStatuses, onEndTemporaryEffects, onClose, dark, setDark, onAddParticipant, onOpenInitiativeRoller, onOpenCampaignHub, onGlobalTracker, onStepGlobalTracker, onAddSceneStatus, onEditSceneStatus, onRemoveSceneStatus, onUpdateSceneNotes }) {
  const pointsRestauration = [...restorePoints].sort((a, b) => a.round - b.round);
  const [pointRestaurationId, setPointRestaurationId] = useState(pointsRestauration.at(-1)?.id || '');
  const [editionIndicateurOuverte, setEditionIndicateurOuverte] = useState(false);
  const [retourPreparationOuvert, setRetourPreparationOuvert] = useState(false);

  const validerRetourPreparation = (options) => {
    if (onReturnToPreparationWithOptions) {
      onReturnToPreparationWithOptions(options);
      return;
    }
    if (options.resetTrackers) onResetTrackers?.();
    if (options.endTemporaryEffects) onEndTemporaryEffects?.();
    onReturnToPreparation?.();
  };

  return (
    <Fenetre title={t('menu.title')} onClose={onClose} header={<MenuEntete sombre={dark} onChangerTheme={setDark} onClose={onClose} />} className={`main-menu ${dark ? 'dark menu-dark' : ''}`}>
      <div className="main-menu-layout">
        <div className="main-menu-primary">
          <button className="primary hub-menu-main-action" onClick={onOpenCampaignHub}>{t('menu.returnHub')}</button>
          <ActionsScene onAjouterParticipant={onAddParticipant} onSaisirInitiatives={onOpenInitiativeRoller} />
          <ElementsSceneMenu scene={scene} onIndicateurScene={onGlobalTracker} onModifierIndicateurScene={() => setEditionIndicateurOuverte(true)} onAjouterEtatScene={onAddSceneStatus} onModifierEtatScene={onEditSceneStatus} onRetirerEtatScene={onRemoveSceneStatus} onEffacerEtats={onClearStatuses} />
          <OptionsDerouleSceneMenu scene={scene} points={pointsRestauration} pointActif={pointRestaurationId} onChoisirPoint={setPointRestaurationId} onRestaurer={onRestore} onDemanderRetourPreparation={() => setRetourPreparationOuvert(true)} onAvancerRound={onAdvanceRound} onReculerRound={onDecreaseRound} onChangerRoundAvecAutomatismes={onChangeRoundWithAutomations} onAvancerAutomatismes={onAdvanceAutomations} onReculerAutomatismes={onRewindAutomations} onResetSuivis={onResetTrackers} />
        </div>
        <div className="main-menu-secondary">
          <NotesSceneMenuOuvert scene={scene} onModifierNotes={onUpdateSceneNotes} />
        </div>
      </div>
      {editionIndicateurOuverte && <FenetreEditionIndicateurScene scene={scene} compteur={scene?.globalTracker} onModifier={onGlobalTracker} onChanger={onStepGlobalTracker} onFermer={() => setEditionIndicateurOuverte(false)} />}
      {retourPreparationOuvert && <FenetreRetourPreparation onFermer={() => setRetourPreparationOuvert(false)} onValider={validerRetourPreparation} />}
    </Fenetre>
  );
}
