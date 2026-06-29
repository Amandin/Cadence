import { describe, expect, it } from 'vitest';
import {
  combinationTargetDefinition,
  definitionIsReferenced,
  prepareCombinedDefinition,
} from './combinations.js';
import {
  createUniformSource,
  executeRandomDefinition,
  fixedValue,
  parameterValue,
  randomAggregateOperations,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';

function simpleDefinition(id, sourceId) {
  return {
    id,
    name: id,
    components: [{ id: 'roll', source: fixedValue(sourceId), count: fixedValue(1) }],
    pipeline: [{
      id: 'total',
      type: randomPipelineStepTypes.AGGREGATE,
      operation: randomAggregateOperations.SUM,
      outputId: 'total',
    }],
    primaryAggregateId: 'total',
  };
}

describe('RandomSystem definition combinations', () => {
  it('protects definitions referenced by a combination', () => {
    const target = simpleDefinition('target', 'd6');
    const combination = {
      ...simpleDefinition('parent', 'd6'),
      pipeline: [{
        id: 'mode',
        type: randomPipelineStepTypes.REPEAT_SELECT,
        variants: {
          default: { definitionId: 'target', repetitions: 1, select: 'first' },
        },
      }],
    };

    expect(definitionIsReferenced([combination, target], 'target')).toBe(true);
    expect(definitionIsReferenced([combination, target], 'parent')).toBe(false);
  });

  it('can execute a completely different referenced definition', () => {
    const d6 = createUniformSource({ id: 'd6', name: 'd6', min: 1, max: 6 });
    const d20 = createUniformSource({ id: 'd20', name: 'd20', min: 1, max: 20 });
    const alternative = {
      ...simpleDefinition('alternative', 'd20'),
      parameters: [{
        id: 'dice',
        label: 'Dés',
        type: randomParameterTypes.INTEGER,
        defaultValue: 1,
        min: 1,
        max: 10,
      }],
      components: [{
        id: 'roll',
        source: fixedValue('d20'),
        count: parameterValue('dice'),
      }],
    };
    const parent = {
      ...simpleDefinition('parent', 'd6'),
      options: [{
        id: 'mode',
        label: 'Mode',
        type: randomOptionTypes.CHOICE,
        defaultValue: 'other',
        choices: [{ value: 'other', label: 'Autre' }],
      }],
      pipeline: [
        {
          id: 'mode',
          type: randomPipelineStepTypes.REPEAT_SELECT,
          optionId: 'mode',
          variants: {
            other: {
              definitionId: 'alternative',
              repetitions: 2,
              select: 'sum',
              aggregateId: 'total',
            },
          },
        },
        ...simpleDefinition('parent', 'd6').pipeline,
      ],
    };

    expect(combinationTargetDefinition(parent, [parent, alternative], { mode: 'other' }).id)
      .toBe('alternative');
    const prepared = prepareCombinedDefinition(parent, [parent, alternative], { mode: 'other' });
    const result = executeRandomDefinition({
      definition: prepared.definition,
      sources: [d6, d20],
      parameters: { dice: 2 },
      rng: () => 0.5,
    });

    expect(result.definitionId).toBe('parent');
    expect(result.draws.map((draw) => draw.sourceId)).toEqual(['d20', 'd20', 'd20', 'd20']);
    expect(result.primaryAggregate.value).toBe(44);
  });
});
