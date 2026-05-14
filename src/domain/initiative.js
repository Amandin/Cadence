import { defaultCategoryOrder, defaultEqualityRule, equalityRules, legacyParticipantKinds } from '../constants.js';

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

export function initiativeDePhase(participant, phase = 1, decrement = 10) {
  return valeurInitiative(participant) - Math.max(0, Number(phase || 1) - 1) * Math.max(1, Number(decrement) || 10);
}

export function participantActifEnPhase(participant, phase = 1, decrement = 10) {
  return initiativeDePhase(participant, phase, decrement) > 0;
}

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

export function trierParInitiative(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;
  const equalityRule = options.equalityRule || defaultEqualityRule;

  return [...participants].sort((a, b) => {
    const base = valeurInitiative(b) - valeurInitiative(a)
      || valeurDepartage(b) - valeurDepartage(a);
    if (base) return base;

    if (equalityRule === equalityRules.LOOSE) return 0;

    const categorie = ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder);
    if (categorie) return categorie;

    if (equalityRule === equalityRules.NEVER) return nomParticipant(a).localeCompare(nomParticipant(b));
    return 0;
  });
}

export function trierReserve(participants = [], options = {}) {
  const categoryOrder = options.categoryOrder || defaultCategoryOrder;

  return [...participants].sort((a, b) => valeurInitiative(b) - valeurInitiative(a)
    || valeurDepartage(b) - valeurDepartage(a)
    || ordreCategorie(a.kind, categoryOrder) - ordreCategorie(b.kind, categoryOrder)
    || nomParticipant(a).localeCompare(nomParticipant(b), 'fr', { sensitivity: 'base' }));
}

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
