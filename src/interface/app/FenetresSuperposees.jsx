import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { FenetreEtat } from '../dialogues/FenetreEtat.jsx';
import { FenetreInformation } from '../dialogues/FenetreInformation.jsx';
import { FenetreInitiativeDepassee } from '../dialogues/FenetreInitiativeDepassee.jsx';
import { FenetreLancerInitiatives } from '../dialogues/FenetreLancerInitiatives.jsx';
import { FenetreModificationInitiative } from '../dialogues/FenetreModificationInitiative.jsx';
import { FenetreRejoindreInitiative } from '../dialogues/FenetreRejoindreInitiative.jsx';
import { FenetreResolutionHorloge } from '../dialogues/FenetreResolutionHorloge.jsx';
import { FenetreSauvegardeTemplate } from '../dialogues/FenetreSauvegardeTemplate.jsx';
import { FenetreAjoutPersonnage } from '../fiches/FenetreAjoutPersonnage.jsx';
import { FenetreEditionFiche } from '../fiches/FenetreEditionFiche.jsx';
import { FicheParticipant } from '../fiches/FicheParticipant.jsx';
import { MenuPrincipal } from '../menu/MenuPrincipal.jsx';
import { FenetreCompteurGlobal } from '../suivis/CompteurGlobal.jsx';

