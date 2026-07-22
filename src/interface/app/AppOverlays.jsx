import { useState } from 'react';
import { FenetresSuperposees } from './FenetresSuperposees.jsx';
import { initiativeTextOrderEnabled } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreAjustementInitiative } from '../dialogues/FenetreAjustementInitiative.jsx';
import { FenetreCoutInitiative } from '../dialogues/FenetreCoutInitiative.jsx';
import { FenetreDeclarationActions } from '../dialogues/FenetreDeclarationActions.jsx';
import { FenetreEtat } from '../dialogues/FenetreEtat.jsx';
import { FenetreExportCampagne } from '../dialogues/FenetreExportCampagne.jsx';
import { FenetreLancerDes } from '../dialogues/FenetreLancerDes.jsx';
import { FenetreEditionFiche } from '../fiches/FenetreEditionFiche.jsx';

function modeInitiative(scene = {}) {
  return initiativeTextOrderEnabled(scene.initiativeTextOrder) ? t('initiative.incompatible.mode.labels') : t('initiative.incompatible.mode.numeric');
}

function FenetreInitiativesIncompatibles({ participants, scene, onChanger, onSortir }) {
  const noms = participants.map((participant) => participant.name).join(', ');
  return (
    <Fenetre title={t('initiative.incompatible.title')} onClose={() => {}} header={<div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{t('initiative.incompatible.title')}</h2></div>}>
      <div className="stack">
        <p className="muted compact-help">{t('initiative.incompatible.help', { mode: modeInitiative(scene), names: noms })}</p>
        <div className="grid2">
          <button className="primary" type="button" onClick={onChanger}>{t('initiative.incompatible.change')}</button>
          <button className="danger-btn" type="button" onClick={onSortir}>{t('initiative.incompatible.leave')}</button>
        </div>
      </div>
    </Fenetre>
  );
}

function FenetreResetCadence({ onFermer, onExporter, onConfirmer }) {
  const [exportEnCours, setExportEnCours] = useState(false);
  const [message, setMessage] = useState('');

  const enregistrerCopie = async () => {
    if (exportEnCours) return;
    setExportEnCours(true);
    setMessage('');
    const result = await onExporter?.();
    setExportEnCours(false);
    if (result?.ok) {
      setMessage(t('dialogs.resetCadence.copySaved'));
      return;
    }
    if (result?.cancelled) {
      setMessage(t('export.cancelled'));
      return;
    }
    setMessage(result?.message || t('export.unconfirmed'));
  };

  return (
    <Fenetre title={t('dialogs.resetCadence.title')} onClose={onFermer}>
      <div className="stack">
        <p className="muted compact-help">{t('dialogs.resetCadence.help')}</p>
        <p className="rule-warning">{t('dialogs.resetCadence.warning')}</p>
        <div className="grid2">
          <button className="small-btn" type="button" onClick={enregistrerCopie} disabled={exportEnCours}>{exportEnCours ? t('export.saving') : t('dialogs.resetCadence.saveCopy')}</button>
          <button className="danger-btn" type="button" onClick={onConfirmer} disabled={exportEnCours}>{t('dialogs.resetCadence.confirm')}</button>
        </div>
        <button className="small-btn" type="button" onClick={onFermer} disabled={exportEnCours}>{t('common.cancel')}</button>
        {message && <p className="export-feedback">{message}</p>}
      </div>
    </Fenetre>
  );
}

