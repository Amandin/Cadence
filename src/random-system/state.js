import {
  normalizeCardSource,
  normalizeCardSourceState,
  resetCardSource,
} from './cardSources.js';
import {
  createStandardSources,
  createStarterDefinitions,
  createWeatherD10Source,
  standardSourceIds,
} from './defaults.js';
import {
  fixedValue,
  normalizeRandomDefinition,
  normalizeRandomSource,
  randomAggregateOperations,
  randomDefinitionKinds,
  randomKeepOrders,
  randomPipelineStepTypes,
  randomSourceKinds,
} from './engine.js';
import {
  createDefaultRandomRulePool,
  normalizeRandomRulePool,
} from './rulePool.js';
import { normalizeRandomKits, randomKitCatalog, randomKitResources } from './rulePresetKits.js';
import { normalizeTokenSystem } from './tokens.js';

export const RANDOM_SYSTEM_SCHEMA_VERSION = 20;
export const RANDOM_HISTORY_LIMIT = 20;

const catalogKitDefinitionMigrations = [
  {
    kitId: 'kit-d20-generic',
    definitionIds: ['kit-d20-check', 'kit-d20-damage', 'kit-d20-initiative'],
  },
  {
    kitId: 'kit-d100-percentile',
    definitionIds: ['kit-d100-check', 'kit-d100-initiative'],
  },
  {
    kitId: 'kit-d6-pool',
    definitionIds: ['kit-d6-pool-successes', 'kit-shadowrun-initiative'],
  },
  {
    kitId: 'kit-cosmere-label-order',
    definitionIds: ['kit-cosmere-d20-check', 'kit-cosmere-speed'],
  },
  {
    kitId: 'kit-savage-step-cards',
    definitionIds: ['kit-savage-step'],
  },
  {
    kitId: 'kit-random-order',
    definitionIds: ['kit-random-order-d100'],
  },
];

function catalogKitIdsToUpgrade(definitions = []) {
  const ids = new Set((Array.isArray(definitions) ? definitions : []).map((definition) => definition?.id));
  return catalogKitDefinitionMigrations
    .filter((migration) => migration.definitionIds.some((id) => ids.has(id)))
    .map((migration) => migration.kitId);
}

function upgradeCatalogKitDefinitions(definitions, kitIds) {
  let upgraded = definitions;
  for (const kitId of kitIds) {
    const migration = catalogKitDefinitionMigrations.find((item) => item.kitId === kitId);
    const resources = randomKitResources(kitId);
    const relatedIds = new Set([
      ...migration.definitionIds,
      ...resources.definitions.map((definition) => definition.id),
    ]);
    const previous = upgraded.filter((definition) => relatedIds.has(definition.id));
    const active = previous.some((definition) => definition.exposed !== false && definition.active !== false);
    upgraded = [
      ...upgraded.filter((definition) => !relatedIds.has(definition.id)),
      ...resources.definitions.map((definition) => ({
        ...definition,
        active: definition.exposed === false ? false : active,
      })),
    ];
  }
  return upgraded;
}

function upgradeDefaultStandardDiceDecisions(definitions) {
  return definitions.map((definition) => {
    if (definition.id !== 'default-dnd5-standard-dice') return definition;
    const pipeline = [...(definition.pipeline || [])];
    const addAfterRollDecision = (step, optionId) => {
      if (!step || pipeline.some((item) => item.id === `${step.id}-after-roll`)) return;
      pipeline.push({
        ...step,
        id: `${step.id}-after-roll`,
        decision: 'after-roll',
        enabledWhen: { optionId, equals: false },
      });
    };
    addAfterRollDecision(pipeline.find((step) => (
      step.type === randomPipelineStepTypes.REROLL
      && step.enabledWhen?.optionId === 'rerolling'
      && step.enabledWhen?.equals === true
    )), 'rerolling');
    addAfterRollDecision(pipeline.find((step) => (
      step.type === randomPipelineStepTypes.EXPLODE
      && step.enabledWhen?.optionId === 'exploding'
      && step.enabledWhen?.equals === true
    )), 'exploding');
    return { ...definition, pipeline };
  });
}

