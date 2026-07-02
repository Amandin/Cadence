import { normalizeCampaignRules } from '../domain/campaignRules.js';
import { rulePresetCatalog } from '../rulePresets.js';
import {
  fixedValue,
  parameterValue,
  randomAggregateOperations,
  randomChoiceControlKinds,
  randomSourceKinds,
  normalizeRandomDefinition,
  normalizeRandomSource,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';
import { createWeightedSource } from './core/sources.js';
import { resetCardSource } from './cardSources.js';
import { createStandardSources, standardSourceIds } from './defaults.js';

export const randomKitInitiativeModes = {
  NUMERIC: 'numeric',
  RANDOM_ORDER: 'random-order',
  CARDS: 'cards',
  LABEL_ORDER: 'label-order',
  MANUAL: 'manual',
  NONE: 'none',
};

export const randomKitApplicationPolicies = {
  FILL_EMPTY: 'fill-empty',
  REPLACE_ALL: 'replace-all',
  ASK: 'ask',
  MANUAL_ONLY: 'manual-only',
};

export const randomKitFamilyTags = {
  D20_GENERIC: 'd20-generic',
  D100_PERCENTILE: 'd100-percentile',
  D6_POOL: 'pool-d6',
  D10_POOL: 'pool-d10',
  TWO_D6_MOD: '2d6-mod',
  STEP_DICE: 'step-dice',
  EXPLODING_DICE: 'exploding-dice',
  CARDS: 'cards',
  RANDOM_ORDER: 'random-order',
};

export const standardCardSourceIds = {
  STANDARD_54: 'standard-54-cards',
};

const cosmereSpeedSourceId = 'kit-cosmere-speed';

function integerParameter(id, label, defaultValue, min = -999, max = 999) {
  return {
    id,
    label,
    type: randomParameterTypes.INTEGER,
    defaultValue,
    min,
    max,
  };
}

function sourceParameter(id, label, defaultValue) {
  return {
    id,
    label,
    type: randomParameterTypes.SOURCE,
    defaultValue,
  };
}

function totalStep(outputId = 'total', label = 'Total') {
  return {
    id: outputId,
    type: randomPipelineStepTypes.AGGREGATE,
    operation: randomAggregateOperations.SUM,
    outputId,
    label,
  };
}

function modifierStep(targetAggregateId = 'total') {
  return {
    id: 'modifier',
    type: randomPipelineStepTypes.MODIFIER,
    targetAggregateId,
    value: parameterValue('modifier'),
    label: 'Modificateur',
  };
}

function valueStep(outputId = 'result', label = 'Resultat') {
  return {
    id: outputId,
    type: randomPipelineStepTypes.AGGREGATE,
    operation: randomAggregateOperations.VALUES,
    outputId,
    label,
  };
}

function d20RollDefinition(id, name) {
  return {
    id,
    name,
    parameters: [integerParameter('modifier', 'Modificateur', 0)],
    options: [{
      id: 'mode',
      label: 'Mode',
      type: randomOptionTypes.CHOICE,
      control: randomChoiceControlKinds.SLIDER,
      defaultValue: 'normal',
      choices: [
        { value: 'disadvantage', label: 'Désavantage' },
        { value: 'normal', label: 'Normal' },
        { value: 'advantage', label: 'Avantage' },
      ],
    }],
    components: [{
      id: 'd20',
      label: 'd20',
      source: fixedValue(standardSourceIds.D20),
      count: fixedValue(1),
    }],
    pipeline: [
      {
        id: 'mode',
        type: randomPipelineStepTypes.REPEAT_SELECT,
        optionId: 'mode',
        variants: {
          normal: { repetitions: 1, select: 'first', aggregateId: 'total' },
          advantage: { repetitions: 2, select: 'highest', aggregateId: 'total' },
          disadvantage: { repetitions: 2, select: 'lowest', aggregateId: 'total' },
        },
      },
      totalStep(),
      modifierStep(),
    ],
    primaryAggregateId: 'total',
  };
}

function singleDieTotalDefinition(id, name, sourceId) {
  return {
    id,
    name,
    parameters: [integerParameter('modifier', 'Modificateur', 0)],
    components: [{
      id: 'die',
      label: 'De',
      source: fixedValue(sourceId),
      count: fixedValue(1),
    }],
    pipeline: [totalStep(), modifierStep()],
    primaryAggregateId: 'total',
  };
}

function singleDieDefinition(id, name, sourceId) {
  return {
    id,
    name,
    components: [{
      id: 'die',
      label: '',
      source: fixedValue(sourceId),
      count: fixedValue(1),
    }],
    pipeline: [totalStep()],
    primaryAggregateId: 'total',
  };
}

function dicePoolTotalDefinition(id, name, defaultSourceId) {
  return {
    id,
    name,
    parameters: [
      sourceParameter('die', 'De', defaultSourceId),
      integerParameter('count', 'Nombre de des', 1, 1, 1000),
      integerParameter('modifier', 'Modificateur', 0),
    ],
    components: [{
      id: 'dice',
      label: 'Des',
      source: parameterValue('die'),
      count: parameterValue('count'),
    }],
    pipeline: [totalStep(), modifierStep()],
    primaryAggregateId: 'total',
  };
}

function poolSuccessDefinition(id, name, sourceId, thresholdDefault) {
  return {
    id,
    name,
    parameters: [
      integerParameter('count', 'Nombre de des', 5, 1, 1000),
      integerParameter('threshold', 'Seuil', thresholdDefault, -999, 999),
    ],
    options: [{
      id: 'exploding',
      label: 'Explosion',
      type: randomOptionTypes.BOOLEAN,
      defaultValue: false,
    }],
    components: [{
      id: 'pool',
      label: 'Pool',
      source: fixedValue(sourceId),
      count: parameterValue('count'),
    }],
    pipeline: [
      {
        id: 'explosion',
        type: randomPipelineStepTypes.EXPLODE,
        condition: { type: 'source-extreme', extreme: 'max' },
        maxIterations: 20,
        enabledWhen: { optionId: 'exploding', equals: true },
      },
      {
        id: 'success-threshold',
        type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
        condition: { type: 'compare', operator: 'gte', value: parameterValue('threshold') },
      },
      {
        id: 'successes',
        type: randomPipelineStepTypes.AGGREGATE,
        operation: randomAggregateOperations.COUNT_SUCCESSES,
        outputId: 'successes',
        label: 'Succes',
      },
    ],
    primaryAggregateId: 'successes',
  };
}

function createCosmereSpeedSource() {
  return createWeightedSource({
    id: cosmereSpeedSourceId,
    name: 'Cosmere - vitesse',
    outcomes: [
      { id: 'rapide', value: 'Rapide', label: 'Rapide', weight: 1 },
      { id: 'lent', value: 'Lent', label: 'Lent', weight: 1 },
    ],
  });
}

const d20PresetIds = [
  'generiques/classique',
  'generiques/declaration-puis-resolution',
  'generiques/initiative-a-cout',
  'generiques/initiative-souple-ordonnee',
  'generiques/phases-cochees',
  'generiques/phases-par-initiative',
  'systemes/d20-boss-mythique',
  'systemes/d20-tactique-dd-pathfinder',
];

export const randomKitCatalog = [
  {
    id: 'kit-d20-generic',
    label: 'd20 generique',
    description: 'Ajoute un jet d20 avec avantage ou desavantage, un d20 simple et un tirage de des multiples pour les degats, armes et sorts.',
    familyTags: [randomKitFamilyTags.D20_GENERIC],
    presetIds: d20PresetIds,
    sourceIds: [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
      standardSourceIds.D20,
    ],
    sources: [],
    definitions: [
      d20RollDefinition('kit-d20-check', 'Jet d20'),
      dicePoolTotalDefinition('kit-d20-damage', 'Degats / des multiples', standardSourceIds.D6),
      singleDieDefinition('kit-d20-initiative', 'd20 simple', standardSourceIds.D20),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NUMERIC,
      defaultDefinitionId: 'kit-d20-initiative',
      tiebreaker: 'modifier-or-manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.FILL_EMPTY,
  },
  {
    id: 'kit-d100-percentile',
    label: 'd100 / percentile',
    description: 'Ajoute un jet percentile contre un seuil et un ordre au d100 pour les jeux bases sur les pourcentages.',
    familyTags: [randomKitFamilyTags.D100_PERCENTILE],
    presetIds: ['systemes/appel-de-cthulhu-7e'],
    sourceIds: [standardSourceIds.D100],
    sources: [],
    definitions: [
      {
        id: 'kit-d100-check',
        name: 'Jet percentile',
        parameters: [integerParameter('target', 'Seuil', 50, 1, 100)],
        components: [{
          id: 'd100',
          label: 'd100',
          source: fixedValue(standardSourceIds.D100),
          count: fixedValue(1),
        }],
        pipeline: [
          {
            id: 'success-threshold',
            type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
            condition: { type: 'compare', operator: 'lte', value: parameterValue('target') },
          },
          totalStep('roll', 'Resultat'),
        ],
        primaryAggregateId: 'roll',
      },
      singleDieTotalDefinition('kit-d100-initiative', 'Ordre d100', standardSourceIds.D100),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NUMERIC,
      defaultDefinitionId: 'kit-d100-initiative',
      tiebreaker: 'manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-d6-pool',
    label: 'Pool de d6',
    description: 'Ajoute un pool de d6 a succes, avec seuil configurable, explosion optionnelle et une initiative simple au d6.',
    familyTags: [randomKitFamilyTags.D6_POOL],
    presetIds: ['systemes/shadowrun-5'],
    sourceIds: [standardSourceIds.D6],
    sources: [],
    definitions: [
      poolSuccessDefinition('kit-d6-pool-successes', 'Pool de d6', standardSourceIds.D6, 5),
      singleDieTotalDefinition('kit-shadowrun-initiative', 'Initiative Shadowrun', standardSourceIds.D6),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NUMERIC,
      defaultDefinitionId: 'kit-shadowrun-initiative',
      tiebreaker: 'manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-narrative-no-initiative',
    label: 'Narratif sans initiative',
    description: 'Ajoute les tirages narratifs courants, dont 2d6 + modificateur et pool de d10, sans initiative chiffree par defaut.',
    familyTags: [randomKitFamilyTags.TWO_D6_MOD, randomKitFamilyTags.D10_POOL],
    presetIds: [
      'generiques/initiative-souple-sans-initiative',
      'systemes/narratif-sans-initiative-pbta-vtm',
    ],
    sourceIds: [standardSourceIds.D6, standardSourceIds.D10],
    sources: [],
    definitions: [
      {
        id: 'kit-2d6-mod',
        name: '2d6 + modificateur',
        parameters: [integerParameter('modifier', 'Modificateur', 0)],
        components: [{
          id: 'dice',
          label: '2d6',
          source: fixedValue(standardSourceIds.D6),
          count: fixedValue(2),
        }],
        pipeline: [totalStep(), modifierStep()],
        primaryAggregateId: 'total',
      },
      poolSuccessDefinition('kit-d10-pool-successes', 'Pool de d10', standardSourceIds.D10, 8),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NONE,
      defaultDefinitionId: null,
      defaultSourceId: null,
      tiebreaker: 'none',
      order: 'none',
    },
    applicationPolicy: randomKitApplicationPolicies.MANUAL_ONLY,
  },
  {
    id: 'kit-cosmere-label-order',
    label: 'Ordre rapide/lent',
    description: 'Ajoute les jets d20 du Cosmere et une initiative textuelle rapide/lent pour les tours sans valeur numerique.',
    familyTags: [randomKitFamilyTags.D20_GENERIC],
    presetIds: ['systemes/cosmere-rpg'],
    sourceIds: [standardSourceIds.D20, cosmereSpeedSourceId],
    sources: [createCosmereSpeedSource()],
    definitions: [
      d20RollDefinition('kit-cosmere-d20-check', 'Jet d20 Cosmere'),
      {
        id: 'kit-cosmere-speed',
        name: 'Initiative rapide/lent',
        components: [{
          id: 'speed',
          label: 'Vitesse',
          source: fixedValue(cosmereSpeedSourceId),
          count: fixedValue(1),
        }],
        pipeline: [valueStep('speed', 'Vitesse')],
        primaryAggregateId: 'speed',
      },
    ],
    initiative: {
      mode: randomKitInitiativeModes.LABEL_ORDER,
      defaultDefinitionId: 'kit-cosmere-speed',
      tiebreaker: 'manual',
      order: 'text-order',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-savage-step-cards',
    label: 'Savage Worlds',
    description: 'Ajoute les des de trait explosifs et prepare une initiative par cartes avec paquet standard de 54 cartes.',
    familyTags: [
      randomKitFamilyTags.STEP_DICE,
      randomKitFamilyTags.EXPLODING_DICE,
      randomKitFamilyTags.CARDS,
    ],
    presetIds: ['systemes/savage-worlds'],
    sourceIds: [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
      standardCardSourceIds.STANDARD_54,
    ],
    sources: [],
    definitions: [
      {
        id: 'kit-savage-step',
        name: 'De de trait explosif',
        parameters: [
          sourceParameter('die', 'De', standardSourceIds.D8),
          integerParameter('modifier', 'Modificateur', 0),
        ],
        components: [{
          id: 'trait',
          label: 'Trait',
          source: parameterValue('die'),
          count: fixedValue(1),
        }],
        pipeline: [
          {
            id: 'explosion',
            type: randomPipelineStepTypes.EXPLODE,
            condition: { type: 'source-extreme', extreme: 'max' },
            maxIterations: 20,
          },
          totalStep(),
          modifierStep(),
        ],
        primaryAggregateId: 'total',
      },
    ],
    initiative: {
      mode: randomKitInitiativeModes.CARDS,
      defaultDefinitionId: null,
      defaultSourceId: standardCardSourceIds.STANDARD_54,
      defaultCardCount: 1,
      tiebreaker: 'card-suit-then-manual',
      order: 'card-order',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-random-order',
    label: 'Ordre aleatoire generique',
    description: 'Ajoute un tirage d100 dedie a produire un ordre aleatoire quand aucun systeme d initiative specifique ne convient.',
    familyTags: [randomKitFamilyTags.RANDOM_ORDER],
    presetIds: [],
    sourceIds: [standardSourceIds.D100],
    sources: [],
    definitions: [singleDieTotalDefinition('kit-random-order-d100', 'Ordre aleatoire', standardSourceIds.D100)],
    initiative: {
      mode: randomKitInitiativeModes.RANDOM_ORDER,
      defaultDefinitionId: 'kit-random-order-d100',
      tiebreaker: 'reroll-or-manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.REPLACE_ALL,
  },
];

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
        ? `Initiative - ${kit.label}`
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
