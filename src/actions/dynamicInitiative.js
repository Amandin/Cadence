import { temporalityModes } from '../constants.js';
import { indexCreneauActif, ordreCreneauxClassique } from '../domain/initiative.js';
import { participantsPourPhaseAvancee } from '../domain/initiativeModes.js';
import { optionsTri } from './sceneSupport.js';

const DYNAMIC_CANDIDATE_ID = '__cadence_dynamic_candidate__';

export const dynamicAdditionKinds = {
  CLASSIC_INSERT: 'classic-insert',
  CLASSIC_PASSED: 'classic-passed',
  PHASE_INSERT: 'phase-insert',
  PHASE_PASSED: 'phase-passed',
  PHASE_NOT_CURRENT: 'phase-not-current',
};

function candidatDynamique(participant, initiative) {
  return {
    ...participant,
    id: DYNAMIC_CANDIDATE_ID,
    initiative,
    actionSlots: [{ id: 'slot-1', initiative, order: 0 }],
  };
}

function participantsSansCandidat(scene, participant) {
  return (scene.participants || []).filter((item) => item.id !== participant?.id);
}

function classerAjoutClassique(scene, participant, initiative) {
  if (!scene.activeId) return null;

  const options = optionsTri(scene);
  const participants = participantsSansCandidat(scene, participant);
  const slotsAvant = ordreCreneauxClassique(participants, options);
  const slotActif = slotsAvant[indexCreneauActif(scene, slotsAvant)];
  if (!slotActif) return null;

  const slotsApres = ordreCreneauxClassique([...participants, candidatDynamique(participant, initiative)], options);
  const indexCandidat = slotsApres.findIndex((slot) => slot.id === DYNAMIC_CANDIDATE_ID);
  const indexActif = slotsApres.findIndex((slot) => slot.actionSlotId === slotActif.actionSlotId);

  if (indexCandidat < 0 || indexActif < 0 || indexCandidat >= indexActif) return null;
  return indexCandidat === indexActif - 1 ? dynamicAdditionKinds.CLASSIC_INSERT : dynamicAdditionKinds.CLASSIC_PASSED;
}

function classerAjoutPhases(scene, participant, initiative) {
  const candidat = candidatDynamique(participant, initiative);
  const participantsPhase = participantsPourPhaseAvancee({ ...scene, participants: [...participantsSansCandidat(scene, participant), candidat] }, scene.phase || 1);
  const indexCandidat = participantsPhase.findIndex((item) => item.id === DYNAMIC_CANDIDATE_ID);
  if (indexCandidat < 0) return dynamicAdditionKinds.PHASE_NOT_CURRENT;
  const indexActif = participantsPhase.findIndex((item) => item.id === scene.activeId);
  if (indexActif < 0 || indexCandidat >= indexActif) return null;
  return indexCandidat === indexActif - 1 ? dynamicAdditionKinds.PHASE_INSERT : dynamicAdditionKinds.PHASE_PASSED;
}

export function classerAjoutDynamique(scene, participant, initiative = participant?.initiative) {
  if (!participant || scene?.round < 0) return null;
  if (scene.temporalite === temporalityModes.CLASSIC) return classerAjoutClassique(scene, participant, initiative);
  if (scene.temporalite === temporalityModes.PHASES) return classerAjoutPhases(scene, participant, initiative);
  return null;
}

export function initiativeClassiqueDejaDepassee(scene, participant, initiative = participant?.initiative) {
  return [dynamicAdditionKinds.CLASSIC_INSERT, dynamicAdditionKinds.CLASSIC_PASSED].includes(classerAjoutDynamique(scene, participant, initiative));
}
