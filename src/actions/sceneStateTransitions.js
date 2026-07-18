import { temporalityModes } from '../constants.js';
import { indexCreneauActif, initiativeDePhase, ordreCreneauxClassique, premierCreneauClassique, trierParInitiative } from '../domain/initiative.js';
import { isInitiativeCostMode, participantWithCleanInitiativeCostRound, rulesAllowMultipleSlots } from '../domain/initiativeCost.js';
import { declarationStage, declarationStages, isCheckedPhaseMode, normalizeDeclarations, setDeclaration } from '../domain/initiativeModes.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { createStatus } from '../domain/statuses.js';
import { clone, resetAutoTrackers, tickParticipant, triggerActivation, untickParticipant } from '../logic.js';
import { ajouterJoueSouple, annulerDernierJoueSouple, retirerHistoriqueSouple, retirerJoueSouple, toutLeMondeAJoueSouple } from './flexibleTurnState.js';
import { appliquerCoutInitiative, appliquerDebutNouveauRoundCout, premierCreneauCoutEligible, slotsNonJoues } from './initiativeCostActions.js';
import { advanceReserveParticipantRound, arreterTempsReelScene, demarrerTempsReelScene, effacerEtatsParticipant, resetSuivisParticipant, tickSceneRoundStatuses, triggerActivationScene, untickSceneRoundStatuses } from './sceneAutomation.js';
import { actionSlotsDepuisInitiatives, addPreInitiativeRestorePoint, addRestorePoint, clearActiveInPreparation, createBlankParticipant, initiativesRenseignees, optionsTri, placerEnReserve } from './sceneSupport.js';
import { appliquerSurpriseInitiale, roundDepart } from './sceneSurprise.js';
import { depilerRetourAction, empilerRetourAction, restaurerDepuisHistorique } from './sceneTurnHistory.js';
import {
  appliquerDebutNouveauRound,
  appliquerNouveauRoundPhases,
  appliquerNouveauRoundSouple,
  estModeDeclaration,
  estModePhases,
  estModeSouple,
  phaseSuivante,
  participantsPhase,
  phaseSuivanteDisponible,
  premierePhaseDisponible,
  premierParticipantPhase,
  trouverActivationActiveParInitiative,
} from './tempoState.js';

function modifierParticipantDansScene(scene, participantId, updater) {
  const participants = trierParInitiative(scene.participants.map((p) => p.id === participantId ? updater(p) : p), optionsTri(scene));
  const slots = ordreCreneauxClassique(participants, optionsTri(scene));
  const activeSlot = slots.find((slot) => slot.actionSlotId === scene.activeSlotId) || slots.find((slot) => slot.id === scene.activeId);
  const { activeId, activeSlotId, nouveauRound } = estModeSouple(scene) || estModePhases(scene)
    ? { activeId: scene.activeId, activeSlotId: scene.activeSlotId || '', nouveauRound: false }
    : trouverActivationActiveParInitiative(scene, participants);
  const sceneSuivante = {
    ...scene,
    participants,
    activeId,
    activeSlotId: activeSlotId || activeSlot?.actionSlotId || '',
    reserve: (scene.reserve || []).map((p) => p.id === participantId ? placerEnReserve(updater(p)) : placerEnReserve(p)),
  };

  return nouveauRound ? appliquerDebutNouveauRound(sceneSuivante, activeId) : sceneSuivante;
}

function recalerActifPhaseSiBesoin(scene) {
  return estModePhases(scene) && !participantsPhase(scene).some((participant) => participant.id === scene.activeId)
    ? { ...scene, activeId: premierParticipantPhase(scene) }
    : scene;
}

function reinitialiserDeclarationRound(scene) {
  if (!estModeDeclaration(scene)) return scene;
  return {
    ...scene,
    activeId: '',
    activeSlotId: '',
    declarationStage: declarationStages.DECLARATION,
    declarations: {},
    resolutionOrder: [],
    declarationPlayedIds: [],
  };
}

function marquerDeclarationJoue(scene, participantId) {
  if (!estModeDeclaration(scene) || declarationStage(scene) !== declarationStages.RESOLUTION || !participantId) return scene;
  return { ...scene, declarationPlayedIds: [...new Set([...(scene.declarationPlayedIds || []), String(participantId)])] };
}

function retirerDeclarationJoue(scene, participantId) {
  if (!estModeDeclaration(scene) || !participantId) return scene;
  return { ...scene, declarationPlayedIds: (scene.declarationPlayedIds || []).filter((id) => id !== String(participantId)) };
}

function appliquerDebutRoundInitial(scene) {
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  const depart = sceneAvecEtats.preparationSurprise && sceneAvecEtats.surpriseDedicatedRound ? 0 : roundDepart(sceneAvecEtats);
  return {
    ...sceneAvecEtats,
    round: depart,
    surpriseRoundActive: depart === 0,
    globalTracker: demarrerTempsReelScene(stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1)),
    participants: (sceneAvecEtats.participants || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')),
    reserve: (sceneAvecEtats.reserve || []).map(placerEnReserve),
  };
}