export function emptyRandomStatistics() {
  return {
    totalUses: 0,
    totalDraws: 0,
    byDefinition: {},
    bySource: {},
    byContext: {},
  };
}

function addBaseKitResources(sources, definitions, customKits = []) {
  const sourceIds = new Set(sources.map((source) => source.id));
  const definitionIds = new Set(definitions.map((definition) => definition.id));
  const nextSources = [...sources];
  const nextDefinitions = [...definitions];
  const kits = [...randomKitCatalog, ...customKits];

  for (const kit of kits) {
    const resources = randomKitResources(kit, customKits);
    for (const source of resources.sources) {
      if (sourceIds.has(source.id)) continue;
      sourceIds.add(source.id);
      nextSources.push(normalizeRandomSource(source));
    }
    for (const definition of resources.definitions) {
      if (definitionIds.has(definition.id)) continue;
      definitionIds.add(definition.id);
      nextDefinitions.push({
        ...normalizeRandomDefinition(definition),
        active: false,
        quickAccess: false,
      });
    }
  }
  return { sources: nextSources, definitions: nextDefinitions };
}

export function createDefaultRandomSystemState() {
  const baseline = addBaseKitResources(
    createStandardSources().map(normalizeRandomSource),
    normalizeDefinitionCollection(createStarterDefinitions()),
  );
  const sources = baseline.sources;
  const cardSources = sources.filter((source) => source.kind === randomSourceKinds.CARDS);
  return {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    sources,
    definitions: baseline.definitions,
    rulePool: createDefaultRandomRulePool(),
    sourceStates: Object.fromEntries(cardSources.map((source) => [source.id, resetCardSource(source)])),
    randomKits: [],
    lastResult: null,
    history: [],
    statistics: emptyRandomStatistics(),
    tokenTypes: [],
    tokenContainers: [],
  };
}

