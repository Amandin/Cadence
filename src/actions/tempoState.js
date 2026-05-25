import { activationAdvancePolicies, temporalityModes } from '../constants.js';
import { indexCreneauActif, ordreCreneauxClassique, premierCreneauClassique, valeurInitiative } from '../domain/initiative.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { isCheckedPhaseMode, isDeclarationMode, participantsPourPhaseAvancee, phaseSuivanteAvancee, phaseSuivanteAvanceeExiste, premierePhaseAvancee } from '../domain/initiativeModes.js';
import { resetAutoTrackers, tickParticipant, tickStatuses, triggerActivation } from '../logic.js';
import { optionsTri, placerEnReserve } from './sceneSupport.js';

export function estModeSouple(scene) {
  return scene.temporalite === temporalityModes.FLEXIBLE;
}

export function estModePhases(scene) {
  return scene.temporalite === temporalityModes.PHASES;
}

export function estModeDeclaration(scene) {
  return isDeclarationMode(scene);
}

export function phasesAttendRelanceInitiative(scene) {
  return estModePhases(scene) && !isCheckedPhaseMode(scene) && !!scene.phaseRerollEachRound && !scene.activeId;
}

export function trouverTourActifParInitiative(scene, participantsTries) {
  const actifAvant = scene.participants.find((participant) => participant.id === scene.activeId);
  if (!actifAvant) return { activeId: scene.activeId, activeSlotId: scene.activeSlotId || '', nouveauRound: false };

  const initiativeActive = valeurInitiative(actifAvant);
  const actifMemeOuPlusBas = participantsTries.find((participant) => valeurInitiative(participant) <= initiativeActive);
  if (actifMemeOuPlusBas) return { activeId: actifMemeOuPlusBas.id, activeSlotId: scene.activeSlotId || '', nouveauRound: false };

  return { activeId: participantsTries[0]?.id || scene.activeId, activeSlotId: '', nouveauRound: participantsTries.length > 0 };
}

export function participantsPhase(scene, phase = scene.phase || 1) {
  if (phasesAttendRelanceInitiative(scene)) return [];
  return participantsPourPhaseAvancee(scene, phase);
}

export function premierParticipantPhase(scene) {
  return participantsPhase(scene)[0]?.id || '';
}

export function phaseSuivanteDisponible(scene) {
  return phaseSuivanteAvanceeExiste(scene, scene.phase || 1);
}

export function phaseSuivante(scene) {
  return phaseSuivanteAvancee(scene, scene.phase || 1);
}

export function premierePhaseDisponible(scene) {
  return premierePhaseAvancee(scene);
}

function preparerActivationRound(participant) {
  return { ...participant, _activationAutomationsDone: false };
}

function declencherActivation(scene, participant, activeId) {
  if (participant.id !== activeId) return participant;
  const cible = scene.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION
    ? { ...participant, _activationAutomationsDone: false }
    : participant;
  return triggerActivation(cible);
}

function tickSceneRoundStatuses(scene) {
  return { ...scene, statuses: tickStatuses(scene.statuses, 'round') };
}

export function appliquerDebutNouveauRound(scene, activeId) {
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  const premierCreneau = premierCreneauClassique(sceneAvecEtats.participants || [], optionsTri(sceneAvecEtats));
  const nextActiveId = activeId || premierCreneau?.id || '';
  const nextActiveSlotId = premierCreneau?.id === nextActiveId ? premierCreneau.actionSlotId : '';
  return {
    ...sceneAvecEtats,
    activeId: nextActiveId,
    activeSlotId: nextActiveSlotId,
    round: Math.max(1, sceneAvecEtats.round + 1),
    globalTracker: stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1),
    participants: sceneAvecEtats.participants.map((participant) => {
      const afterRound = tickParticipant(resetAutoTrackers(participant, 'round'), 'round');
      return declencherActivation(sceneAvecEtats, afterRound, nextActiveId);
    }),
    reserve: (sceneAvecEtats.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')).map(placerEnReserve),
  };
}

export function appliquerNouveauRoundSouple(scene) {
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  return {
    ...sceneAvecEtats,
    activeId: '',
    activeSlotId: '',
    round: Math.max(1, sceneAvecEtats.round + 1),
    globalTracker: stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1),
    participants: (sceneAvecEtats.participants || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')),
    reserve: (sceneAvecEtats.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')).map(placerEnReserve),
    jouesSouples: [],
    historiqueSouple: [],
  };
}

export function appliquerNouveauRoundPhases(scene) {
  const phaseOnce = scene.phaseActivateOncePerRound !== false;
  const sceneAvecEtats = tickSceneRoundStatuses(scene);
  const phase = premierePhaseDisponible(sceneAvecEtats);
  const sceneSuivante = {
    ...sceneAvecEtats,
    activeId: '',
    activeSlotId: '',
    phase,
    round: Math.max(1, sceneAvecEtats.round + 1),
    globalTracker: stepAutoGlobalTracker(sceneAvecEtats.globalTracker, 1),
    participants: (sceneAvecEtats.participants || []).map((participant) => {
      const afterRound = tickParticipant(resetAutoTrackers(participant, 'round'), 'round');
      return phaseOnce ? preparerActivationRound(afterRound) : afterRound;
    }),
    reserve: (sceneAvecEtats.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'), 'round')).map(placerEnReserve),
  };

  if (!isCheckedPhaseMode(scene) && scene.phaseRerollEachRound) return sceneSuivante;
  const activeId = premierParticipantPhase(sceneSuivante);
  return {
    ...sceneSuivante,
    activeId,
    activeSlotId: '',
    participants: sceneSuivante.participants.map((participant) => declencherActivation(sceneSuivante, participant, activeId)),
  };
}

export function creneauxClassiques(scene) {
  return ordreCreneauxClassique(scene.participants || [], optionsTri(scene));
}

export function creneauActifClassique(scene) {
  const slots = creneauxClassiques(scene);
  return slots[indexCreneauActif(scene, slots)] || null;
}
