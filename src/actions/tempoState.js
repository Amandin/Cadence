import { temporalityModes } from '../constants.js';
import { phaseSuivanteExiste, participantsPourPhase, valeurInitiative } from '../domain/initiative.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { resetAutoTrackers, tickParticipant } from '../logic.js';
import { optionsTri, placerEnReserve } from './sceneSupport.js';

export function estModeSouple(scene) {
  return scene.temporalite === temporalityModes.FLEXIBLE;
}

export function estModePhases(scene) {
  return scene.temporalite === temporalityModes.PHASES;
}

export function phasesAttendRelanceInitiative(scene) {
  return estModePhases(scene) && !!scene.phaseRerollEachRound && !scene.activeId;
}

export function trouverTourActifParInitiative(scene, participantsTries) {
  const actifAvant = scene.participants.find((participant) => participant.id === scene.activeId);
  if (!actifAvant) return { activeId: scene.activeId, nouveauRound: false };

  const initiativeActive = valeurInitiative(actifAvant);
  const actifMemeOuPlusBas = participantsTries.find((participant) => valeurInitiative(participant) <= initiativeActive);
  if (actifMemeOuPlusBas) return { activeId: actifMemeOuPlusBas.id, nouveauRound: false };

  return { activeId: participantsTries[0]?.id || scene.activeId, nouveauRound: participantsTries.length > 0 };
}

export function participantsPhase(scene, phase = scene.phase || 1) {
  if (phasesAttendRelanceInitiative(scene)) return [];
  return participantsPourPhase(scene.participants || [], phase, scene.phaseDecrement || 10, optionsTri(scene));
}

export function premierParticipantPhase(scene) {
  return participantsPhase(scene)[0]?.id || '';
}

export function phaseSuivanteDisponible(scene) {
  return phaseSuivanteExiste(scene.participants, scene.phase || 1, scene.phaseDecrement || 10);
}

export function appliquerDebutNouveauRound(scene, activeId) {
  return {
    ...scene,
    activeId,
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: scene.participants.map((participant) => {
      const afterRound = resetAutoTrackers(participant, 'round');
      return participant.id === activeId ? resetAutoTrackers(tickParticipant(afterRound), 'activation') : afterRound;
    }),
    reserve: (scene.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'))).map(placerEnReserve),
  };
}

export function appliquerNouveauRoundSouple(scene) {
  return {
    ...scene,
    activeId: '',
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: (scene.participants || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'))),
    reserve: (scene.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'))).map(placerEnReserve),
    jouesSouples: [],
    historiqueSouple: [],
  };
}

export function appliquerNouveauRoundPhases(scene) {
  const sceneSuivante = {
    ...scene,
    activeId: '',
    phase: 1,
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: (scene.participants || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'))),
    reserve: (scene.reserve || []).map((participant) => tickParticipant(resetAutoTrackers(participant, 'round'))).map(placerEnReserve),
  };

  return scene.phaseRerollEachRound
    ? sceneSuivante
    : { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante), participants: sceneSuivante.participants.map((participant) => participant.id === premierParticipantPhase(sceneSuivante) ? resetAutoTrackers(participant, 'activation') : participant) };
}
