import { describe, expect, it } from 'vitest';
import {
  createUniformSource,
  executeRandomDefinition,
  fixedValue,
  randomAggregateOperations,
  randomPipelineStepTypes,
} from './engine.js';

function sequenceRng(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('RandomSystem linked tables', () => {
  it('can resolve a source from the numeric result of a roll', () => {
    const d6 = createUniformSource({ id: 'd6', name: 'd6', min: 1, max: 6 });
    const table = createUniformSource({
      id: 'reaction-table',
      name: 'Reaction',
      min: 2,
      max: 12,
      labels: {
        2: 'Hostile',
        7: 'Neutre',
        8: 'Curieux',
        12: 'Allie',
      },
      texts: {
        8: 'Le PNJ ecoute avant de se prononcer.',
      },
    });
    const definition = {
      id: 'reaction-roll',
      name: 'Reaction',
      components: [{
        id: 'roll',
        source: fixedValue('d6'),
        count: fixedValue(2),
      }],
      pipeline: [
        {
          id: 'total',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.SUM,
          outputId: 'result',
          label: 'Total',
        },
        {
          id: 'table',
          type: randomPipelineStepTypes.LOOKUP_TABLE,
          sourceId: 'reaction-table',
          targetAggregateId: 'result',
          outputId: 'table-result',
          label: 'Reaction',
        },
      ],
      primaryAggregateId: 'table-result',
    };

    const result = executeRandomDefinition({
      definition,
      sources: [d6, table],
      rng: sequenceRng([0.85, 0.2]),
    });

    expect(result.aggregates.find((aggregate) => aggregate.id === 'result')?.value).toBe(8);
    expect(result.primaryAggregate).toMatchObject({
      id: 'table-result',
      value: 'Curieux',
      matchedValue: 8,
      outcome: {
        label: 'Curieux',
        text: 'Le PNJ ecoute avant de se prononcer.',
      },
    });
  });
});
