import { describe, expect, it } from 'vitest';
import { createStandardSources } from './defaults.js';
import { buildRandomDefinition } from './definitionBuilder.js';
import { executeRandomDefinition, randomPipelineStepTypes } from './engine.js';
import {
  createDnd5DefaultDefinitions,
  createNoCodeExampleDraft,
  dnd5InitiativeDefinitionId,
  noCodeExampleCatalog,
} from './noCodeExamples.js';

describe('No-code roll examples', () => {
  const sources = createStandardSources();

  it('compiles every proposed example through the no-code builder', () => {
    expect(noCodeExampleCatalog.map((example) => example.id)).toEqual([
      'd20-advantage',
      'cosmere',
      'standard-dice',
      'shadowrun',
      'l5r',
      'daggerheart',
      'pbta',
      'savage-worlds',
      'year-zero',
      'd10-success-pool',
      'percentile',
    ]);
    noCodeExampleCatalog.forEach((example) => {
      const definition = buildRandomDefinition(createNoCodeExampleDraft(example.id, sources));
      expect(definition.name).toBe(example.name);
      expect(definition.components.length).toBeGreaterThan(0);
      expect(definition.primaryAggregateId).toBeTruthy();
    });
  });

  it('models Daggerheart advantage and disadvantage with opposite d6 contributions', () => {
    const definition = buildRandomDefinition(createNoCodeExampleDraft('daggerheart', sources));
    let disadvantageIndex = 0;
    const disadvantage = executeRandomDefinition({
      definition,
      sources,
      parameters: { modifier: 3 },
      options: { approach: 'disadvantage' },
      rng: () => [0.1, 0.5, 0.5][disadvantageIndex++],
    });
    let advantageIndex = 0;
    const advantage = executeRandomDefinition({
      definition,
      sources,
      parameters: { modifier: 3 },
      options: { approach: 'advantage' },
      rng: () => [0.1, 0.5, 0.5][advantageIndex++],
    });

    expect(disadvantage.primaryAggregate.value).toBe(8);
    expect(advantage.primaryAggregate.value).toBe(16);
    expect(definition.components.filter((component) => ['hope-d12', 'fear-d12'].includes(component.id)))
      .toMatchObject([
        { id: 'hope-d12', count: { kind: 'fixed', value: 1 }, color: '#2f8f83' },
        { id: 'fear-d12', count: { kind: 'fixed', value: 1 }, color: '#8b5cf6' },
      ]);
    expect(definition.components.find((component) => component.id === 'disadvantage-d6')?.multiplier).toBe(-1);
  });

  it('prepares the D&D5 starter set with the advantage d20 first for initiative', () => {
    const definitions = createDnd5DefaultDefinitions(sources);
    expect(definitions.map((definition) => definition.id)).toEqual([
      dnd5InitiativeDefinitionId,
      'default-dnd5-standard-dice',
    ]);
    expect(definitions.map((definition) => definition.active)).toEqual([true, true]);
    expect(definitions[0].options[0].defaultValue).toBe('normal');
  });

  it('prefills representative classic mechanics instead of only their names', () => {
    const savage = buildRandomDefinition(createNoCodeExampleDraft('savage-worlds', sources));
    const yearZero = buildRandomDefinition(createNoCodeExampleDraft('year-zero', sources));
    const percentile = buildRandomDefinition(createNoCodeExampleDraft('percentile', sources));

    expect(savage.pipeline.filter((step) => step.type === randomPipelineStepTypes.EXPLODE)).toHaveLength(2);
    expect(savage.pipeline.some((step) => step.type === randomPipelineStepTypes.KEEP)).toBe(true);
    expect(yearZero.components).toHaveLength(3);
    expect(yearZero.components.map((component) => component.color).filter(Boolean)).toHaveLength(3);
    expect(percentile.parameters.some((parameter) => parameter.id === 'threshold' && parameter.prompt)).toBe(true);
  });
});
