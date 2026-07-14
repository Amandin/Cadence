import { defaultCategoryOrder, legacyParticipantKinds, participantKinds } from '../constants.js';

export const participantCamps = Object.freeze({ PLAYER: 'player', ALLY: 'ally', OPPOSITION: 'opposition', NEUTRAL: 'neutral' });

const standardBehaviors = Object.freeze({
  PJ: { camp: participantCamps.PLAYER, initiativeEntry: 'character', suggestReserveWhenEmpty: false, highlightInFlexible: true },
  Compagnon: { camp: participantCamps.ALLY, initiativeEntry: 'character', suggestReserveWhenEmpty: true, highlightInFlexible: false },
  Allié: { camp: participantCamps.ALLY, initiativeEntry: 'character', suggestReserveWhenEmpty: true, highlightInFlexible: false },
  Élite: { camp: participantCamps.OPPOSITION, initiativeEntry: 'character', suggestReserveWhenEmpty: true, highlightInFlexible: false },
  Opposant: { camp: participantCamps.OPPOSITION, initiativeEntry: 'character', suggestReserveWhenEmpty: true, highlightInFlexible: false },
  Environnement: { camp: participantCamps.NEUTRAL, initiativeEntry: 'environment', suggestReserveWhenEmpty: true, highlightInFlexible: false },
});

export const standardParticipantTypes = Object.freeze(participantKinds.map((name) => Object.freeze({ name, behaviorType: name, standard: true })));

export function normalizeParticipantTypeName(value) {
  const name = String(value ?? '').trim();
  return legacyParticipantKinds[name] || name;
}

export function normalizeParticipantTypes(definitions, categoryOrder = defaultCategoryOrder) {
  const source = Array.isArray(definitions) ? definitions : [];
  const custom = new Map();
  source.forEach((definition) => {
    const name = normalizeParticipantTypeName(typeof definition === 'string' ? definition : definition?.name);
    if (!name || participantKinds.includes(name)) return;
    const behaviorType = normalizeParticipantTypeName(definition?.behaviorType || definition?.baseType);
    custom.set(name, { name, behaviorType: participantKinds.includes(behaviorType) ? behaviorType : 'Opposant', standard: false, overrides: definition?.overrides && typeof definition.overrides === 'object' ? definition.overrides : {} });
  });
  (Array.isArray(categoryOrder) ? categoryOrder : []).forEach((value) => {
    const name = normalizeParticipantTypeName(value);
    if (name && !participantKinds.includes(name) && !custom.has(name)) custom.set(name, { name, behaviorType: 'Opposant', standard: false, overrides: {} });
  });
  return [...standardParticipantTypes.map((item) => ({ ...item })), ...custom.values()];
}

export function resolveParticipantBehavior(kind, definitions = []) {
  const name = normalizeParticipantTypeName(kind) || 'Environnement';
  const definition = normalizeParticipantTypes(definitions, [name]).find((item) => item.name === name);
  const behaviorType = participantKinds.includes(definition?.behaviorType) ? definition.behaviorType : participantKinds.includes(name) ? name : 'Opposant';
  return { type: name, behaviorType, ...standardBehaviors[behaviorType], ...(definition?.overrides || {}) };
}

export function participantHasBehavior(participant, property, definitions = []) {
  return !!resolveParticipantBehavior(participant?.kind, definitions)[property];
}
