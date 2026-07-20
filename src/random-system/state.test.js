import { describe, expect, it } from 'vitest';
import { prepareCombinedDefinition } from './combinations.js';
import {
  executeRandomDefinition,
  fixedValue,
  randomAggregateOperations,
  randomPipelineStepTypes,
} from './engine.js';
import {
  RANDOM_SYSTEM_SCHEMA_VERSION,
  createDefaultRandomSystemState,
  exportRandomSystemStateForCampaign,
  normalizeRandomSystemState,
  recordRandomResult,
} from './state.js';
import { randomRuleIds } from './rulePool.js';
import { randomKitResources } from './rulePresetKits.js';

function legacyD20Definitions() {
  const target = {
    id: 'legacy-d20-normal',
    name: 'Jet d20 - Normal',
    exposed: false,
    components: [{ id: 'main', label: 'Jet', source: fixedValue('standard-d20'), count: fixedValue(1) }],
    pipeline: [{
      id: 'total',
      type: randomPipelineStepTypes.AGGREGATE,
      operation: randomAggregateOperations.SUM,
      outputId: 'total',
    }],
    primaryAggregateId: 'total',
  };
  const combination = {
    id: 'legacy-d20',
    name: 'Jet d20',
    exposed: true,
    components: [],
    options: [{
      id: 'combination',
      label: 'Mode',
      type: 'choice',
      defaultValue: 'normal',
      choices: [
        { value: 'normal', label: 'Normal' },
        { value: 'high', label: 'Plus haut' },
      ],
    }],
    pipeline: [{
      id: 'combination',
      type: 'repeat-select',
      optionId: 'combination',
      variants: {
        normal: { definitionId: target.id, repetitions: 1, select: 'first' },
        high: { definitionId: target.id, repetitions: 2, select: 'highest' },
      },
    }],
    primaryAggregateId: '',
  };
  return { combination, target };
}