function uniqueDefinitionId(preferred, usedIds) {
  let id = preferred;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = `${preferred}-${suffix}`;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

function migrateLegacyDefinition(definition, usedIds) {
  const normalized = normalizeRandomDefinition(definition);
  if (Object.values(randomDefinitionKinds).includes(definition?.kind)) return [normalized];

  const repeat = normalized.pipeline.find((step) => step.type === randomPipelineStepTypes.REPEAT_SELECT);
  const option = normalized.options.find((item) => item.id === repeat?.optionId);
  if (!repeat || !option) return [{ ...normalized, kind: randomDefinitionKinds.ROLL }];

  const variants = repeat.variants || {};
  const needsBase = Object.values(variants).some((variant) => (
    !variant?.definitionId || variant.definitionId === normalized.id
  ));
  let base = null;
  let baseId = '';
  if (needsBase) {
    baseId = uniqueDefinitionId(`${normalized.id}-base`, usedIds);
    base = normalizeRandomDefinition({
      ...normalized,
      id: baseId,
      name: `Base de ${normalized.name}`,
      kind: randomDefinitionKinds.ROLL,
      exposed: false,
      options: normalized.options.filter((item) => item.id !== option.id),
      pipeline: normalized.pipeline.filter((step) => step.id !== repeat.id),
    });
  }

  const combination = normalizeRandomDefinition({
    ...normalized,
    kind: randomDefinitionKinds.COMBINATION,
    parameters: [],
    options: [option],
    components: [],
    pipeline: [{
      ...repeat,
      variants: Object.fromEntries(Object.entries(variants).map(([id, variant]) => [
        id,
        {
          ...variant,
          definitionId: (!variant?.definitionId || variant.definitionId === normalized.id)
            ? baseId
            : variant.definitionId,
        },
      ])),
    }],
    primaryAggregateId: '',
  });
  return base ? [combination, base] : [combination];
}

function normalizeDefinitionCollection(definitions) {
  const source = Array.isArray(definitions) ? definitions : [];
  const usedIds = new Set(source.map((definition) => String(definition?.id || '')));
  return source.flatMap((definition) => migrateLegacyDefinition(definition, usedIds));
}

function choiceControlForCount(count) {
  if (count === 2) return 'switch';
  if (count <= 5) return 'slider';
  return 'select';
}

function independentRollFromLegacyVariant(target, id, name, variant) {
  const repetitions = Math.max(1, Number(variant?.repetitions) || 1);
  const strategy = variant?.select || 'first';
  const component = target.components.length === 1 ? target.components[0] : null;
  const fixedCount = component?.count?.kind === 'fixed'
    ? Math.max(1, Number(component.count.value) || 1)
    : null;
  let components = target.components;
  let pipeline = target.pipeline.filter(
    (step) => step.type !== randomPipelineStepTypes.REPEAT_SELECT,
  );

  if (fixedCount && repetitions > 1) {
    components = [{
      ...component,
      count: fixedValue(fixedCount * repetitions),
    }];
    if (strategy === 'highest' || strategy === 'lowest') {
      const aggregateIndex = pipeline.findIndex(
        (step) => step.type === randomPipelineStepTypes.AGGREGATE,
      );
      const keep = {
        id: 'selection',
        type: randomPipelineStepTypes.KEEP,
        count: fixedValue(fixedCount),
        unit: 'chain',
        order: strategy === 'lowest'
          ? randomKeepOrders.LOWEST
          : randomKeepOrders.HIGHEST,
      };
      pipeline = aggregateIndex < 0
        ? [...pipeline, keep]
        : [
          ...pipeline.slice(0, aggregateIndex),
          keep,
          ...pipeline.slice(aggregateIndex),
        ];
    } else if (strategy === 'subtract') {
      pipeline = pipeline.map((step) => (
        step.type === randomPipelineStepTypes.AGGREGATE
          ? { ...step, operation: randomAggregateOperations.SUBTRACT }
          : step
      ));
    }
  }

  return normalizeRandomDefinition({
    ...target,
    id,
    name,
    kind: randomDefinitionKinds.ROLL,
    exposed: false,
    components,
    pipeline,
  });
}

function replaceLegacyCombinationMechanics(definitions) {
  const usedIds = new Set(definitions.map((definition) => definition.id));
  const generated = [];
  const obsoleteTargets = new Set();
  const converted = definitions.map((definition) => {
    if (definition.kind !== randomDefinitionKinds.COMBINATION) return definition;
    const step = definition.pipeline.find((item) => item.type === randomPipelineStepTypes.REPEAT_SELECT);
    const option = definition.options.find((item) => item.id === step?.optionId);
    const variants = step?.variants || {};
    const hasLegacyMechanics = Object.values(variants).some((variant) => (
      Object.prototype.hasOwnProperty.call(variant || {}, 'repetitions')
      || Object.prototype.hasOwnProperty.call(variant || {}, 'select')
      || Object.prototype.hasOwnProperty.call(variant || {}, 'aggregateId')
    ));
    if (!step || !option || !hasLegacyMechanics) return definition;

    const nextVariants = Object.fromEntries(option.choices.map((choice) => {
      const variant = variants[choice.value] || {};
      const target = definitions.find((item) => item.id === variant.definitionId);
      if (!target || target.kind === randomDefinitionKinds.COMBINATION) {
        return [choice.value, { definitionId: variant.definitionId }];
      }
      const targetId = uniqueDefinitionId(
        `${definition.id}-${String(choice.value)}-roll`,
        usedIds,
      );
      generated.push(independentRollFromLegacyVariant(
        target,
        targetId,
        `${definition.name} - ${choice.label}`,
        variant,
      ));
      if (target.exposed === false) obsoleteTargets.add(target.id);
      return [choice.value, { definitionId: targetId }];
    }));

    return normalizeRandomDefinition({
      ...definition,
      options: definition.options.map((item) => (
        item.id === option.id
          ? { ...item, control: choiceControlForCount(item.choices.length) }
          : item
      )),
      pipeline: definition.pipeline.map((item) => (
        item.id === step.id ? { ...item, variants: nextVariants } : item
      )),
    });
  });
  const next = [...converted, ...generated];
  const referencedIds = new Set(next.flatMap((definition) => (
    definition.kind === randomDefinitionKinds.COMBINATION
      ? definition.pipeline.flatMap((step) => Object.values(step.variants || {})
        .map((variant) => variant?.definitionId)
        .filter(Boolean))
      : []
  )));
  return next.filter((definition) => (
    !obsoleteTargets.has(definition.id) || referencedIds.has(definition.id)
  ));
}

function upgradeGeneratedCombinationRolls(definitions) {
  const replacements = new Map();
  definitions.forEach((definition) => {
    if (definition.kind !== randomDefinitionKinds.COMBINATION) return;
    const step = definition.pipeline.find((item) => item.type === randomPipelineStepTypes.REPEAT_SELECT);
    const option = definition.options.find((item) => item.id === step?.optionId);
    option?.choices.forEach((choice) => {
      const targetId = step.variants?.[choice.value]?.definitionId;
      if (targetId !== `${definition.id}-${String(choice.value)}-roll`) return;
      const target = definitions.find((item) => item.id === targetId);
      if (!target) return;
      const label = String(choice.label).toLocaleLowerCase('fr');
      const strategy = label.includes('avantage') || label.includes('plus haut')
        ? 'highest'
        : label.includes('désavantage') || label.includes('plus bas')
          ? 'lowest'
          : 'first';
      replacements.set(targetId, independentRollFromLegacyVariant(
        target,
        target.id,
        target.name,
        { repetitions: strategy === 'first' ? 1 : 2, select: strategy },
      ));
    });
  });
  return definitions.map((definition) => replacements.get(definition.id) || definition);
}

function upgradeBuiltInD20Definitions(definitions) {
  const replacements = new Map(
    randomKitResources('kit-d20-generic').definitions
      .filter((definition) => ['kit-d20-check', 'kit-d20-initiative'].includes(definition.id))
      .map((definition) => [definition.id, definition]),
  );
  return definitions.map((definition) => {
    const replacement = replacements.get(definition.id);
    if (!replacement) return definition;
    return normalizeRandomDefinition({
      ...replacement,
      exposed: definition.exposed,
      active: definition.active,
    });
  });
}

function normalizedStatistics(statistics) {
  const source = statistics && typeof statistics === 'object' ? statistics : {};
  const bySource = source.bySource && typeof source.bySource === 'object'
    ? { ...source.bySource }
    : {};
  Object.entries(source.byDeck && typeof source.byDeck === 'object' ? source.byDeck : {})
    .forEach(([sourceId, count]) => {
      if (!bySource[sourceId]) {
        bySource[sourceId] = { count: Math.max(0, Number(count) || 0), outcomes: {} };
      }
    });
  return {
    totalUses: Math.max(0, Number(source.totalUses) || 0),
    totalDraws: Math.max(0, Number(source.totalDraws) || 0),
    byDefinition: source.byDefinition && typeof source.byDefinition === 'object' ? source.byDefinition : {},
    bySource,
    byContext: source.byContext && typeof source.byContext === 'object' ? source.byContext : {},
  };
}

export function normalizeRandomSystemState(state) {
  if (!state || typeof state !== 'object') return createDefaultRandomSystemState();
  const randomKits = normalizeRandomKits(state.randomKits);
  const weatherTemplate = createWeatherD10Source();
  const storedSources = (Array.isArray(state.sources) ? state.sources : []).map(normalizeRandomSource);
  const migratedCardSources = (Array.isArray(state.decks) ? state.decks : [])
    .map((deck, index) => normalizeRandomSource({
      ...normalizeCardSource(deck, index),
      kind: randomSourceKinds.CARDS,
    }))
    .filter((source) => !storedSources.some((stored) => stored.id === source.id));
  const sourceTemplates = createStandardSources().map(normalizeRandomSource);
  const cardTemplates = sourceTemplates.filter((source) => source.kind === randomSourceKinds.CARDS);
  const normalizedSources = storedSources.map((source) => (
    source.id === standardSourceIds.WEATHER_D10
      ? {
        ...source,
        labels: { ...weatherTemplate.labels, ...source.labels },
        symbols: { ...weatherTemplate.symbols, ...source.symbols },
        images: { ...weatherTemplate.images, ...source.images },
        texts: { ...weatherTemplate.texts, ...source.texts },
      }
      : source
  ));
  let sources = normalizedSources;
  if (migratedCardSources.length) sources = [...sources, ...migratedCardSources];
  if (Number(state.schemaVersion) < 7
    && !sources.some((source) => source.id === standardSourceIds.WEATHER_D10)) {
    sources = [...sources, weatherTemplate];
  }
  if (Number(state.schemaVersion) < 10
    && !sources.some((source) => source.kind === randomSourceKinds.CARDS)) {
    sources = [...sources, ...cardTemplates];
  }
  const catalogKitUpgrades = Number(state.schemaVersion) < 14
    ? catalogKitIdsToUpgrade(state.definitions)
    : [];
  for (const kitId of catalogKitUpgrades) {
    for (const source of randomKitResources(kitId).sources) {
      if (!sources.some((current) => current.id === source.id)) sources.push(source);
    }
  }
  const normalizedDefinitions = normalizeDefinitionCollection(state.definitions);
  const withoutLegacyCombinations = Number(state.schemaVersion) < 4
    ? replaceLegacyCombinationMechanics(normalizedDefinitions)
    : normalizedDefinitions;
  const upgradedCombinations = Number(state.schemaVersion) === 4
    ? upgradeGeneratedCombinationRolls(withoutLegacyCombinations)
    : withoutLegacyCombinations;
  const upgradedBuiltInDefinitions = Number(state.schemaVersion) < 13
    ? upgradeBuiltInD20Definitions(upgradedCombinations)
    : upgradedCombinations;
  const resolvedDefinitions = Number(state.schemaVersion) < 14
    ? upgradeCatalogKitDefinitions(upgradedBuiltInDefinitions, catalogKitUpgrades)
    : upgradedBuiltInDefinitions;
  const upgradedStandardDice = Number(state.schemaVersion) < 19
    ? upgradeDefaultStandardDiceDecisions(resolvedDefinitions)
    : resolvedDefinitions;
  const baseline = addBaseKitResources(sources, upgradedStandardDice, randomKits);
  sources = baseline.sources;
  const definitions = baseline.definitions;
  const cardSources = sources.filter((source) => source.kind === randomSourceKinds.CARDS);
  const sourceStates = Object.fromEntries(cardSources.map((source) => [
    source.id,
    state.sourceStates?.[source.id]
      ? normalizeCardSourceState(source, state.sourceStates[source.id])
      : state.deckStates?.[source.id]
        ? normalizeCardSourceState(source, state.deckStates[source.id])
        : resetCardSource(source),
  ]));
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const reviveDraw = (draw) => {
    const source = sourceById.get(draw?.sourceId);
    if (!source || !draw?.outcome) return draw;
    const valueKey = String(draw.outcome.value);
    const sourceOutcome = source.kind === 'uniform'
      ? {
        label: source.labels?.[valueKey],
        symbol: source.symbols?.[valueKey],
        image: source.images?.[valueKey],
        text: source.texts?.[valueKey],
      }
      : source.outcomes?.find((outcome) => outcome.id === draw.outcome.id);
    if (!sourceOutcome?.label && !sourceOutcome?.symbol && !sourceOutcome?.image && !sourceOutcome?.text) return draw;
    return {
      ...draw,
      outcome: {
        ...draw.outcome,
        label: sourceOutcome.label || draw.outcome.label,
        symbol: sourceOutcome.symbol || draw.outcome.symbol || '',
        image: sourceOutcome.image || draw.outcome.image || '',
        text: sourceOutcome.text || draw.outcome.text || '',
      },
    };
  };
  const reviveResult = (result) => {
    if (result?.kind === 'deck-draw' || result?.kind === 'card-draw') {
      return {
        ...result,
        kind: 'card-draw',
        sourceId: result.sourceId || result.deckId,
        sourceName: result.sourceName || result.deckName,
      };
    }
    if (result?.kind !== 'random-roll') return result;
    const groups = (result.groups || []).map((group) => ({
      ...group,
      draws: (group.draws || []).map(reviveDraw),
    }));
    const selectedGroup = groups[result.selectedGroupIndex] || groups[0] || { draws: [], aggregates: [] };
    const aggregates = result.aggregates || selectedGroup.aggregates || [];
    return {
      ...result,
      groups,
      draws: result.draws?.map(reviveDraw)
        || (result.combined ? groups.flatMap((group) => group.draws) : selectedGroup.draws)
        || [],
      aggregates,
      primaryAggregate: result.primaryAggregate
        || aggregates.find((aggregate) => aggregate.id === result.primaryAggregateId)
        || aggregates[0]
        || null,
    };
  };
  const history = (Array.isArray(state.history) ? state.history : [])
    .slice(0, RANDOM_HISTORY_LIMIT)
    .map(reviveResult);
  const rulePool = normalizeRandomRulePool(state.rulePool);
  const tokenSystem = normalizeTokenSystem(state);
  return {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    sources: sources.length ? sources : createStandardSources(),
    definitions,
    rulePool,
    sourceStates,
    randomKits,
    lastResult: reviveResult(state.lastResult) || history[0] || null,
    history,
    statistics: normalizedStatistics(state.statistics),
    ...tokenSystem,
  };
}

function definitionSourceIds(definition) {
  return [
    ...(definition.components || []).flatMap((component) => {
      if (component.source?.kind === 'fixed') return [component.source.value];
      const parameter = (definition.parameters || []).find((item) => item.id === component.source?.parameterId);
      return parameter?.type === 'source'
        ? [parameter.defaultValue, ...(parameter.choices || [])]
        : [];
    }),
    ...(definition.pipeline || []).filter((step) => step.type === randomPipelineStepTypes.LOOKUP_TABLE).flatMap((step) => {
      if (step.source?.kind === 'fixed') return [step.source.value];
      if (step.source?.kind === 'parameter') {
        const parameter = (definition.parameters || []).find((item) => item.id === step.source.parameterId);
        return parameter ? [parameter.defaultValue, ...(parameter.choices || [])] : [];
      }
      return [step.sourceId];
    }),
  ].filter(Boolean);
}

function referencedDefinitionIds(definition) {
  return (definition.pipeline || [])
    .filter((step) => step.type === randomPipelineStepTypes.REPEAT_SELECT)
    .flatMap((step) => Object.values(step.variants || {}).map((variant) => variant?.definitionId))
    .filter(Boolean);
}

export function exportRandomSystemStateForCampaign(state) {
  const normalized = normalizeRandomSystemState(state);
  return {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    sources: normalized.sources,
    definitions: normalized.definitions,
    rulePool: normalizeRandomRulePool(normalized.rulePool),
    sourceStates: normalized.sourceStates,
    randomKits: normalized.randomKits,
    lastResult: null,
    history: [],
    statistics: normalized.statistics,
    tokenTypes: normalized.tokenTypes,
    tokenContainers: normalized.tokenContainers,
  };
}

import { recordRandomResult as recordStatisticsResult } from './randomStatistics.js';

export function recordRandomResult(state, result) {
  return recordStatisticsResult(state, result, {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    normalizeState: normalizeRandomSystemState,
    historyLimit: RANDOM_HISTORY_LIMIT,
  });
}