function avancerAutomatismesParticipant(participant) {
  return triggerActivation(tickParticipant(resetAutoTrackers(participant, 'round'), 'round'));
}

function reculerAutomatismesParticipant(participant) {
  return {
    ...untickParticipant(untickParticipant(participant, 'activation'), 'round'),
    _activationAutomationsDone: false,
  };
}

function avancerTousLesAutomatismes(scene) {
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  return {
    ...sceneAvecEtats,
    globalTracker: stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1),
    participants: (sceneAvecEtats.participants || []).map(avancerAutomatismesParticipant),
  };
}

function reculerTousLesAutomatismes(scene) {
  return {
    ...untickSceneRoundStatuses(scene),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, -1),
    participants: (scene.participants || []).map(reculerAutomatismesParticipant),
  };
}

function terminerEffetsTemporairesDansListe(statuses = []) {
  return statuses.map((status) => status?.duration == null ? status : { ...status, remaining: 0, expired: true });
}

function terminerEffetsTemporairesParticipant(participant) {
  return { ...participant, statuses: terminerEffetsTemporairesDansListe(participant.statuses || []) };
}

function terminerEffetsTemporairesScene(scene) {
  return {
    ...scene,
    statuses: terminerEffetsTemporairesDansListe(scene.statuses || []),
    participants: (scene.participants || []).map(terminerEffetsTemporairesParticipant),
    reserve: (scene.reserve || []).map(terminerEffetsTemporairesParticipant).map(placerEnReserve),
  };
}

function demarrerScene(scene) {
  const sceneInitiale = appliquerDebutRoundInitial(scene);
  if (estModeDeclaration(scene)) {
    if (estModeSouple(scene)) return reinitialiserDeclarationRound({ ...sceneInitiale, jouesSouples: [], historiqueSouple: [] });
    if (estModePhases(scene)) {
      const scenePreteBase = { ...sceneInitiale, phase: 1, activeId: '', activeSlotId: '' };
      const scenePrete = { ...scenePreteBase, phase: premierePhaseDisponible(scenePreteBase) };
      return reinitialiserDeclarationRound(scenePrete);
    }
    const participants = trierParInitiative(sceneInitiale.participants || [], optionsTri(sceneInitiale));
    return reinitialiserDeclarationRound({ ...sceneInitiale, participants });
  }
  if (estModeSouple(scene)) return { ...sceneInitiale, activeId: '', activeSlotId: '', jouesSouples: [], historiqueSouple: [], participants: (sceneInitiale.participants || []).map((participant) => triggerActivation(participant)) };
  if (estModePhases(scene)) {
    const scenePreteBase = { ...sceneInitiale, phase: 1 };
    const scenePrete = { ...scenePreteBase, phase: premierePhaseDisponible(scenePreteBase) };
    const activeId = !isCheckedPhaseMode(scenePrete) && scenePrete.phaseRerollEachRound ? '' : premierParticipantPhase(scenePrete);
    const sceneActive = { ...scenePrete, activeId, activeSlotId: '', participants: (scenePrete.participants || []).map((participant) => ({ ...participant, _activationAutomationsDone: false })) };
    return { ...sceneActive, participants: sceneActive.participants.map((participant) => triggerActivationScene(sceneActive, participant, activeId)) };
  }
  const participants = trierParInitiative(sceneInitiale.participants || [], optionsTri(sceneInitiale));
  const premierCreneau = isInitiativeCostMode(sceneInitiale)
    ? premierCreneauCoutEligible(sceneInitiale, participants)
    : premierCreneauClassique(participants, optionsTri(sceneInitiale));
  const sceneActive = { ...sceneInitiale, participants, activeId: premierCreneau?.id || (isInitiativeCostMode(sceneInitiale) ? '' : participants[0]?.id || scene.activeId), activeSlotId: premierCreneau?.actionSlotId || '' };
  return { ...sceneActive, participants: sceneActive.participants.map((participant) => triggerActivationScene(sceneActive, participant, sceneActive.activeId)) };
}

function remettreEnPreparation(scene) {
  return {
    ...scene,
    round: -1,
    phase: 1,
    activeId: '',
    activeSlotId: '',
    declarationStage: estModeDeclaration(scene) ? declarationStages.DECLARATION : '',
    declarations: estModeDeclaration(scene) ? {} : scene.declarations || {},
    resolutionOrder: estModeDeclaration(scene) ? [] : scene.resolutionOrder || [],
    declarationPlayedIds: estModeDeclaration(scene) ? [] : scene.declarationPlayedIds || [],
    globalTracker: arreterTempsReelScene(scene.globalTracker),
    jouesSouples: [],
    historiqueSouple: [],
    reserve: (scene.reserve || []).map(placerEnReserve),
    participants: (scene.participants || []).map((participant) => isInitiativeCostMode(scene) ? participantWithCleanInitiativeCostRound(participant) : participant),
    _turnHistory: [],
  };
}

