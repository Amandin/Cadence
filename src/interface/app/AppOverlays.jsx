import { FenetresSuperposees } from './FenetresSuperposees.jsx';
import { initiativeTextOrderEnabled } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreAjustementInitiative } from '../dialogues/FenetreAjustementInitiative.jsx';
import { FenetreCoutInitiative } from '../dialogues/FenetreCoutInitiative.jsx';
import { FenetreDeclarationActions } from '../dialogues/FenetreDeclarationActions.jsx';
import { FenetreEtat } from '../dialogues/FenetreEtat.jsx';
import { FenetreExportCampagne } from '../dialogues/FenetreExportCampagne.jsx';
import { FenetreEditionFiche } from '../fiches/FenetreEditionFiche.jsx';

function modeInitiative(scene = {}) {
  return initiativeTextOrderEnabled(scene.initiativeTextOrder) ? 'labels' : 'valeurs numériques';
}

function FenetreInitiativesIncompatibles({ participants, scene, onChanger, onSortir }) {
  const noms = participants.map((participant) => participant.name).join(', ');
  return (
    <Fenetre title="Initiatives à corriger" onClose={() => {}} header={<div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>Initiatives à corriger</h2></div>}>
      <div className="stack">
        <p className="muted compact-help">Cette scène utilise maintenant les {modeInitiative(scene)}. Ces initiatives ne correspondent plus : {noms}.</p>
        <div className="grid2">
          <button className="primary" type="button" onClick={onChanger}>Changer les initiatives</button>
          <button className="danger-btn" type="button" onClick={onSortir}>Sortir de l’initiative</button>
        </div>
      </div>
    </Fenetre>
  );
}

