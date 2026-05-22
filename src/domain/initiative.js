import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder, equalityRules, initiativeOrders, legacyParticipantKinds } from '../constants.js';

function numberOr(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function valeurInitiative(participant) {
  return numberOr(participant?.initiative, 0);
}

export function valeurDepartage(participant) {
  return numberOr(participant?.departage ?? 0, 0);
}

function slotId(participantId, slot) {
  return `${participantId}:${slot.id}`;
}

export function normaliserCreneauxAction(participant = {}) {
  const fallback = valeurInitiative(participant);
  const rawSlots = Array.isArray(participant.actionSlots) ? participant.actionSlots : [];
  const slots = rawSlots
    .map((slot, index) => {
      const source = slot && typeof slot === 'object' ? slot : { initiative: slot };
      const initiative = numberOr(source.initiative, fallback);
      return {
        id: source.id ? String(source.id) : `slot-${index + 1}`,
        initiative,
        order: Number.isFinite(Number(source.order)) ? Number(source.order) : index,
      };
    })
    .filter((slot) => Number.isFinite(slot.initiative));

  const normalized = slots.length ? slots : [{ id: 'slot-1', initiative: fallback, order: 0 }];
  return normalized
    .sort((a, b) => b.initiative - a.initiative || a.order - b.order)
    .map((slot, index) => ({ id: slot.id || `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}

export function creneauxActionParticipant(participant = {}) {
  return normaliserCreneauxAction(participant).map((slot, index) => ({
    ...slot,
    index,
    participantId: participant.id,
    actionSlotId: slotId(participant.id, slot),
  }));
}

export function creneauxActionIdsParticipant(participant = {}) {
  return creneauxActionParticipant(participant).map((slot) => slot.actionSlotId);
}

export function initiativesActionParticipant(participant = {}) {
  return creneauxActionParticipant(participant).map((slot) => slot.initiative);
}

export function nombreCreneauxAction(participant = {}) {
  return creneauxActionParticipant(participant).length;
}

export function participantAvecCreneau(participant, slot) {
  const slots = creneauxActionParticipant(participant);
  return {
    ...participant,
    initiative: slot.initiative,
    actionSlotId: slot.actionSlotId,
    actionSlotIndex: slot.index,
    actionSlotCount: slots.length,
    actionSlotInitiatives: slots.map((item) => item.initiative),
  };
}

export function ordreCreneauxClassique(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  const equalityRule = options.equalityRule || defaultEqualityRule;
  const initiativeDirection = options.initiativeOrder === initiativeOrders.ASC ? 1 : -1;

  return participants
    .flatMap((participant) => creneauxActionParticipant(participant).map((slot) => ({ participant, slot })))
    .sort((a, b) => {
      const base = (a.slot.initiative - b.slot.initiative) * initiativeDirection
        || (valeurDepartage(a.participant) - valeurDepartage(b.participant)) * initiativeDirection;
      if (base) return base;

      if (equalityRule === equalityRules.LOOSE) return 0;

      const categorie = ordreCategorie(a.participant.kind, categoryOrder) - ordreCategorie(b.participant.kind, categoryOrder);
      if (categorie) return categorie;

      if (equalityRule === equalityRules.NEVER) return comparerNoms(a.participant, b.participant);
      return 0;
    })
    .map(({ participant, slot }) => participantAvecCreneau(participant, slot));
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
  };
}

// Mode Phases, type SR5 : chaque nouvelle phase utilise l’initiative de base
// diminuée d’un décrément fixe. On renvoie une valeur calculée, sans modifier
// le participant réel stocké dans la scène.
export function initiativeDePhase(participant, phase = 1, decrement = 10) {
  return valeurInitiative(participant) - Math.max(0, Number(phase || 1) - 1) * Math.max(1, Number(decrement) || 10);
}

export function participantActifEnPhase(participant, phase = 1, decrement = 10) {
  return initiativeDePhase(participant, phase, decrement) > 0;
}

// Les participants de phase sont des copies destinées à l’affichage et au calcul
// du tour actif : leur initiative est remplacée par l’initiative courante de
// phase, mais baseInitiative garde la valeur originale.
export function participantsPourPhase(participants = [], phase = 1, decrement = 10, options = {}) {
  return trierParInitiative(participants
    .filter((participant) => participantActifEnPhase(participant, phase, decrement))
    .map((participant) => ({ ...participant, initiative: initiativeDePhase(participant, phase, decrement), baseInitiative: valeurInitiative(participant) })), options);
}

export function participantsEnAttentePhase(participants = [], phase = 1, decrement = 10) {
  return participants.filter((participant) => !participantActifEnPhase(participant, phase, decrement));
}

export function phaseSuivanteExiste(participants = [], phase = 1, decrement = 10) {
  return participants.some((participant) => participantActifEnPhase(participant, phase + 1, decrement));
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

// Tri principal des participants en initiative.
// L’ordre alphabétique n’intervient qu’en règle NEVER : dans les autres modes,
// deux participants vraiment simultanés doivent conserver un groupe commun.
export function trierParInitiative(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  const equalityRule = options.equalityRule || defaultEqualityRule;
  const initiativeDirection = options.initiativeOrder === initiativeOrders.ASC ? 1 : -1;

  return [...participants].sort((a, b) => {
    const base = (valeurInitiative(a) - valeurInitiative(b)) * initiativeDirection
      || (valeurDepartage(a) - valeurDepartage(b)) * initiativeDirection;
    if (base) return base;

    if (equalityRule === equalityRules.LOOSE) return 0;

    const categorie = ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder);
    if (categorie) return categorie;

    if (equalityRule === equalityRules.NEVER) return comparerNoms(a, b);
    return 0;
  });
}

// La réserve est hors initiative : les initiatives y sont normalisées à 0.
// Son tri repose donc sur le rôle choisi par le MJ, puis le départage, puis le nom.
export function trierReserve(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;

  return [...participants].sort((a, b) => ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder)
    || valeurDepartage(b) - valeurDepartage(a)
    || comparerNoms(a, b));
}

// Clef utilisée pour savoir si plusieurs participants doivent être affichés
// comme un seul bloc simultané. Elle dépend volontairement de la règle d’égalité.
export function clefEgaliteParfaite(participant, options = {}) {
  const equalityRule = options.equalityRule || defaultEqualityRule;
  if (equalityRule === equalityRules.NEVER) return null;

  const initiative = valeurInitiative(participant);
  const departage = valeurDepartage(participant);
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

export function idsEgaliteParfaite(participants = [], options = {}) {
  return new Set(groupesEgaliteParfaite(participants, options).flatMap((groupe) => groupe.map((participant) => participant.id)));
}

export function groupeEgalitePourParticipant(participants = [], participantId, options = {}) {
  return groupesEgaliteParfaite(participants, options).find((groupe) => groupe.some((participant) => participant.id === participantId)) || [];
}

export function grouperParInitiative(participants = []) {
  return participants.reduce((groupes, participant) => {
    const initiative = valeurInitiative(participant);
    const groupe = groupes.find((item) => item.initiative === initiative);
    if (groupe) groupe.participants.push(participant);
    else groupes.push({ initiative, participants: [participant] });
    return groupes;
  }, []);
}

// Convertit une liste triée en blocs d’affichage : soit un participant seul,
// soit un groupe simultané. L’ordre original est conservé autant que possible.
export function grouperAffichageParticipants(participants = [], options = {}) {
  const groupesSimultanes = groupesEgaliteParfaite(participants, options);
  const groupeParId = new Map();

  groupesSimultanes.forEach((groupe, index) => {
    groupe.forEach((participant) => groupeParId.set(participant.id, { id: `sim-${index}`, participants: groupe }));
  });

  const vus = new Set();
  return participants.flatMap((participant) => {
    const groupe = groupeParId.get(participant.id);
    if (!groupe) return [{ id: participant.id, simultaneous: false, participants: [participant] }];
    if (vus.has(groupe.id)) return [];
    vus.add(groupe.id);
    return [{ ...groupe, simultaneous: true }];
  });
}
