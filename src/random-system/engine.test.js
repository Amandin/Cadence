import { describe, expect, it } from 'vitest';
import {
  createUniformSource,
  createWeightedSource,
  drawRandomSource,
  executeRandomDefinition,
  fixedValue,
  parameterValue,
  randomAggregateOperations,
  randomKeepOrders,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';

const d6 = createUniformSource({ id: 'd6', name: 'd6', min: 1, max: 6 });
const d10 = createUniformSource({ id: 'd10', name: 'd10', min: 1, max: 10 });

function sequenceRng(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('RandomSystem engine', () => {
  it('draws from uniform and weighted sources without dice-specific behavior', () => {
    const weather = createWeightedSource({
      id: 'weather',
      name: 'Météo',
      outcomes: [
        { value: 'sun', label: 'Soleil', weight: 2 },
        { value: 'rain', label: 'Pluie', weight: 1 },
      ],
    });

    expect(drawRandomSource(d6, () => 0).value).toBe(1);
    expect(drawRandomSource(d6, () => 0.999).value).toBe(6);
    expect(drawRandomSource(weather, () => 0.5).label).toBe('Soleil');
    expect(drawRandomSource(weather, () => 0.9).label).toBe('Pluie');
  });

  it('uses optional labels for individual uniform outcomes', () => {
    const labeled = createUniformSource({
      id: 'labeled-d6',
      name: 'd6 narratif',
      min: 1,
      max: 6,
      labels: { 1: 'Complication', 6: 'Aubaine' },
      symbols: { 1: '⚠️', 6: '✨' },
    });

    expect(drawRandomSource(labeled, () => 0)).toMatchObject({ value: 1, label: 'Complication', symbol: '⚠️' });
    expect(drawRandomSource(labeled, () => 0.5)).toMatchObject({ value: 4, label: '4', symbol: '' });
    expect(drawRandomSource(labeled, () => 0.999)).toMatchObject({ value: 6, label: 'Aubaine', symbol: '✨' });
  });

  it('resolves parameters, explosions, keep and aggregation as a pipeline', () => {
    const definition = {
      id: 'watermelon',
      name: 'Pastèque',
      parameters: [
        { id: 'second-source', label: 'Second dé', type: randomParameterTypes.SOURCE, defaultValue: 'd10' },
      ],
      components: [
        { id: 'base', label: 'Base', source: fixedValue('d6'), count: fixedValue(1) },
        { id: 'second', label: 'Second', source: parameterValue('second-source'), count: fixedValue(1) },
      ],
      pipeline: [
        {
          id: 'explode',
          type: randomPipelineStepTypes.EXPLODE,
          condition: { type: 'source-extreme', extreme: 'max' },
          maxIterations: 6,
        },
        {
          id: 'keep',
          type: randomPipelineStepTypes.KEEP,
          count: fixedValue(1),
          unit: 'chain',
          order: randomKeepOrders.HIGHEST,
        },
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
          label: 'Total',
        },
      ],
      primaryAggregateId: 'total',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d6, d10],
      parameters: { 'second-source': 'd10' },
      rng: sequenceRng([0.999, 0.2, 0.999, 0.4]),
      now: 10,
    });

    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([6, 3, 6, 3]);
    expect(result.draws.filter((draw) => draw.kept).map((draw) => draw.outcome.value)).toEqual([6, 6, 3]);
    expect(result.primaryAggregate.value).toBe(15);
  });

  it('exposes success counts and occurrence bonuses without interpreting them', () => {
    const definition = {
      id: 'pool',
      name: 'Pool',
      components: [{ id: 'pool', source: fixedValue('d10'), count: fixedValue(4) }],
      pipeline: [
        {
          id: 'threshold',
          type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
          condition: { type: 'compare', operator: 'gte', value: fixedValue(7) },
        },
        {
          id: 'successes',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.COUNT_SUCCESSES,
          outputId: 'successes',
          label: 'Succès',
        },
        {
          id: 'pairs',
          type: randomPipelineStepTypes.OCCURRENCE_BONUS,
          targetAggregateId: 'successes',
          condition: { type: 'compare', operator: 'eq', value: fixedValue(10) },
          every: fixedValue(2),
          amount: fixedValue(2),
        },
      ],
      primaryAggregateId: 'successes',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d10],
      rng: sequenceRng([0.95, 0.95, 0.65, 0.1]),
    });

    expect(result.draws.map((draw) => draw.success)).toEqual([true, true, true, false]);
    expect(result.primaryAggregate.value).toBe(5);
    expect(result.primaryAggregate.adjustments[0]).toMatchObject({ occurrences: 2, value: 2 });
    expect(result).not.toHaveProperty('success');
    expect(result).not.toHaveProperty('critical');
  });

  it('repeats and selects a group through a declarative choice option', () => {
    const definition = {
      id: 'd20',
      name: 'Jet',
      options: [{
        id: 'mode',
        label: 'Mode',
        type: randomOptionTypes.CHOICE,
        defaultValue: 'normal',
        choices: [
          { value: 'normal', label: 'Normal' },
          { value: 'advantage', label: 'Avantage' },
        ],
      }],
      components: [{ id: 'roll', source: fixedValue('d6'), count: fixedValue(1) }],
      pipeline: [
        {
          id: 'repeat',
          type: randomPipelineStepTypes.REPEAT_SELECT,
          optionId: 'mode',
          variants: {
            normal: { repetitions: 1, select: 'first', aggregateId: 'total' },
            advantage: { repetitions: 2, select: 'highest', aggregateId: 'total' },
          },
        },
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
        },
      ],
      primaryAggregateId: 'total',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d6],
      options: { mode: 'advantage' },
      rng: sequenceRng([0.1, 0.8]),
    });

    expect(result.groups).toHaveLength(2);
    expect(result.selectedGroupIndex).toBe(1);
    expect(result.primaryAggregate.value).toBe(5);
  });

  it('combines repeated groups with a generic sum strategy', () => {
    const definition = {
      id: 'combined',
      name: 'Combiné',
      options: [{
        id: 'assembly',
        label: 'Assemblage',
        type: randomOptionTypes.CHOICE,
        defaultValue: 'double',
        choices: [{ value: 'double', label: 'Double' }],
      }],
      components: [{ id: 'roll', source: fixedValue('d6'), count: fixedValue(1) }],
      pipeline: [
        {
          id: 'assembly',
          type: randomPipelineStepTypes.REPEAT_SELECT,
          optionId: 'assembly',
          variants: { double: { repetitions: 2, select: 'sum', aggregateId: 'total' } },
        },
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
        },
      ],
      primaryAggregateId: 'total',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d6],
      rng: sequenceRng([0.1, 0.8]),
    });

    expect(result.combined).toBe(true);
    expect(result.selectedGroupIndex).toBe(-1);
    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([1, 5]);
    expect(result.primaryAggregate.value).toBe(6);
  });

  it('subtracts repeated groups in their draw order', () => {
    const definition = {
      id: 'subtracted',
      name: 'Soustrait',
      components: [{ id: 'roll', source: fixedValue('d6'), count: fixedValue(1) }],
      pipeline: [
        {
          id: 'assembly',
          type: randomPipelineStepTypes.REPEAT_SELECT,
          value: 'triple',
          variants: {
            triple: { repetitions: 3, select: 'subtract', aggregateId: 'total' },
          },
        },
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
        },
      ],
      primaryAggregateId: 'total',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d6],
      rng: sequenceRng([0.8, 0.3, 0.1]),
    });

    expect(result.combined).toBe(true);
    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([5, 2, 1]);
    expect(result.primaryAggregate.value).toBe(2);
  });

  it('supports rerolls, custom values and markers as generic transformations', () => {
    const source = createWeightedSource({
      id: 'symbols',
      name: 'Symboles',
      outcomes: [
        { value: 'blank', label: 'Vide', weight: 1 },
        { value: 'star', label: 'Étoile', symbol: '★', weight: 1 },
      ],
    });
    const definition = {
      id: 'symbols-roll',
      name: 'Symboles',
      components: [{ id: 'symbols', source: fixedValue('symbols'), count: fixedValue(1) }],
      pipeline: [
        {
          id: 'reroll-blank',
          type: randomPipelineStepTypes.REROLL,
          condition: { type: 'compare', field: 'raw', operator: 'eq', value: fixedValue('blank') },
          maxIterations: 1,
        },
        {
          id: 'map-star',
          type: randomPipelineStepTypes.MAP_VALUE,
          mappings: [{
            condition: { type: 'compare', field: 'raw', operator: 'eq', value: fixedValue('star') },
            value: fixedValue(3),
          }],
        },
        {
          id: 'marker-star',
          type: randomPipelineStepTypes.MARKER,
          markerId: 'bright',
          label: 'Brillant',
          condition: { type: 'compare', field: 'raw', operator: 'eq', value: fixedValue('star') },
        },
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'total',
        },
      ],
    };

    const result = executeRandomDefinition({
      definition,
      sources: [source],
      rng: sequenceRng([0.1, 0.9]),
    });

    expect(result.draws).toHaveLength(2);
    expect(result.draws[0].rerolled).toBe(true);
    expect(result.draws[1]).toMatchObject({ calculatedValue: 3, markers: [{ id: 'bright', label: 'Brillant' }] });
    expect(result.primaryAggregate.value).toBe(3);
  });
});
