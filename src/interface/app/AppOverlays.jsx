import { FenetresSuperposees } from './FenetresSuperposees.jsx';
import { initiativeTextOrderEnabled } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreAjustementInitiative } from '../dialogues/FenetreAjustementInitiative.jsx';
import { FenetreCoutInitiative } from '../dialogues/FenetreCoutInitiative.jsx';
import { FenetreDeclarationActions } from '../dialogues/FenetreDeclarationActions.jsx';
import { FenetreEtat } from '../dialogues/FenetreEtat.jsx';
import { FenetreExportCampagne } from '../dialogues/FenetreExportCampagne.jsx';
import { FenetreEditionFiche } from '../fiches/FenetreEditionFiche.jsx';

function modeInitiative(scene = {}) {
  return initiativeTextOrderEnabled(scene.initiativeTextOrder) ? 'labels' : 'valeurs numeriques';
}

function FenetreInitiativesIncompatibles({ participants, scene, onChanger, onSortir }) {
  const noms = participants.map((participant) => participant.name).join(', ');
  return (
    <Fenetre title="Initiatives a corriger" onClose={() => {}} header={<div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>Initiatives a corriger</h2></div>}>
      <div className="stack">
        <p className="muted compact-help">Cette scene utilise maintenant les {modeInitiative(scene)}. Ces initiatives ne correspondent plus : {noms}.</p>
        <div className="grid2">
          <button className="primary" type="button" onClick={onChanger}>Changer les initiatives</button>
          <button className="danger-btn" type="button" onClick={onSortir}>Sortir de l'initiative</button>
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
    <FenetresSuperposees campaignName={campaignName} scene={scene} restorePoints={restorePoints} dark={dark} characters={characters} templates={templates} actions={actions} etatInterface={{ addSheetOpen, openMenu: currentView === 'scene' && openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen: currentView === 'scene' && initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch, creneauxManuelsActifs }} commandesInterface={{ ouvrirAjoutPersonnage: overlayActions.openAddCharacter, ouvrirSaisieInitiatives: overlayActions.openInitiativeEntry, ouvrirHubCampagne: overlayActions.retourHub, ouvrirCompteurGlobal: overlayActions.ouvrirCompteurGlobal, ouvrirEtatScene: overlayActions.ouvrirEtatScene, fermerAjoutPersonnage: overlayActions.fermerAjoutPersonnage, fermerMenu: overlayActions.fermerMenu, fermerNotice: overlayActions.fermerNotice, fermerCompteurGlobal: overlayActions.fermerCompteurGlobal, fermerResolutionHorloge: overlayActions.fermerResolutionHorloge, fermerSaisieInitiatives: initiativeActions.fermerSaisieInitiatives, validerSaisieInitiatives: initiativeActions.validerSaisieInitiatives, ouvrirSauvegardeTemplate: templateActions.openTemplateSave, creerPersonnageVierge: sceneActions.createBlankCharacter, creerDepuisTemplate: sceneActions.createFromTemplate, restaurerScene: sceneActions.restoreScene, retourPreparation: sceneActions.returnToPreparation, avancerRound: sceneActions.advanceRound, resetSuivisScene: sceneActions.resetSceneTrackers, effacerEtatsScene: sceneActions.clearSceneStatuses }} compteurGlobal={{ horlogesBloquantes: horlogesBloquantesActives }} resolutionHorloge={clockActions} templatesUi={{ templateTarget, templateError, fermerSauvegardeTemplate: templateActions.fermerSauvegardeTemplate, enregistrerTemplate: templateActions.saveTemplate }} />
    {initiativeAdjustOpen && participantAjustementInitiative && <FenetreAjustementInitiative participant={participantAjustementInitiative} valeurInitiale={participantAjustementInitiative.initiative} initiativeTextOrder={scene.initiativeTextOrder} onFermer={initiativeActions.fermerAjustementInitiative} onValider={initiativeActions.validerAjustementInitiative} onPasser={initiativeActions.passerAjustementInitiative} />}
    {initiativeCostOpen && participantAjustementInitiative && <FenetreCoutInitiative participant={participantAjustementInitiative} quickCosts={scene.initiativeCostQuickCosts} threshold={scene.initiativeCostThreshold} limitToCurrent={scene.initiativeCostLimitToCurrent} onFermer={initiativeActions.fermerCoutInitiative} onValider={initiativeActions.validerCoutInitiative} onTerminer={initiativeActions.terminerRoundPersonnage} />}
    {declarationActionsOpen && !declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} onFermer={initiativeActions.fermerDeclarationActions} onValider={initiativeActions.validerActionsDeclarees} />}
    {declarationAdditionTargetId && <FenetreDeclarationActions scene={scene} optionsInitiative={optionsInitiative} participantIds={[declarationAdditionTargetId]} lancerResolution={false} onFermer={initiativeActions.fermerDeclarationAjout} onValider={initiativeActions.validerDeclarationAjout} />}
    {participantsIncompatibles.length > 0 && <FenetreInitiativesIncompatibles scene={scene} participants={participantsIncompatibles} onChanger={initiativeActions.changerInitiativesIncompatibles} onSortir={initiativeActions.sortirInitiativesIncompatibles} />}
    {exportOpen && <FenetreExportCampagne nomInitial={campaignName} onFermer={campaignFileActions.fermerExport} onExporter={campaignFileActions.exportCampaign} />}
    {timerDoneOpen && <Fenetre title="Minuteur terminé" onClose={timerActions.fermerTimerDone}><div className="stack"><p className="muted compact-help">Le minuteur est arrivé à zéro.</p><div className="grid2"><button className="primary" onClick={timerActions.restartTimer}>Relancer</button><button className="small-btn" onClick={timerActions.resetTimer}>Remettre à zéro</button></div><button className="small-btn" onClick={timerActions.openTimerMenu}>Ouvrir le menu</button></div></Fenetre>}
    {pendingFileChoice && <Fenetre title="Fichier de campagne" onClose={actions.dismissLoadedCampaignChoice}><div className="stack"><p className="muted compact-help">Cette campagne vient de {pendingFileChoice.fileName}. Tu peux travailler directement sur ce fichier, ou créer une copie séparée.</p><div className="grid2"><button className="primary" onClick={campaignFileActions.workOnLoadedFile} disabled={!pendingFileChoice.canUseOriginal}>Travailler sur ce fichier</button><button className="small-btn" onClick={campaignFileActions.workOnCampaignCopy}>Créer une copie</button></div>{!pendingFileChoice.canUseOriginal && <p className="rule-warning">Le fichier original n'est pas accessible en écriture depuis ce mode d'import. La copie est le choix sûr.</p>}</div></Fenetre>}
    {currentView === 'hub' && editingTemplate && <FenetreEditionFiche participant={editingTemplate.participant} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={creneauxManuelsActifs} categoryOrder={scene.categoryOrder} tiebreakerVisible={scene.tiebreakerVisible !== false} tiebreakerLabel={scene.tiebreakerLabel} trackerTemplates={templates.trackerTemplates} title={`Modifier le template · ${editingTemplate.name}`} templateCategory={editingTemplate.category} templateCategories={templates.categories} saveTemplateVisible={false} deleteLabel="Supprimer le template" className="template-edit-sheet" templateSwitchRequest={templateSwitchRequest} onAnnulerChangementTemplate={templateActions.annulerChangementTemplate} onAbandonnerChangementTemplate={templateActions.abandonnerChangementDepuisTemplatePersonnage} onValiderChangementTemplate={templateActions.validerChangementDepuisTemplatePersonnage} onClose={templateActions.fermerEditionTemplatePersonnage} onSave={templateActions.saveEditedTemplate} onDelete={templateActions.deleteEditedTemplate} />}
    {sceneStatusOpen && <FenetreEtat participant={{ name: scene.title }} defaultAdvanceOn="round" afficherChoixEvolution={false} afficherInactif={false} statusTemplates={templates.sceneStatusTemplates} onFermer={overlayActions.fermerEtatScene} onValider={overlayActions.validerEtatScene} />}
  </>;
}