describe('RandomSystem state', () => {
  it('starts with generic sources and the complete inactive catalogue', () => {
    const state = createDefaultRandomSystemState();
    expect(state.sources.map((source) => source.name)).toContain('d20');
    expect(state.sources.find((source) => source.id === 'example-weather-d10')).toMatchObject({
      name: 'd10 Météo',
      labels: {
        1: 'Grand soleil',
        6: 'Pluie',
        10: 'Vent violent',
      },
      symbols: {
        1: '☀️',
        6: '🌧️',
        10: '💨',
      },
    });
    expect(state.definitions.length).toBeGreaterThan(0);
    expect(state.definitions.every((definition) => definition.active === false && definition.quickAccess === false)).toBe(true);
    const cardSources = state.sources.filter((source) => source.kind === 'cards');
    expect(cardSources.map((source) => [source.name, source.cards.length])).toEqual([
      ['Jeu de 54 cartes', 54],
      ['Tarot français', 78],
    ]);
    expect(state.sourceStates['standard-54-cards'].drawPile).toHaveLength(54);
    expect(state.rulePool.enabledRuleIds).toContain(randomRuleIds.SUCCESS_THRESHOLDS);
  });

  it('converts legacy decks into card sources', () => {
    const current = createDefaultRandomSystemState();
    const cardSources = current.sources.filter((source) => source.kind === 'cards');
    const migrated = normalizeRandomSystemState({
      schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION - 1,
      sources: current.sources.filter((source) => source.kind !== 'cards'),
      definitions: [],
      decks: cardSources,
      deckStates: current.sourceStates,
    });
    expect(migrated.schemaVersion).toBe(RANDOM_SYSTEM_SCHEMA_VERSION);
    expect(migrated.rulePool.enabledRuleIds).toContain(randomRuleIds.MODIFIERS);
    expect(migrated.rulePool.enabledRuleIds).not.toContain('combinations');
    expect(migrated.sources.filter((source) => source.kind === 'cards')).toHaveLength(2);
    expect(migrated.sourceStates['standard-54-cards'].drawPile).toHaveLength(54);
    expect(migrated).not.toHaveProperty('decks');
    expect(migrated).not.toHaveProperty('deckStates');
    expect(migrated.sources.map((source) => source.id)).toContain('example-weather-d10');
  });

  it('replaces retired initiative-specific kit rolls with generic dice mechanics', () => {
    const current = createDefaultRandomSystemState();
    const migrated = normalizeRandomSystemState({
      ...current,
      schemaVersion: 13,
      sources: current.sources.filter((source) => source.id === 'standard-d100'),
      definitions: [{
        id: 'kit-d100-initiative',
        name: 'Ordre d100',
        exposed: true,
        active: true,
        components: [],
        pipeline: [],
      }],
    });

    expect(migrated.definitions.map((definition) => definition.id)).not.toContain('kit-d100-initiative');
    expect(migrated.definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'kit-d100-check', active: true }),
      expect.objectContaining({ id: 'kit-d100-polyhedral', active: true }),
    ]));
    expect(migrated.sources.map((source) => source.id)).toContain('standard-d3');
    expect(migrated.definitions.map((definition) => definition.name).join(' ').toLocaleLowerCase('fr'))
      .not.toMatch(/initiative|ordre/);
  });

  it('migrates legacy deck hands into card source discard piles', () => {
    const migrated = normalizeRandomSystemState({
      schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION - 1,
      sources: [],
      definitions: [],
      decks: [{
        id: 'legacy-tarot',
        name: 'Tarot legacy',
        kind: 'cards',
        cards: [
          { id: 'fool', label: 'Mat' },
          { id: 'magician', label: 'Bateleur' },
          { id: 'world', label: 'Monde' },
        ],
      }],
      deckStates: {
        'legacy-tarot': {
          sourceId: 'legacy-tarot',
          drawPile: ['world'],
          hand: ['fool'],
          discardPile: ['magician'],
          shuffleCount: 2,
        },
      },
    });

    expect(migrated.sourceStates['legacy-tarot']).toEqual({
      sourceId: 'legacy-tarot',
      drawPile: ['world'],
      discardPile: ['magician', 'fool'],
      shuffleCount: 2,
    });
    expect(migrated.sourceStates['legacy-tarot']).not.toHaveProperty('hand');
  });

  it('restores missing weather labels and symbols from previous storage', () => {
    const previous = createDefaultRandomSystemState();
    const expectedWeather = previous.sources.find((source) => source.id === 'example-weather-d10');
    const previousResult = {
      id: 'old-weather-result',
      kind: 'random-roll',
      selectedGroupIndex: 0,
      groups: [{
        index: 0,
        draws: [{
          id: 'old-weather-draw',
          sourceId: 'example-weather-d10',
          outcome: { id: 'value-5', value: 5, label: 'Bruine', symbol: '' },
        }],
        aggregates: [],
      }],
    };
    const migrated = normalizeRandomSystemState({
      ...previous,
      schemaVersion: RANDOM_SYSTEM_SCHEMA_VERSION - 1,
      sources: previous.sources.map((source) => (
        source.id === 'example-weather-d10'
          ? { ...source, labels: {}, symbols: {} }
          : source
      )),
      history: [previousResult],
    });
    const weather = migrated.sources.find((source) => source.id === 'example-weather-d10');

    expect(weather.labels).toEqual(expectedWeather.labels);
    expect(weather.symbols).toEqual(expectedWeather.symbols);
    expect(migrated.lastResult.groups[0].draws[0].outcome.symbol).toBe(expectedWeather.symbols['5']);
  });

  it('upgrades the built-in d20 kit without reactivating an inactive kit', () => {
    const previous = createDefaultRandomSystemState();
    const resources = randomKitResources('kit-d20-generic');
    const legacyDefinitions = [
      ...resources.definitions.map((definition) => (
        definition.id === 'kit-d20-check'
          ? {
            ...definition,
            active: false,
            options: definition.options.map((option) => ({
              ...option,
              choices: [...option.choices].reverse(),
            })),
          }
          : { ...definition, active: false }
      )),
      {
        id: 'kit-d20-initiative',
        name: 'Initiative d20',
        exposed: true,
        active: false,
        components: [],
        pipeline: [],
      },
    ];
    const migrated = normalizeRandomSystemState({
      ...previous,
      schemaVersion: 11,
      definitions: legacyDefinitions,
    });
    const check = migrated.definitions.find((definition) => definition.id === 'kit-d20-check');
    const polyhedral = migrated.definitions.find((definition) => definition.id === 'kit-d20-polyhedral');

    expect(migrated.definitions.map((definition) => definition.id)).not.toContain('kit-d20-initiative');
    expect(check.active).toBe(false);
    expect(polyhedral.active).toBe(false);
    expect(check.options[0].choices.map((choice) => choice.value))
      .toEqual(['disadvantage', 'normal', 'advantage']);
    expect(check.options[0].defaultValue).toBe('normal');
  });

  it('replaces old combination mechanics with independent referenced rolls', () => {
    const oldState = createDefaultRandomSystemState();
    const { combination: legacyCombination, target } = legacyD20Definitions();
    const migrated = normalizeRandomSystemState({
      ...oldState,
      schemaVersion: 3,
      definitions: [legacyCombination, target],
    });
    const combination = migrated.definitions.find((item) => item.id === 'legacy-d20');
    const variants = combination.pipeline[0].variants;

    expect(variants.normal.definitionId).not.toBe(variants.high.definitionId);
    expect(variants.normal).toEqual({ definitionId: variants.normal.definitionId });
    expect(variants.high).toEqual({ definitionId: variants.high.definitionId });
    const highRoll = migrated.definitions.find((item) => item.id === variants.high.definitionId);
    expect(highRoll.components[0].count).toEqual({ kind: 'fixed', value: 2 });
    expect(highRoll.pipeline.find((step) => step.id === 'selection'))
      .toMatchObject({ type: 'keep', order: 'highest' });
  });

  it('records observed frequencies without feeding them back to the engine', () => {
    const state = createDefaultRandomSystemState();
    const resources = randomKitResources('kit-d20-generic');
    const definition = resources.definitions.find((item) => item.id === 'kit-d20-check');
    const prepared = prepareCombinedDefinition(definition, resources.definitions, { mode: 'normal' });
    const result = executeRandomDefinition({
      definition: prepared.definition,
      sources: state.sources,
      parameters: { modifier: 0 },
      options: { mode: 'normal' },
      rng: () => 0,
    });
    const next = recordRandomResult({ ...state, definitions: resources.definitions }, result);

    expect(next.lastResult).toBe(result);
    expect(next.statistics).toMatchObject({
      totalUses: 1,
      totalDraws: 1,
      byDefinition: { 'kit-d20-check': 1 },
    });
    expect(next.statistics.bySource['standard-d20'].outcomes['value-1']).toBe(1);
  });

  it('records token draws in the shared result history and statistics', () => {
    const state = createDefaultRandomSystemState();
    const result = {
      id: 'token-result',
      kind: 'token-draw',
      definitionName: 'Deux garder un',
      sourceId: 'main-bag',
      sourceName: 'Sac principal',
      rolledAt: 1,
      tokens: [
        { typeId: 'red', name: 'Rouge', kept: true },
        { typeId: 'blue', name: 'Bleu', kept: false },
      ],
    };
    const next = recordRandomResult(state, result);

    expect(next.lastResult).toBe(result);
    expect(next.history).toEqual([result]);
    expect(next.statistics).toMatchObject({ totalUses: 1, totalDraws: 2 });
    expect(next.statistics.bySource['main-bag'].outcomes).toEqual({ red: 1, blue: 1 });
  });

  it('records large pools in one pass', () => {
    const state = createDefaultRandomSystemState();
    const resources = randomKitResources('kit-d6-pool');
    const definition = resources.definitions.find((item) => item.id === 'kit-d6-pool-successes');
    const result = executeRandomDefinition({
      definition,
      sources: state.sources,
      parameters: { count: 1000, threshold: 5 },
      options: { exploding: false },
      rng: () => 0.9,
    });
    const next = recordRandomResult(state, result);

    expect(result.draws).toHaveLength(1000);
    expect(next.statistics.totalDraws).toBe(1000);
    expect(next.statistics.bySource['standard-d6'].outcomes['value-6']).toBe(1000);
  });

  it('exports the complete campaign resource catalogue, including inactive resources', () => {
    const resources = randomKitResources('kit-d20-generic');
    const active = resources.definitions.find((item) => item.id === 'kit-d20-check');
    const inactive = resources.definitions.find((item) => item.id === 'kit-d20-damage');
    const internal = {
      id: 'campaign-internal-damage',
      name: 'Degats internes',
      exposed: false,
      active: false,
      components: [{ id: 'die', label: 'Degat', source: fixedValue('standard-d6'), count: fixedValue(1) }],
      pipeline: [{ id: 'sum', type: randomPipelineStepTypes.AGGREGATE, aggregateId: 'sum', operation: randomAggregateOperations.SUM }],
      primaryAggregateId: 'sum',
    };
    const combo = {
      id: 'campaign-combo',
      name: 'Jet actif combine',
      exposed: true,
      active: true,
      components: [],
      options: [{ id: 'mode', label: 'Mode', type: 'choice', defaultValue: 'damage', choices: [{ value: 'damage', label: 'Degats' }] }],
      pipeline: [{ id: 'select', type: randomPipelineStepTypes.REPEAT_SELECT, optionId: 'mode', variants: { damage: { definitionId: internal.id } } }],
      primaryAggregateId: '',
    };
    const state = {
      ...createDefaultRandomSystemState(),
      sources: resources.sources,
      definitions: [
        { ...active, active: true },
        { ...inactive, active: false },
        combo,
        internal,
      ],
    };

    const exported = exportRandomSystemStateForCampaign(state);

    expect(exported.definitions.map((definition) => definition.id).sort()).toEqual(
      normalizeRandomSystemState(state).definitions.map((definition) => definition.id).sort(),
    );
    expect(exported.sources.map((source) => source.id).sort()).toEqual(
      normalizeRandomSystemState(state).sources.map((source) => source.id).sort(),
    );
    expect(exported.randomKits).toEqual(normalizeRandomSystemState(state).randomKits);
    expect(exported.history).toEqual([]);
  });
});