function preparerParticipantPhases(scene, participant) {
  if (estModePhases(scene) && !isCheckedPhaseMode(scene) && scene.round >= 0 && Number(scene.phase || 1) > 1) {
    const effectiveInitiative = initiativeDePhase(participant, scene.phase || 1, scene.phaseDecrement || 10, optionsTri(scene));
    const adjusted = { ...participant, initiative: effectiveInitiative, phaseAdjustedAt: scene.phase || 1 };
    return { ...adjusted, actionSlots: [{ id: 'slot-1', initiative: effectiveInitiative, order: 0 }] };
  }
  if (!estModePhases(scene) || !isCheckedPhaseMode(scene) || Array.isArray(participant.phaseActions)) return participant;
  return { ...participant, phaseActions: ['1'] };
}

function departageRenseigne(departagesById, participantId) {
  if (!departagesById || !(participantId in departagesById)) return {};
  const valeur = departagesById?.[participantId];
  if (String(valeur ?? '').trim() === '') return { departage: '' };
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? { departage: nombre } : {};
}

function bonusInitiativeRenseigne(initiativeBonusesById, participantId) {
  if (!initiativeBonusesById || !(participantId in initiativeBonusesById)) return {};
  const nombre = Number(initiativeBonusesById[participantId]);
  return Number.isFinite(nombre) ? { initiativeBonus: nombre } : { initiativeBonus: 0 };
}

function appliquerInitiativesRenseignees(scene, valuesById, departagesById = {}, initiativeBonusesById = {}) {
  const bonusActifs = scene.initiativeBonusEnabled !== false ? initiativeBonusesById : {};
  const participantsMisAJour = (scene.participants || []).map((participant) => {
    const initiatives = initiativesRenseignees(valuesById, participant.id);
    const departage = departageRenseigne(departagesById, participant.id);
    const bonus = bonusInitiativeRenseigne(bonusActifs, participant.id);
    if (!initiatives) return { ...participant, ...departage, ...bonus };
    const actionSlots = actionSlotsDepuisInitiatives(initiatives, rulesAllowMultipleSlots(scene, participant));
    return { ...participant, ...departage, ...bonus, initiativePending: false, initiative: actionSlots[0]?.initiative ?? participant.initiative, actionSlots };
  });
  const reserveJointe = [];
  const reserve = (scene.reserve || []).flatMap((participant) => {
    const initiatives = initiativesRenseignees(valuesById, participant.id);
    const participantAvecDepartage = { ...participant, ...departageRenseigne(departagesById, participant.id), ...bonusInitiativeRenseigne(bonusActifs, participant.id) };
    if (!initiatives) return [placerEnReserve(participantAvecDepartage)];
    const actionSlots = actionSlotsDepuisInitiatives(initiatives, rulesAllowMultipleSlots(scene, participant));
    reserveJointe.push(preparerParticipantPhases(scene, { ...participantAvecDepartage, initiative: actionSlots[0]?.initiative ?? 0, actionSlots }));
    return [];
  });
  const participants = trierParInitiative([...participantsMisAJour, ...reserveJointe], optionsTri(scene));
  const sceneAvecParticipantsBase = { ...scene, participants, reserve, phase: estModePhases(scene) ? 1 : scene.phase || 1 };
  const sceneAvecParticipants = estModePhases(scene) ? { ...sceneAvecParticipantsBase, phase: premierePhaseDisponible(sceneAvecParticipantsBase) } : sceneAvecParticipantsBase;
  const premierCreneau = isInitiativeCostMode(sceneAvecParticipants)
    ? premierCreneauCoutEligible(sceneAvecParticipants, participants)
    : premierCreneauClassique(participants, optionsTri(sceneAvecParticipants));
  const attendDeclarations = estModeDeclaration(scene) && declarationStage(scene) === declarationStages.DECLARATION;
  return {
    ...sceneAvecParticipants,
    activeId: attendDeclarations ? '' : estModeSouple(scene) ? '' : estModePhases(scene) ? participantsPhase(sceneAvecParticipants)[0]?.id || '' : premierCreneau?.id || (isInitiativeCostMode(sceneAvecParticipants) ? '' : participants[0]?.id || ''),
    activeSlotId: attendDeclarations || estModeSouple(scene) || estModePhases(scene) ? '' : premierCreneau?.actionSlotId || '',
    jouesSouples: [],
    historiqueSouple: [],
  };
}

export {
  modifierParticipantDansScene,
  recalerActifPhaseSiBesoin,
  reinitialiserDeclarationRound,
  marquerDeclarationJoue,
  retirerDeclarationJoue,
  avancerTousLesAutomatismes,
  reculerTousLesAutomatismes,
  terminerEffetsTemporairesScene,
  demarrerScene,
  remettreEnPreparation,
  preparerParticipantPhases,
  appliquerInitiativesRenseignees,
};

