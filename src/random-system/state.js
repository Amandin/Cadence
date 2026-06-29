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

export const RANDOM_SYSTEM_SCHEMA_VERSION = 11;
export const RANDOM_HISTORY_LIMIT = 20;

export function emptyRandomStatistics() {
  return {
    totalUses: 0,
    totalDraws: 0,
    byDefinition: {},
    bySource: {},
  };
}

export function createDefaultRandomSystemState() {
  const sources = createStandardSources().map(normalizeRandomSource);
  const cardSources = sources.filter((source) => source.kind === randomSourceKinds.CARDS);
  return {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    sources,
    definitions: normalizeDefinitionCollection(createStarterDefinitions()),
    rulePool: createDefaultRandomRulePool(),
    sourceStates: Object.fromEntries(cardSources.map((source) => [source.id, resetCardSource(source)])),
    lastResult: null,
    history: [],
    statistics: emptyRandomStatistics(),
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
  };
}

export function normalizeRandomSystemState(state) {
  if (!state || typeof state !== 'object') return createDefaultRandomSystemState();
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
  const normalizedDefinitions = normalizeDefinitionCollection(state.definitions);
  const withoutLegacyCombinations = Number(state.schemaVersion) < 4
    ? replaceLegacyCombinationMechanics(normalizedDefinitions)
    : normalizedDefinitions;
  const definitions = Number(state.schemaVersion) === 4
    ? upgradeGeneratedCombinationRolls(withoutLegacyCombinations)
    : withoutLegacyCombinations;
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
  return {
    schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION,
    sources: sources.length ? sources : createStandardSources(),
    definitions,
    rulePool,
    sourceStates,
    lastResult: reviveResult(state.lastResult) || history[0] || null,
    history,
    statistics: normalizedStatistics(state.statistics),
  };
}

function incrementRecord(record, key, amount = 1) {
  return { ...record, [key]: (Number(record[key]) || 0) + amount };
}

function statisticsForRoll(statistics, result) {
  const next = {
    ...statistics,
    totalUses: statistics.totalUses + 1,
    byDefinition: incrementRecord(statistics.byDefinition, result.definitionId),
    bySource: { ...statistics.bySource },
  };
  const draws = result.groups.flatMap((group) => group.draws);
  next.totalDraws += draws.length;
  const mutableSourceStats = new Map();
  for (const draw of draws) {
    if (!mutableSourceStats.has(draw.sourceId)) {
      const current = next.bySource[draw.sourceId] || { count: 0, outcomes: {} };
      const mutable = { count: current.count, outcomes: { ...current.outcomes } };
      mutableSourceStats.set(draw.sourceId, mutable);
      next.bySource[draw.sourceId] = mutable;
    }
    const sourceStats = mutableSourceStats.get(draw.sourceId);
    sourceStats.count += 1;
    sourceStats.outcomes[draw.outcome.id] = (sourceStats.outcomes[draw.outcome.id] || 0) + 1;
  }
  return next;
}

function statisticsForCards(statistics, result) {
  const current = statistics.bySource[result.sourceId] || { count: 0, outcomes: {} };
  const sourceStats = {
    count: current.count + result.cards.length,
    outcomes: { ...current.outcomes },
  };
  result.cards.forEach((card) => {
    sourceStats.outcomes[card.id] = (sourceStats.outcomes[card.id] || 0) + 1;
  });
  return {
    ...statistics,
    totalUses: statistics.totalUses + 1,
    totalDraws: statistics.totalDraws + result.cards.length,
    bySource: {
      ...statistics.bySource,
      [result.sourceId]: sourceStats,
    },
  };
}

export function recordRandomResult(state, result) {
  const current = state?.schemaVersion === RANDOM_SYSTEM_SCHEMA_VERSION
    ? state
    : normalizeRandomSystemState(state);
  const statistics = result.kind === 'card-draw'
    ? statisticsForCards(current.statistics, result)
    : statisticsForRoll(current.statistics, result);
  return {
    ...current,
    lastResult: result,
    history: [result, ...current.history.filter((item) => item.id !== result.id)].slice(0, RANDOM_HISTORY_LIMIT),
    statistics,
  };
}
