import { activationAdvancePolicies } from '../constants.js';
import { resetAutoTrackers, resetTracker, tickParticipant, tickStatuses, triggerActivation, untickStatuses } from '../logic.js';

export function demarrerTempsReelScene(compteur) {
  if (!compteur?.enabled || !['stopwatch', 'timer'].includes(compteur.mode)) return compteur;
  return { ...compteur, running: true, startedAt: Date.now(), elapsedMs: 0 };
}

export function arreterTempsReelScene(compteur) {
  if (!compteur?.enabled || !['stopwatch', 'timer'].includes(compteur.mode)) return compteur;
  return { ...compteur, running: false, startedAt: null, elapsedMs: 0 };
}

export function resetSuivisParticipant(participant) {
  return { ...participant, trackers: (participant.trackers || []).map((suivi) => resetTracker(suivi)) };
}

export function effacerEtatsParticipant(participant) {
  return { ...participant, statuses: [] };
}

export function tickSceneRoundStatuses(scene) {
  return { ...scene, statuses: tickStatuses(scene.statuses, 'round') };
}

export function untickSceneRoundStatuses(scene) {
  return { ...scene, statuses: untickStatuses(scene.statuses, 'round') };
}

export function triggerActivationScene(scene, participant, activeId) {
  if (participant.id !== activeId) return participant;
  const cible = scene.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION
    ? { ...participant, _activationAutomationsDone: false }
    : participant;
  return triggerActivation(cible);
}

export function advanceReserveParticipantRound(participant) {
  return tickParticipant(resetAutoTrackers(participant, 'round'), 'round');
}