export function AppOverlays({
  campaignName,
  scene,
  randomSystem,
  restorePoints,
  dark,
  themeState,
  onThemeModeChange,
  currentView,
  characters,
  templates,
  actions,
  ui,
  overlayState,
  overlayActions,
  templateState,
  templateActions,
  timerActions,
  campaignFileActions,
  initiativeActions,
  sceneActions,
  clockActions,
}) {
  const {
    addSheetOpen,
    openMenu,
    notice,
    globalSheetOpen,
    clockModalOpen,
    initiativeEntryOpen,
    initiativeEntryScopeIds,
    initiativeEntryInitialLaunch,
    initiativeAdjustOpen,
    initiativeCostOpen,
    declarationActionsOpen,
    declarationAdditionTargetId,
    exportOpen,
    resetConfirmationOpen,
    timerDoneOpen,
    pendingFileChoice,
    sceneStatusOpen,
    quickRollOpen,
    quickRollInfo,
    participantsIncompatibles,
  } = overlayState;
  const {
    participantAjustementInitiative,
    optionsInitiative,
    creneauxManuelsActifs,
    horlogesBloquantesActives,
  } = ui;
  const {
    editingTemplate,
    templateTarget,
    templateError,
    templateSwitchRequest,
  } = templateState;
  const sceneStatusEdited = sceneStatusOpen?.statusId
    ? (scene.statuses || []).find((status) => status.id === sceneStatusOpen.statusId) || null
    : null;
  const initiativeBonusEnabled = scene.initiativeBonusEnabled !== false;

  return <>
    <FenetresSuperposees campaignName={campaignName} scene={scene} randomSystem={randomSystem} restorePoints={restorePoints} dark={dark} themeState={themeState} onThemeModeChange={onThemeModeChange} characters={characters} templates={templates} actions={actions} etatInterface={{ addSheetOpen, openMenu: currentView === 'scene' && openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen: currentView === 'scene' && initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch, creneauxManuelsActifs }} commandesInterface={{ ouvrirAjoutPersonnage: overlayActions.openAddCharacter, ouvrirSaisieInitiatives: overlayActions.openInitiativeEntry, ouvrirHubCampagne: overlayActions.retourHub, ouvrirCompteurGlobal: overlayActions.ouvrirCompteurGlobal, ouvrirEtatScene: overlayActions.ouvrirEtatScene, ouvrirOptions: overlayActions.ouvrirOptions, fermerAjoutPersonnage: overlayActions.fermerAjoutPersonnage, fermerMenu: overlayActions.fermerMenu, fermerNotice: overlayActions.fermerNotice, fermerCompteurGlobal: overlayActions.fermerCompteurGlobal, fermerResolutionHorloge: overlayActions.fermerResolutionHorloge, fermerSaisieInitiatives: initiativeActions.fermerSaisieInitiatives, validerSaisieInitiatives: initiativeActions.validerSaisieInitiatives, ouvrirSauvegardeTemplate: templateActions.openTemplateSave, creerPersonnageVierge: sceneActions.createBlankCharacter, creerDepuisTemplate: sceneActions.createFromTemplate, restaurerScene: sceneActions.restoreScene, retourPreparation: sceneActions.returnToPreparation, retourPreparationAvecOptions: sceneActions.returnToPreparationWithOptions, avancerRound: sceneActions.advanceRound, reculerRound: sceneActions.decreaseRound, changerRoundAvecAutomatismes: sceneActions.changeRoundNumberWithAutomations, avancerAutomatismes: sceneActions.advanceAllAutomations, reculerAutomatismes: sceneActions.rewindAllAutomations, resetSuivisScene: sceneActions.resetSceneTrackers, effacerEtatsScene: sceneActions.clearSceneStatuses, terminerEffetsTemporaires: sceneActions.endTemporaryEffects }} compteurGlobal={{ horlogesBloquantes: horlogesBloquantesActives }} resolutionHorloge={clockActions} templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: templateActions.fermerSauvegardeTemplate, enregistrerTemplate: templateActions.saveTemplate }} />
    {initiativeAdjustOpen && participantAjustementInitiative && <FenetreAjustementInitiative participant={participantAjustementInitiative} valeurInitiale={participantAjustementInitiative.initiative} initiativeTextOrder={scene.initiativeTextOrder} onFermer={initiativeActions.fermerAjustementInitiative} onValider={initiativeActions.validerAjustementInitiative} onPasser={initiativeActions.passerAjustementInitiative} />}
    {initiativeCostOpen && participantAjustementInitiative && <FenetreCoutInitiative participant={participantAjustementInitiative} quickCosts={scene.initiativeCostQuickCosts} threshold={scene.initiativeCostThreshold} limitToCurrent={scene.initiativeCostLimitToCurrent} onFermer={initiativeActions.fermerCoutInitiative} onValider={initiativeActions.validerCoutInitiative} onTerminer={initiativeActions.terminerRoundPersonnage} />}
    {declarationActionsOpen && !declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} onFermer={initiativeActions.fermerDeclarationActions} onValider={initiativeActions.validerActionsDeclarees} />}
    {declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} participantIds={[declarationAdditionTargetId]} lancerResolution={false} onFermer={initiativeActions.fermerDeclarationAjout} onValider={initiativeActions.validerDeclarationAjout} />}
    {participantsIncompatibles.length > 0 && <FenetreInitiativesIncompatibles scene={scene} participants={participantsIncompatibles} onChanger={initiativeActions.changerInitiativesIncompatibles} onSortir={initiativeActions.sortirInitiativesIncompatibles} />}
    {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={campaignFileActions.fermerExport} onExporter={campaignFileActions.exportCampaign} />}
    {resetConfirmationOpen && <FenetreResetCadence onFermer={campaignFileActions.fermerResetCadence} onExporter={campaignFileActions.exportBeforeReset} onConfirmer={campaignFileActions.confirmerResetCadence} />}
    {timerDoneOpen && <Fenetre title={t('timerDone.title')} onClose={timerActions.fermerTimerDone}><div className="stack"><p className="muted compact-help">{t('timerDone.help')}</p><div className="grid2"><button className="primary" onClick={timerActions.restartTimer}>{t('timerDone.restart')}</button><button className="small-btn" onClick={timerActions.resetTimer}>{t('timerDone.reset')}</button></div><button className="small-btn" onClick={timerActions.openTimerMenu}>{t('timerDone.openMenu')}</button></div></Fenetre>}
    {pendingFileChoice && <Fenetre title={t('fileChoice.title')} onClose={actions.dismissLoadedCampaignChoice}><div className="stack"><p className="muted compact-help">{t('fileChoice.help', { fileName: pendingFileChoice.fileName })}</p><div className="grid2"><button className="primary" onClick={campaignFileActions.workOnLoadedFile} disabled={!pendingFileChoice.canUseOriginal}>{t('fileChoice.workOnFile')}</button><button className="small-btn" onClick={campaignFileActions.workOnCampaignCopy}>{t('fileChoice.createCopy')}</button></div>{!pendingFileChoice.canUseOriginal && <p className="rule-warning">{t('fileChoice.copySafer')}</p>}</div></Fenetre>}
    {currentView === 'hub' && editingTemplate && <FenetreEditionFiche participant={editingTemplate.participant} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={creneauxManuelsActifs} initiativeBonusEnabled={initiativeBonusEnabled} categoryOrder={scene.categoryOrder} tiebreakerVisible={scene.tiebreakerVisible !== false} tiebreakerLabel={scene.tiebreakerLabel} trackerTemplates={templates.trackerTemplates} title={t('templates.edit.title', { name: editingTemplate.name })} templateCategory={editingTemplate.category} templateCategories={templates.categories} saveTemplateVisible={false} deleteLabel={t('templates.edit.delete')} className="template-edit-sheet" templateSwitchRequest={templateSwitchRequest} onAnnulerChangementTemplate={templateActions.annulerChangementTemplate} onAbandonnerChangementTemplate={templateActions.abandonnerChangementDepuisTemplatePersonnage} onValiderChangementTemplate={templateActions.validerChangementDepuisTemplatePersonnage} onClose={templateActions.fermerEditionTemplatePersonnage} onSave={templateActions.saveEditedTemplate} onDelete={templateActions.deleteEditedTemplate} />}
    {sceneStatusOpen && <FenetreEtat key={sceneStatusEdited?.id || 'new-scene-status'} participant={{ name: scene.title }} initialStatus={sceneStatusEdited} defaultAdvanceOn="round" afficherChoixEvolution={false} afficherInactif={false} statusTemplates={templates.sceneStatusTemplates} tintLabel={t('status.tintScene')} onSaveTemplate={templates.saveSceneStatusAsTemplate} onFermer={overlayActions.fermerEtatScene} onValider={overlayActions.validerEtatScene} />}
    {currentView === 'scene' && quickRollOpen && <FenetreLancerDes randomSystem={randomSystem} quickRollInfo={quickRollInfo} statisticsContext={{ id: scene.id || scene.title || 'scene', label: scene.title || 'Scène' }} onFermer={overlayActions.fermerLanceurDes} />}
  </>;
}
