import { indexCreneauActif, ordreCreneauxClassique } from '../domain/initiative.js';
import {
  INITIATIVE_COST_SLOT_KIND,
  baseInitiativeSlots,
  initiativeCostMaxForSlot,
  initiativeCostSlotIsAboveThreshold,
  isInitiativeCostMode,
  participantWithCleanInitiativeCostRound,
  normalizeInitiativeCostThreshold,
} from '../domain/initiativeCost.js';
import { uid } from '../logic.js';
import { optionsTri } from './sceneSupport.js';
import { appliquerDebutNouveauRound } from './tempoState.js';

export function slotsNonJoues(scene) {
  return ordreCreneauxClassique(scene.participants || [], optionsTri(scene))
    .filter((slot) => !slot.actionSlotPlayed)
    .filter((slot) => !isInitiativeCostMode(scene) || initiativeCostSlotIsAboveThreshold(scene, slot));
}

export function premierCreneauCoutEligible(scene, participants = scene.participants || []) {
  return ordreCreneauxClassique(participants || [], optionsTri(scene))
    .find((slot) => !slot.actionSlotPlayed && initiativeCostSlotIsAboveThreshold(scene, slot)) || null;
}

function nettoyerCreneauxCoutScene(scene) {
  return isInitiativeCostMode(scene)
    ? { ...scene, participants: (scene.participants || []).map(participantWithCleanInitiativeCostRound) }
    : scene;
}

function marquerCreneauCout(participant, rawSlotId, cost, costResult) {
  const slots = baseInitiativeSlots(participant);
  const raw = Array.isArray(participant.actionSlots) && participant.actionSlots.length ? participant.actionSlots : slots;
  return raw.map((slot, index) => {
    const source = slot && typeof slot === 'object' ? slot : { initiative: slot };
    const id = source.id ? String(source.id) : `slot-${index + 1}`;
    if (id !== rawSlotId) return source;
    return {
      ...source,
      id,
      played: true,
      costPaid: cost,
      costResult,
    };
  });
}

export function appliquerCoutInitiative(scene, cost, { triggerActivationScene }) {
  const slots = ordreCreneauxClassique(scene.participants || [], optionsTri(scene));
  const current = slots[indexCreneauActif(scene, slots)] || slots.find((slot) => !slot.actionSlotPlayed);
  if (!current) return { scene, nouveauRound: false };
  const threshold = normalizeInitiativeCostThreshold(scene.initiativeCostThreshold);
  const numericCost = cost == null ? null : Math.max(1, Math.floor(Number(cost) || 0));
  const currentInitiative = Number(current.initiative);
  const costMax = initiativeCostMaxForSlot(scene, current);
  const effectiveCost = numericCost != null && costMax != null ? (costMax > 0 ? Math.min(numericCost, costMax) : null) : numericCost;
  const costResult = effectiveCost == null || !Number.isFinite(currentInitiative) ? null : currentInitiative - effectiveCost;
  const createsSlot = effectiveCost != null && Number.isFinite(costResult) && costResult > threshold;

  const participants = (scene.participants || []).map((participant) => {
    if (participant.id !== current.id) return participant;
    const markedSlots = marquerCreneauCout(participant, current.actionSlotRawId, effectiveCost, costResult);
    const generatedSlot = createsSlot ? {
      id: `cost-${uid('slot')}`,
      initiative: costResult,
      order: markedSlots.length,
      generatedBy: INITIATIVE_COST_SLOT_KIND,
      sourceSlotId: current.actionSlotRawId,
    } : null;
    const actionSlots = generatedSlot ? [...markedSlots, generatedSlot] : markedSlots;
    const baseSlots = baseInitiativeSlots({ ...participant, actionSlots });
    return {
      ...participant,
      initiative: baseSlots[0]?.initiative ?? participant.initiative,
      actionSlots,
    };
  });

  const sceneAvecCout = { ...scene, participants };
  const prochain = slotsNonJoues(sceneAvecCout)[0] || null;
  if (!prochain) return { scene: { ...sceneAvecCout, activeId: '', activeSlotId: '' }, nouveauRound: true };

  const sceneActive = {
    ...sceneAvecCout,
    activeId: prochain.id,
    activeSlotId: prochain.actionSlotId,
  };
  return {
    scene: {
      ...sceneActive,
      participants: sceneActive.participants.map((participant) => triggerActivationScene(sceneActive, participant, prochain.id)),
    },
    nouveauRound: false,
  };
}

export function appliquerDebutNouveauRoundCout(scene) {
  const sceneNettoyee = nettoyerCreneauxCoutScene(scene);
  if (sceneNettoyee.phaseRerollEachRound) {
    const next = appliquerDebutNouveauRound({ ...sceneNettoyee, activeId: '', activeSlotId: '' }, '');
    return { ...next, activeId: '', activeSlotId: '' };
  }
  const premier = premierCreneauCoutEligible(sceneNettoyee);
  return appliquerDebutNouveauRound(sceneNettoyee, premier?.id || '');
}
