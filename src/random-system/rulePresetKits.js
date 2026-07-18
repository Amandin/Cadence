import { normalizeCampaignRules } from '../domain/campaignRules.js';
import { rulePresetCatalog } from '../rulePresets.js';
import { normalizeRandomDefinition, normalizeRandomSource, randomSourceKinds } from './engine.js';
import { resetCardSource } from './cardSources.js';
import { createStandardSources } from './defaults.js';
import {
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
} from './rulePresetKitCatalog.js';
export { randomKitInitiativeModes, randomKitApplicationPolicies, randomKitFamilyTags, standardCardSourceIds, randomKitCatalog } from './rulePresetKitCatalog.js';

const kitsById = new Map(randomKitCatalog.map((kit) => [kit.id, kit]));

function cleanText(value, fallback = '') {
  const text = String(value || '').trim();
  return text || fallback;
}

function cleanId(value, fallback = 'random-kit') {
  return cleanText(value, fallback).replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || fallback;
}

function uniqueValues(values) {
  return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function cleanPresetId(value) {
  if (value && typeof value === 'object') {
    return cleanPresetId(value.catalogId || value.presetId || value.id);
  }
  return String(value || '').replace(/^catalog:/, '').trim();
}

function rulesKey(rules) {
  return JSON.stringify(normalizeCampaignRules(rules || {}));
}

function dedupeKits(kits) {
  const seen = new Set();
  return kits.filter((kit) => {
    if (!kit || seen.has(kit.id)) return false;
    seen.add(kit.id);
    return true;
  });
}

export function normalizeRandomKit(source = {}, index = 0) {
  const definitions = (Array.isArray(source.definitions) ? source.definitions : [])
    .map(normalizeRandomDefinition);
  const sources = (Array.isArray(source.sources) ? source.sources : [])
    .map(normalizeRandomSource);
  const initiativeSourceId = cleanText(source.initiative?.defaultSourceId);
  const initiativeDefinitionId = cleanText(source.initiative?.defaultDefinitionId);
  const mode = Object.values(randomKitInitiativeModes).includes(source.initiative?.mode)
    ? source.initiative.mode
    : initiativeSourceId
      ? randomKitInitiativeModes.CARDS
      : initiativeDefinitionId
        ? randomKitInitiativeModes.NUMERIC
        : randomKitInitiativeModes.MANUAL;
  const applicationPolicy = Object.values(randomKitApplicationPolicies).includes(source.applicationPolicy)
    ? source.applicationPolicy
    : randomKitApplicationPolicies.ASK;
  return {
    id: cleanId(source.id, `custom-random-kit-${index + 1}`),
    label: cleanText(source.label || source.name, `Kit ${index + 1}`),
    description: cleanText(source.description),
    familyTags: uniqueValues(Array.isArray(source.familyTags) ? source.familyTags : []),
    presetIds: uniqueValues(Array.isArray(source.presetIds) ? source.presetIds.map(cleanPresetId) : []),
    sourceIds: uniqueValues([
      ...(Array.isArray(source.sourceIds) ? source.sourceIds : []),
      ...sources.map((item) => item.id),
      initiativeSourceId,
    ]),
    sources,
    definitions,
    initiative: {
      mode,
      defaultDefinitionId: initiativeDefinitionId || null,
      defaultSourceId: initiativeSourceId || null,
      defaultCardCount: Math.max(0, Number(source.initiative?.defaultCardCount) || 0),
      tiebreaker: cleanText(source.initiative?.tiebreaker, 'manual'),
      order: cleanText(source.initiative?.order, 'desc'),
    },
    applicationPolicy,
  };
}

export function normalizeRandomKits(kits = []) {
  return (Array.isArray(kits) ? kits : []).map(normalizeRandomKit);
}

function customKitsById(customKits = []) {
  return new Map(normalizeRandomKits(customKits).map((kit) => [kit.id, kit]));
}

function kitInitiativeRoll(kit) {
  return {
    id: `${kit.id}:initiative`,
    kitId: kit.id,
    kitLabel: kit.label,
    definitionId: kit.initiative.defaultDefinitionId,
    sourceId: kit.initiative.defaultSourceId || null,
    cardCount: kit.initiative.defaultCardCount || 0,
    label: kit.initiative.defaultDefinitionId
      ? kit.definitions.find((definition) => definition.id === kit.initiative.defaultDefinitionId)?.name || kit.label
      : kit.initiative.defaultSourceId
        ? kit.label
        : kit.label,
    mode: kit.initiative.mode,
    tiebreaker: kit.initiative.tiebreaker,
    applicationPolicy: kit.applicationPolicy,
  };
}

function initiativeModeForRules(campaignRules = {}) {
  const rules = normalizeCampaignRules(campaignRules);
  if (rules.temporalite === 'souple' && rules.flexibleUseInitiative === false) {
    return randomKitInitiativeModes.NONE;
  }
  if (rules.initiativeTextOrder?.preset === 'cards' || rules.initiativeTextOrder?.cardSourceId) return randomKitInitiativeModes.CARDS;
  if (rules.initiativeTextOrder?.enabled || rules.initiativeValueType === 'label') {
    return randomKitInitiativeModes.LABEL_ORDER;
  }
  return randomKitInitiativeModes.NUMERIC;
}

function kitsForRules(campaignRules = {}, customKits = []) {
  const key = rulesKey(campaignRules);
  const presetMatches = rulePresetCatalog.filter((preset) => rulesKey(preset.rules) === key);
  return dedupeKits([
    ...presetMatches.map((preset) => getRandomKitForRuleset(preset.catalogId, customKits)),
    ...normalizeRandomKits(customKits).filter((kit) => (
      presetMatches.some((preset) => kit.presetIds.includes(preset.catalogId))
    )),
  ]);
}

export function getRandomKitForRuleset(rulesetPresetId, customKits = []) {
  const presetId = cleanPresetId(rulesetPresetId);
  const custom = customKitsById(customKits);
  if (custom.has(presetId)) return custom.get(presetId);
  if (kitsById.has(presetId)) return kitsById.get(presetId);
  return randomKitCatalog.find((kit) => kit.presetIds.includes(presetId))
    || [...custom.values()].find((kit) => kit.presetIds.includes(presetId))
    || null;
}

export function getAvailableInitiativeRolls(campaignRules = {}, customKits = []) {
  const mode = initiativeModeForRules(campaignRules);
  const allKits = [...randomKitCatalog, ...normalizeRandomKits(customKits)];
  const matchingKits = kitsForRules(campaignRules, customKits);
  const compatibleKits = allKits.filter((kit) => {
    if (mode === randomKitInitiativeModes.NONE) {
      return [
        randomKitInitiativeModes.NONE,
        randomKitInitiativeModes.MANUAL,
        randomKitInitiativeModes.RANDOM_ORDER,
      ].includes(kit.initiative.mode);
    }
    return kit.initiative.mode === mode;
  });
  return dedupeKits([...matchingKits, ...compatibleKits]).map(kitInitiativeRoll);
}

export function getDefaultInitiativeRoll(campaignRules = {}, customKits = []) {
  const [first] = getAvailableInitiativeRolls(campaignRules, customKits);
  return first || null;
}

function randomKitByReference(kitOrId, customKits = []) {
  const custom = customKitsById(customKits);
  if (typeof kitOrId === 'string') return kitsById.get(kitOrId) || custom.get(kitOrId) || getRandomKitForRuleset(kitOrId, customKits);
  if (kitOrId?.id && kitsById.has(kitOrId.id)) return kitsById.get(kitOrId.id);
  if (kitOrId?.id && custom.has(kitOrId.id)) return custom.get(kitOrId.id);
  return kitOrId?.id ? normalizeRandomKit(kitOrId) : null;
}

export function randomKitResources(kitOrId, customKits = []) {
  const kit = randomKitByReference(kitOrId, customKits);
  if (!kit) return { kit: null, sources: [], definitions: [] };
  const standardSourcesById = new Map(createStandardSources().map((source) => [source.id, source]));
  const sourcesById = new Map();
  kit.sourceIds.forEach((sourceId) => {
    const source = standardSourcesById.get(sourceId);
    if (source) sourcesById.set(source.id, source);
  });
  kit.sources.forEach((source) => sourcesById.set(source.id, source));
  return {
    kit,
    sources: [...sourcesById.values()].map(normalizeRandomSource),
    definitions: kit.definitions.map(normalizeRandomDefinition),
  };
}

export function randomKitIsLoaded(state, kitOrId) {
  const { kit, sources, definitions } = randomKitResources(kitOrId, state?.randomKits);
  if (!kit) return false;
  const currentSources = Array.isArray(state?.sources) ? state.sources : [];
  const currentDefinitions = Array.isArray(state?.definitions) ? state.definitions : [];
  const sourceIds = new Set(currentSources.map((source) => source.id));
  const definitionIds = new Set(currentDefinitions.map((definition) => definition.id));
  return sources.every((source) => sourceIds.has(source.id))
    && definitions.every((definition) => definitionIds.has(definition.id));
}

export function randomKitIsStrictlyActive(state, kitOrId) {
  const { kit, definitions } = randomKitResources(kitOrId, state?.randomKits);
  if (!kit || !randomKitIsLoaded(state, kit)) return false;
  const kitDefinitionIds = new Set(definitions
    .filter((definition) => definition.exposed !== false)
    .map((definition) => definition.id));
  const activeDefinitionIds = new Set((Array.isArray(state?.definitions) ? state.definitions : [])
    .filter((definition) => definition.exposed !== false && definition.active !== false)
    .map((definition) => definition.id));
  return kitDefinitionIds.size === activeDefinitionIds.size
    && [...kitDefinitionIds].every((definitionId) => activeDefinitionIds.has(definitionId));
}

export function loadRandomKitInState(state, kitOrId) {
  const { kit, sources, definitions } = randomKitResources(kitOrId, state?.randomKits);
  if (!kit) return state;
  const currentSources = Array.isArray(state?.sources) ? state.sources : [];
  const currentDefinitions = Array.isArray(state?.definitions) ? state.definitions : [];
  const sourceIds = new Set(currentSources.map((source) => source.id));
  const definitionIds = new Set(currentDefinitions.map((definition) => definition.id));
  const addedSources = sources.filter((source) => !sourceIds.has(source.id));
  const addedDefinitions = definitions.filter((definition) => !definitionIds.has(definition.id));
  const sourceStates = { ...(state?.sourceStates || {}) };
  addedSources.forEach((source) => {
    if (source.kind === randomSourceKinds.CARDS && !sourceStates[source.id]) {
      sourceStates[source.id] = resetCardSource(source);
    }
  });
  return {
    ...state,
    sources: [...currentSources, ...addedSources],
    definitions: [
      ...currentDefinitions,
      ...addedDefinitions.map((definition) => ({ ...definition, active: false })),
    ],
    sourceStates,
  };
}

export function activateRandomKitInState(state, kitOrId) {
  const loaded = loadRandomKitInState(state, kitOrId);
  const { kit, definitions } = randomKitResources(kitOrId, loaded?.randomKits);
  if (!kit) return state;
  const activeDefinitionIds = new Set(definitions
    .filter((definition) => definition.exposed !== false)
    .map((definition) => definition.id));
  return {
    ...loaded,
    definitions: loaded.definitions.map((definition) => (
      definition.exposed === false
        ? definition
        : { ...definition, active: activeDefinitionIds.has(definition.id) }
    )),
  };
}

export function ensureRandomKitInState(state, kitOrId) {
  const loaded = loadRandomKitInState(state, kitOrId);
  const { kit, definitions } = randomKitResources(kitOrId, loaded?.randomKits);
  if (!kit) return state;
  const activatedDefinitionIds = new Set(definitions
    .filter((definition) => definition.exposed !== false)
    .map((definition) => definition.id));
  return {
    ...loaded,
    definitions: loaded.definitions.map((definition) => (
      activatedDefinitionIds.has(definition.id)
        ? { ...definition, active: true }
        : definition
    )),
  };
}

export function enableRandomKitDefinitionsInState(state, kitOrId, definitionIds = []) {
  const loaded = loadRandomKitInState(state, kitOrId);
  const { kit, definitions } = randomKitResources(kitOrId, loaded?.randomKits);
  if (!kit) return state;
  const availableDefinitionIds = new Set(definitions
    .filter((definition) => definition.exposed !== false)
    .map((definition) => definition.id));
  const requestedDefinitionIds = new Set((Array.isArray(definitionIds) ? definitionIds : [])
    .filter((definitionId) => availableDefinitionIds.has(definitionId)));
  const activeDefinitionIds = requestedDefinitionIds.size ? requestedDefinitionIds : availableDefinitionIds;
  return {
    ...loaded,
    definitions: loaded.definitions.map((definition) => (
      activeDefinitionIds.has(definition.id)
        ? { ...definition, active: true }
        : definition
    )),
  };
}

export function saveRandomKitToState(state, kit) {
  const normalized = normalizeRandomKit(kit, state?.randomKits?.length || 0);
  return {
    ...state,
    randomKits: [
      normalized,
      ...(Array.isArray(state?.randomKits) ? state.randomKits : []).filter((item) => item.id !== normalized.id),
    ],
  };
}

export function deleteRandomKitFromState(state, kitId) {
  const id = cleanId(kitId, '');
  return {
    ...state,
    randomKits: (Array.isArray(state?.randomKits) ? state.randomKits : []).filter((kit) => kit.id !== id),
  };
}