export function FenetresSuperposees({ scene, restorePoints, dark, characters, templates, actions, etatInterface, commandesInterface, compteurGlobal, resolutionHorloge, templatesUi }) {
  const { addSheetOpen, openMenu, notice, globalSheetOpen, clockModalOpen, initiativeEntryOpen, initiativeEntryScopeIds, initiativeEntryInitialLaunch } = etatInterface;
  const { fermerAjoutPersonnage, fermerMenu, fermerNotice, fermerCompteurGlobal, fermerResolutionHorloge, fermerSaisieInitiatives, validerSaisieInitiatives, ouvrirSauvegardeTemplate, creerPersonnageVierge, creerDepuisTemplate, restaurerScene, retourPreparation, avancerRound, resetSuivisScene, effacerEtatsScene, ouvrirHubCampagne, ouvrirCompteurGlobal, ouvrirEtatScene } = commandesInterface;
  const { templateTarget, templateError, fermerSauvegardeTemplate, enregistrerTemplate } = templatesUi;
  const { resetClock, deleteClock } = resolutionHorloge;
  const optionsInitiative = { initiativeTextOrder: scene.initiativeTextOrder, multipleActionSlots: scene.multipleActionSlots !== false };
  const utiliserInitiative = scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false;
  const allowActivationAutomation = scene.temporalite !== 'souple';
  const statusTemplates = templates.statusTemplates.map((template) => template.id !== 'status-template-surpris' ? template : {
    ...template,
    status: { ...template.status, inactive: scene.surpriseImpact === 'inactive', limited: scene.surpriseImpact !== 'inactive', advanceOn: scene.surpriseAdvanceOn === 'round' ? 'round' : 'activation' },
  });
  const ouvrirHub = () => { fermerMenu?.(); ouvrirHubCampagne?.(); };
  const ouvrirCompteurScene = () => { fermerMenu?.(); ouvrirCompteurGlobal?.(); };
  const ouvrirEtatSceneDepuisMenu = () => { fermerMenu?.(); ouvrirEtatScene?.(); };
  const changerInfoRapide = (participantId, index, valeur) => characters.updateCharacter(participantId, (participant) => ({ ...participant, stats: (participant.stats || []).map((stat, position) => position === index ? valeur : stat) }));
  const changerInitiativeCreneau = (participantId, indexCreneau, initiative) => characters.updateCharacter(participantId, (participant) => {
    const slots = normaliserCreneauxAction(participant, optionsInitiative);
    const modifies = slots.map((slot, index) => index === indexCreneau ? { ...slot, initiative, order: index } : { ...slot, order: index });
    const actionSlots = normaliserCreneauxAction({ ...participant, initiative: modifies[0]?.initiative ?? initiative, actionSlots: modifies }, optionsInitiative);
    return { ...participant, initiative: actionSlots[0]?.initiative ?? initiative, actionSlots };
  });
  const changerInitiativesCreneaux = (participantId, initiatives, phaseActions) => characters.updateCharacter(participantId, (participant) => {
    const valeurs = (initiatives || []).map((valeur) => String(valeur ?? '').trim()).filter(Boolean);
    if (!valeurs.length) return participant;
    const actionSlots = normaliserCreneauxAction({ ...participant, initiative: valeurs[0], actionSlots: valeurs.map((initiative, index) => ({ id: `slot-${index + 1}`, initiative, order: index })) }, optionsInitiative);
    const phasePatch = Array.isArray(phaseActions) ? { phaseActions } : {};
    return { ...participant, ...phasePatch, initiative: actionSlots[0]?.initiative ?? valeurs[0], actionSlots };
  });
  const scopeIds = Array.isArray(initiativeEntryScopeIds) && initiativeEntryScopeIds.length ? new Set(initiativeEntryScopeIds) : null;
  const participantsSaisieInitiative = scopeIds ? scene.participants.filter((participant) => scopeIds.has(participant.id)) : scene.participants;
  const reserveSaisieInitiative = scopeIds ? [] : scene.reserve;

  return <>
    {characters.selected && <FicheParticipant participant={characters.selected} enInitiative={characters.isInInit(characters.selected.id)} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={scene.multipleActionSlots !== false} utiliserInitiative={utiliserInitiative} tiebreakerVisible={scene.tiebreakerVisible !== false} onFermer={characters.closeCharacter} onModifier={() => characters.editCharacter(characters.selected.id)} onChangerInitiative={(indexCreneau, initiative) => changerInitiativeCreneau(characters.selected.id, indexCreneau, initiative)} onChangerInitiatives={(initiatives, phaseActions) => changerInitiativesCreneaux(characters.selected.id, initiatives, phaseActions)} onRejoindreInitiative={() => characters.requestJoin(characters.selected.id)} onQuitterInitiative={() => characters.leaveInit(characters.selected.id)} onInfoRapide={(index, valeur) => changerInfoRapide(characters.selected.id, index, valeur)} onSuivi={(trackerId, next) => characters.updateCharacterTracker(characters.selected.id, trackerId, next)} onSupprimerSuivi={(trackerId) => characters.deleteCharacterTracker(characters.selected.id)} onAjouterEtat={() => characters.requestStatus(characters.selected.id)} onRetirerEtat={(statusId) => characters.removeCharacterStatus(characters.selected.id, statusId)} onNote={(note) => characters.updateCharacter(characters.selected.id, (participant) => ({ ...participant, note }))} />}
    {characters.editing && <FenetreEditionFiche participant={characters.editing} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} multipleActionSlots={scene.multipleActionSlots !== false} utiliserInitiative={utiliserInitiative} allowActivationAutomation={allowActivationAutomation} categoryOrder={scene.categoryOrder} tiebreakerVisible={scene.tiebreakerVisible !== false} tiebreakerLabel={scene.tiebreakerLabel} trackerTemplates={templates.trackerTemplates} onClose={characters.closeEditor} onSave={characters.saveCharacter} onDelete={() => characters.deleteCharacter(characters.editing.id)} onSaveTemplate={ouvrirSauvegardeTemplate} />}
    {characters.statusTarget && <FenetreEtat participant={characters.statusTarget} defaultAdvanceOn={allowActivationAutomation ? 'activation' : 'round'} allowActivationAdvance={allowActivationAutomation} activationAdvanceNote="Mode souple : pas de nouvel etat a activation." statusTemplates={statusTemplates} onFermer={characters.cancelStatus} onValider={characters.saveStatus} />}
    {characters.joinTarget && <FenetreRejoindreInitiative participant={characters.joinTarget} initiativeTextOrder={scene.initiativeTextOrder} utiliserInitiative={utiliserInitiative} onFermer={characters.cancelJoin} onValider={characters.joinInit} />}
    {characters.lateInitiativeParticipant && <FenetreInitiativeDepassee kind={characters.lateInitiativeAdditionKind} onActiver={characters.activateLateInitiativeAddition} onAjouter={characters.confirmLateInitiativeAddition} onSurpris={characters.surpriseLateInitiativeAddition} onModifier={characters.editLateInitiativeAddition} />}
    {characters.initiativeEditParticipant && <FenetreModificationInitiative participant={characters.initiativeEditParticipant} initiativeTextOrder={scene.initiativeTextOrder} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} onFermer={characters.cancelInitiativeEdit} onValider={characters.saveInitiativeEdit} />}
    {addSheetOpen && <FenetreAjoutPersonnage templates={templates.templates} categories={templates.categories} initiativeTextOrder={scene.initiativeTextOrder} utiliserInitiative={utiliserInitiative} phaseActionMode={scene.phaseActionMode} phaseCount={scene.phaseCount} onFermer={fermerAjoutPersonnage} onCreerVierge={creerPersonnageVierge} onCreerDepuisTemplate={creerDepuisTemplate} />}
    {templateTarget && <FenetreSauvegardeTemplate participant={templateTarget} categories={templates.categories} erreur={templateError} onFermer={fermerSauvegardeTemplate} onEnregistrer={enregistrerTemplate} />}
    {globalSheetOpen && <FenetreCompteurGlobal compteur={scene.globalTracker} sceneCounterTemplates={templates.sceneCounterTemplates} onModifier={actions.updateGlobalTracker} onChanger={actions.stepGlobal} onFermer={fermerCompteurGlobal} />}
    {clockModalOpen && <FenetreResolutionHorloge participants={compteurGlobal.horlogesBloquantes} onFermer={fermerResolutionHorloge} onRelancerHorloge={resetClock} onSupprimerHorloge={deleteClock} />}
    {notice && <FenetreInformation titre={notice.title} message={notice.message} onFermer={fermerNotice} />}
    {openMenu && <MenuPrincipal scene={scene} restorePoints={restorePoints} onRestore={restaurerScene} onReturnToPreparation={retourPreparation} onAdvanceRound={avancerRound} onResetTrackers={resetSuivisScene} onClearStatuses={effacerEtatsScene} onClose={fermerMenu} dark={dark} setDark={actions.setDark} onAddParticipant={commandesInterface.ouvrirAjoutPersonnage} onOpenCampaignHub={ouvrirHub} onGlobalTracker={actions.updateGlobalTracker} onStepGlobalTracker={actions.stepGlobal} onOpenGlobalTracker={ouvrirCompteurScene} onAddSceneStatus={ouvrirEtatSceneDepuisMenu} onRemoveSceneStatus={actions.removeSceneStatus} onUpdateSceneNotes={(notes) => actions.updateSceneField('notes', notes)} onOpenInitiativeRoller={utiliserInitiative ? commandesInterface.ouvrirSaisieInitiatives : null} />}
    {initiativeEntryOpen && <FenetreLancerInitiatives initiativeTextOrder={scene.initiativeTextOrder} initiativeEnabled={utiliserInitiative} multipleActionSlots={scene.multipleActionSlots !== false} categoryOrder={scene.categoryOrder} participants={participantsSaisieInitiative} reserve={reserveSaisieInitiative} prefillExisting={initiativeEntryInitialLaunch} surpriseSelectionEnabled={initiativeEntryInitialLaunch && !!scene.preparationSurprise} tiebreakerVisible={scene.tiebreakerVisible !== false} tiebreakerLabel={scene.tiebreakerLabel} onFermer={fermerSaisieInitiatives} onValider={validerSaisieInitiatives || actions.applyInitiativeRolls} onPasserHorsInitiative={actions.moveParticipantsToReserve} />}
  </>;
}
