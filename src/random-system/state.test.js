import { describe, expect, it } from 'vitest';
import { prepareCombinedDefinition } from './combinations.js';
import { executeRandomDefinition } from './engine.js';
import { RANDOM_SYSTEM_SCHEMA_VERSION, createDefaultRandomSystemState, normalizeRandomSystemState, recordRandomResult } from './state.js';
import { randomRuleIds } from './rulePool.js';

describe('RandomSystem state', () => {
  it('starts with generic sources and editable example definitions', () => {
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
    expect(state.definitions.filter((definition) => definition.exposed).map((definition) => definition.name)).toEqual([
      'Jet d20',
      'Pool',
      'Roll & Keep',
      'Pastèque',
      'Step',
    ]);
    expect(state.definitions.find((definition) => definition.id === 'starter-d20-advantage'))
      .toMatchObject({ name: 'Jet d20 - Avantage', exposed: false, kind: 'roll' });
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

  it('replaces old combination mechanics with independent referenced rolls', () => {
    const oldState = createDefaultRandomSystemState();
    const target = oldState.definitions.find((item) => item.id === 'starter-d20-normal');
    const legacyCombination = {
      ...oldState.definitions.find((item) => item.id === 'starter-d20'),
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
    };
    const migrated = normalizeRandomSystemState({
      ...oldState,
      schemaVersion: 3,
      definitions: [legacyCombination, target],
    });
    const combination = migrated.definitions.find((item) => item.id === 'starter-d20');
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
    const definition = state.definitions.find((item) => item.id === 'starter-d20');
    const prepared = prepareCombinedDefinition(definition, state.definitions, { combination: 'normal' });
    const result = executeRandomDefinition({
      definition: prepared.definition,
      sources: state.sources,
      parameters: { modifier: 0 },
      options: { combination: 'normal' },
      rng: () => 0,
    });
    const next = recordRandomResult(state, result);

    expect(next.lastResult).toBe(result);
    expect(next.statistics).toMatchObject({
      totalUses: 1,
      totalDraws: 1,
      byDefinition: { 'starter-d20': 1 },
    });
    expect(next.statistics.bySource['standard-d20'].outcomes['value-1']).toBe(1);
  });

  it('records large pools in one pass', () => {
    const state = createDefaultRandomSystemState();
    const definition = state.definitions.find((item) => item.id === 'starter-pool');
    const result = executeRandomDefinition({
      definition,
      sources: state.sources,
      parameters: { count: 1000, threshold: 6 },
      options: { exploding: false },
      rng: () => 0.5,
    });
    const next = recordRandomResult(state, result);

    expect(result.draws).toHaveLength(1000);
    expect(next.statistics.totalDraws).toBe(1000);
    expect(next.statistics.bySource['standard-d10'].outcomes['value-6']).toBe(1000);
  });
});