export function AppOverlays({
  campaignName,
  scene,
  restorePoints,
  dark,
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
    timerDoneOpen,
    pendingFileChoice,
    sceneStatusOpen,
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

  return <>
    <FenetresSuperposees campaignName={campaignName} scene={scene} restorePoints={restorePoints} dark={dark} characters={characters} templates={templates} actions={actions} etatInterface={{ addSheetOpen, openMenu: currentView === 'scene' && openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen: currentView === 'scene' && initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch, creneauxManuelsActifs }} commandesInterface={{ ouvrirAjoutPersonnage: overlayActions.openAddCharacter, ouvrirSaisieInitiatives: overlayActions.openInitiativeEntry, ouvrirHubCampagne: overlayActions.retourHub, ouvrirCompteurGlobal: overlayActions.ouvrirCompteurGlobal, ouvrirEtatScene: overlayActions.ouvrirEtatScene, fermerAjoutPersonnage: overlayActions.fermerAjoutPersonnage, fermerMenu: overlayActions.fermerMenu, fermerNotice: overlayActions.fermerNotice, fermerCompteurGlobal: overlayActions.fermerCompteurGlobal, fermerResolutionHorloge: overlayActions.fermerResolutionHorloge, fermerSaisieInitiatives: initiativeActions.fermerSaisieInitiatives, validerSaisieInitiatives: initiativeActions.validerSaisieInitiatives, ouvrirSauvegardeTemplate: templateActions.openTemplateSave, creerPersonnageVierge: sceneActions.createBlankCharacter, creerDepuisTemplate: sceneActions.createFromTemplate, restaurerScene: sceneActions.restoreScene, retourPreparation: sceneActions.returnToPreparation, avancerRound: sceneActions.advanceRound, reculerRound: sceneActions.decreaseRound, avancerAutomatismes: sceneActions.advanceAllAutomations, reculerAutomatismes: sceneActions.rewindAllAutomations, resetSuivisScene: sceneActions.resetSceneTrackers, effacerEtatsScene: sceneActions.clearSceneStatuses }} compteurGlobal={{ horlogesBloquantes: horlogesBloquantesActives }} resolutionHorloge={clockActions} templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: templateActions.fermerSauvegardeTemplate, enregistrerTemplate: templateActions.saveTemplate }} />
    {initiativeAdjustOpen && participantAjustementInitiative && <FenetreAjustementInitiative participant={participantAjustementInitiative} valeurInitiale={participantAjustementInitiative.initiative} initiativeTextOrder={scene.initiativeTextOrder} onFermer={initiativeActions.fermerAjustementInitiative} onValider={initiativeActions.validerAjustementInitiative} onPasser={initiativeActions.passerAjustementInitiative} />}
    {initiativeCostOpen && participantAjustementInitiative && <FenetreCoutInitiative participant={participantAjustementInitiative} quickCosts={scene.initiativeCostQuickCosts} threshold={scene.initiativeCostThreshold} limitToCurrent={scene.initiativeCostLimitToCurrent} onFermer={initiativeActions.fermerCoutInitiative} onValider={initiativeActions.validerCoutInitiative} onTerminer={initiativeActions.terminerRoundPersonnage} />}
    {declarationActionsOpen && !declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} onFermer={initiativeActions.fermerDeclarationActions} onValider={initiativeActions.validerActionsDeclarees} />}
    {declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} participantIds={[declarationAdditionTargetId]} lancerResolution={false} onFermer={initiativeActions.fermerDeclarationAjout} onValider={initiativeActions.validerDeclarationAjout} />}
    {participantsIncompatibles.length > 0 && <FenetreInitiativesIncompatibles scene={scene} participants={participantsIncompatibles} onChanger={initiativeActions.changerInitiativesIncompatibles} onSortir={initiativeActions.sortirInitiativesIncompatibles} />}
    {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={campaignFileActions.fermerExport} onExporter={campaignFileActions.exportCampaign} />}
    {timerDoneOpen && <Fenetre title={t('timerDone.title')} onClose={timerActions.fermerTimerDone}><div className="stack"><p className="muted compact-help">{t('timerDone.help')}</p><div className="grid2"><button className="primary" onClick={timerActions.restartTimer}>{t('timerDone.restart')}</button><button className="small-btn" onClick={timerActions.resetTimer}>{t('timerDone.reset')}</button></div><button className="small-btn" onClick={timerActions.openTimerMenu}>{t('timerDone.openMenu')}</button></div></Fenetre>}
    {pendingFileChoice && <Fenetre title={t('fileChoice.title')} onClose={actions.dismissLoadedCampaignChoice}><div className="stack"><p className="muted compact-help">{t('fileChoice.help', { fileName: pendingFileChoice.fileName })}</p><div className="grid2"><button className="primary" onClick={campaignFileActions.workOnLoadedFile} disabled={!pendingFileChoice.canUseOriginal}>{t('fileChoice.workOnFile')}</button><button className="small-btn" onClick={campaignFileActions.workOnCampaignCopy}>{t('fileChoice.createCopy')}</button></div>{!pendingFileChoice.canUseOriginal && <p className="rule-warning">{t('fileChoice.copySafer')}</p>}</div></Fenetre>}
    {currentView === 'hub' && editingTemplate && <FenetreEditionFiche participant={editingTemplate.participant} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={creneauxManuelsActifs} categoryOrder={scene.categoryOrder} tiebreakerVisible={scene.tiebreakerVisible !== false} tiebreakerLabel={scene.tiebreakerLabel} trackerTemplates={templates.trackerTemplates} title={`Modifier le template · ${editingTemplate.name}`} templateCategory={editingTemplate.category} templateCategories={templates.categories} saveTemplateVisible={false} deleteLabel="Supprimer le template" className="template-edit-sheet" templateSwitchRequest={templateSwitchRequest} onAnnulerChangementTemplate={templateActions.annulerChangementTemplate} onAbandonnerChangementTemplate={templateActions.abandonnerChangementDepuisTemplatePersonnage} onValiderChangementTemplate={templateActions.validerChangementDepuisTemplatePersonnage} onClose={templateActions.fermerEditionTemplatePersonnage} onSave={templateActions.saveEditedTemplate} onDelete={templateActions.deleteEditedTemplate} />}
    {sceneStatusOpen && <FenetreEtat participant={{ name: scene.title }} defaultAdvanceOn="round" afficherChoixEvolution={false} afficherInactif={false} statusTemplates={templates.sceneStatusTemplates} onFermer={overlayActions.fermerEtatScene} onValider={overlayActions.validerEtatScene} />}
  </>;
}
