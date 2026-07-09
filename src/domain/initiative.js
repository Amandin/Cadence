import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder, equalityRules, initiativeOrders, legacyParticipantKinds } from '../constants.js';
import { initiativeToNumber } from './initiativeTextOrder.js';

function numberOr(value, fallback = 0, options = {}) {
  return initiativeToNumber(value, options.initiativeTextOrder, fallback);
}

export function valeurInitiative(participant, options = {}) {
  return numberOr(participant?.initiative, 0, options);
}

export function valeurDepartage(participant) {
  const next = Number(participant?.departage ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function valeurDepartagePourTri(participant, options = {}) {
  return options.tiebreakerVisible === false ? 0 : valeurDepartage(participant);
}

function slotId(participantId, slot) {
  return `${participantId}:${slot.id}`;
}

export function normaliserCreneauxAction(participant = {}, options = {}) {
  const fallback = participant?.initiative ?? 0;
  const rawSlots = Array.isArray(participant.actionSlots) ? participant.actionSlots : [];
  const slotsAutorises = options.multipleActionSlots === false ? rawSlots.slice(0, 1) : rawSlots;
  const slots = slotsAutorises
    .map((slot, index) => {
      const source = slot && typeof slot === 'object' ? slot : { initiative: slot };
      const initiative = source.initiative ?? fallback;
      return {
        id: source.id ? String(source.id) : `slot-${index + 1}`,
        initiative,
        sortValue: numberOr(initiative, numberOr(fallback, 0, options), options),
        order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
        played: !!source.played,
        costPaid: source.costPaid,
        costResult: source.costResult,
        generatedBy: source.generatedBy,
        sourceSlotId: source.sourceSlotId ? String(source.sourceSlotId) : '',
      };
    })
    .filter((slot) => Number.isFinite(slot.sortValue));

  const normalized = slots.length ? slots : [{ id: 'slot-1', initiative: fallback, sortValue: numberOr(fallback, 0, options), order: 0 }];
  return normalized
    .sort((a, b) => b.sortValue - a.sortValue || a.order - b.order)
    .map((slot, index) => ({ id: slot.id || `slot-${index + 1}`, initiative: slot.initiative, order: index, sortValue: slot.sortValue, played: !!slot.played, costPaid: slot.costPaid, costResult: slot.costResult, generatedBy: slot.generatedBy, sourceSlotId: slot.sourceSlotId || '' }));
}

export function creneauxActionParticipant(participant = {}, options = {}) {
  return normaliserCreneauxAction(participant, options).map((slot, index) => ({
    ...slot,
    index,
    participantId: participant.id,
    actionSlotId: slotId(participant.id, slot),
  }));
}

export function creneauxActionIdsParticipant(participant = {}) {
  return creneauxActionParticipant(participant).map((slot) => slot.actionSlotId);
}

export function initiativesActionParticipant(participant = {}, options = {}) {
  return creneauxActionParticipant(participant, options).map((slot) => slot.initiative);
}

export function nombreCreneauxAction(participant = {}) {
  return creneauxActionParticipant(participant).length;
}

export function participantAvecCreneau(participant, slot, options = {}) {
  const slots = creneauxActionParticipant(participant, options);
  return {
    ...participant,
    initiative: slot.initiative,
    initiativeSortValue: slot.sortValue,
    actionSlotId: slot.actionSlotId,
    actionSlotRawId: slot.id,
    actionSlotIndex: slot.index,
    actionSlotCount: slots.length,
    actionSlotInitiatives: slots.map((item) => item.initiative),
    actionSlotPlayed: !!slot.played,
    actionSlotCostPaid: slot.costPaid,
    actionSlotCostResult: slot.costResult,
    actionSlotGeneratedBy: slot.generatedBy,
    actionSlotSourceId: slot.sourceSlotId || '',
  };
}

export function ordreCreneauxClassique(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  const equalityRule = options.equalityRule || defaultEqualityRule;
  const initiativeDirection = options.initiativeOrder === initiativeOrders.ASC ? 1 : -1;

  return participants
    .flatMap((participant) => creneauxActionParticipant(participant, options).map((slot) => ({ participant, slot })))
    .sort((a, b) => {
      if (options.initiativeEnabled === false) {
        return ordreCategorie(a.participant.kind, categoryOrder) - ordreCategorie(b.participant.kind, categoryOrder)
          || comparerNoms(a.participant, b.participant);
      }
      const base = (a.slot.sortValue - b.slot.sortValue) * initiativeDirection
        || (valeurDepartagePourTri(a.participant, options) - valeurDepartagePourTri(b.participant, options)) * initiativeDirection;
      if (base) return base;

      if (equalityRule === equalityRules.LOOSE) return 0;

      const categorie = ordreCategorie(a.participant.kind, categoryOrder) - ordreCategorie(b.participant.kind, categoryOrder);
      if (categorie) return categorie;

      if (equalityRule === equalityRules.NEVER) return comparerNoms(a.participant, b.participant);
      return 0;
    })
    .map(({ participant, slot }) => participantAvecCreneau(participant, slot, options));
}

export function premierCreneauClassique(participants = [], options = {}) {
  return ordreCreneauxClassique(participants, options)[0] || null;
}

export function indexCreneauActif(scene, slots = ordreCreneauxClassique(scene?.participants || [], optionsTriSafe(scene))) {
  if (!slots.length) return -1;
  const bySlot = scene?.activeSlotId ? slots.findIndex((slot) => slot.actionSlotId === scene.activeSlotId) : -1;
  if (bySlot >= 0) return bySlot;
  const byParticipant = slots.findIndex((slot) => slot.id === scene?.activeId);
  return byParticipant >= 0 ? byParticipant : 0;
}

function optionsTriSafe(scene = {}) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
  };
}

export function initiativeDePhase(participant, phase = 1, decrement = 10, options = {}) {
  const basePhase = Math.max(1, Number(participant?.phaseAdjustedAt || 1));
  return valeurInitiative(participant, options) - Math.max(0, Number(phase || 1) - basePhase) * Math.max(1, Number(decrement) || 10);
}

export function participantActifEnPhase(participant, phase = 1, decrement = 10, options = {}) {
  return initiativeDePhase(participant, phase, decrement, options) > 0;
}

export function participantsPourPhase(participants = [], phase = 1, decrement = 10, options = {}) {
  return trierParInitiative(participants
    .filter((participant) => participantActifEnPhase(participant, phase, decrement, options))
    .map((participant) => ({ ...participant, initiative: initiativeDePhase(participant, phase, decrement, options), baseInitiative: valeurInitiative(participant, options) })), options);
}

export function participantsEnAttentePhase(participants = [], phase = 1, decrement = 10, options = {}) {
  return participants.filter((participant) => !participantActifEnPhase(participant, phase, decrement, options));
}

export function phaseSuivanteExiste(participants = [], phase = 1, decrement = 10, options = {}) {
  return participants.some((participant) => participantActifEnPhase(participant, phase + 1, decrement, options));
}

export function normaliserCategorie(kind) {
  return legacyParticipantKinds[kind] || kind || 'Environnement';
}

export function ordreCategorie(kind, categoryOrder = defaultCategoryOrder) {
  const index = categoryOrder.indexOf(normaliserCategorie(kind));
  return index >= 0 ? index : categoryOrder.length;
}

function nomParticipant(participant) {
  return participant?.name || '';
}

function comparerNoms(a, b) {
  return nomParticipant(a).localeCompare(nomParticipant(b), 'fr', { sensitivity: 'base' });
}

export function trierParInitiative(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  const equalityRule = options.equalityRule || defaultEqualityRule;
  const initiativeDirection = options.initiativeOrder === initiativeOrders.ASC ? 1 : -1;

  return [...participants].sort((a, b) => {
    if (options.initiativeEnabled === false) {
      return ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder)
        || comparerNoms(a, b);
    }
    const base = (valeurInitiative(a, options) - valeurInitiative(b, options)) * initiativeDirection
      || (valeurDepartagePourTri(a, options) - valeurDepartagePourTri(b, options)) * initiativeDirection;
    if (base) return base;

    if (equalityRule === equalityRules.LOOSE) return 0;

    const categorie = ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder);
    if (categorie) return categorie;

    if (equalityRule === equalityRules.NEVER) return comparerNoms(a, b);
    return 0;
  });
}

export function trierReserve(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;

  return [...participants].sort((a, b) => ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder)
    || valeurDepartagePourTri(b, options) - valeurDepartagePourTri(a, options)
    || comparerNoms(a, b));
}

export function clefEgaliteParfaite(participant, options = {}) {
  const equalityRule = options.equalityRule || defaultEqualityRule;
  if (equalityRule === equalityRules.NEVER) return null;

  const initiative = valeurInitiative(participant, options);
  const departage = valeurDepartagePourTri(participant, options);
  if (equalityRule === equalityRules.LOOSE) return `${initiative}|${departage}`;

  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  return `${initiative}|${departage}|${ordreCategorie(participant.kind, categoryOrder)}`;
}

export function groupesEgaliteParfaite(participants = [], options = {}) {
  const groupes = new Map();

  participants.forEach((participant) => {
    const clef = clefEgaliteParfaite(participant, options);
    if (!clef) return;
    const groupe = groupes.get(clef) || [];
    groupe.push(participant);
    groupes.set(clef, groupe);
  });

  return [...groupes.values()].filter((groupe) => groupe.length > 1);
}

export function groupeEgalitePourParticipant(participants = [], participantId, options = {}) {
  return groupesEgaliteParfaite(participants, options).find((groupe) => groupe.some((participant) => participant.id === participantId)) || [];
}

export function grouperParInitiative(participants = [], options = {}) {
  return participants.reduce((groupes, participant) => {
    const initiative = valeurInitiative(participant, options);
    const groupe = groupes.find((item) => item.initiative === initiative);
    if (groupe) groupe.participants.push(participant);
    else groupes.push({ initiative, participants: [participant] });
    return groupes;
  }, []);
}

function clefAffichageParticipant(participant = {}) {
  return participant.actionSlotId || participant.id;
}

export function grouperAffichageParticipants(participants = [], options = {}) {
  const groupesSimultanes = groupesEgaliteParfaite(participants, options);
  const groupeParId = new Map();

  groupesSimultanes.forEach((groupe, index) => {
    const idGroupe = `sim-${index}-${groupe.map(clefAffichageParticipant).join('-')}`;
    groupe.forEach((participant) => groupeParId.set(clefAffichageParticipant(participant), { id: idGroupe, participants: groupe }));
  });

  const vus = new Set();
  return participants.flatMap((participant) => {
    const clef = clefAffichageParticipant(participant);
    const groupe = groupeParId.get(clef);
    if (!groupe) return [{ id: clef, simultaneous: false, participants: [participant] }];
    if (vus.has(groupe.id)) return [];
    vus.add(groupe.id);
    return [{ ...groupe, simultaneous: true }];
  });
}
