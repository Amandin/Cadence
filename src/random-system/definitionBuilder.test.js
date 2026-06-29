import { describe, expect, it } from 'vitest';
import {
  buildRandomDefinition,
  builderDefinitionKinds,
  builderExplosionModes,
  builderExplosionTriggers,
  builderModes,
  builderResultModes,
  createCalculationDraft,
  createDefinitionDraft,
  definitionToDraft,
} from './definitionBuilder.js';
import { createStandardSources } from './defaults.js';
import {
  executeRandomDefinition,
  randomAggregateOperations,
  randomPipelineStepTypes,
} from './engine.js';

describe('RandomSystem definition builder', () => {
  it('builds requested parameters and optional behavior without scripts', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'Pool maison';
    draft.components[0].countMode = builderModes.REQUEST;
    draft.components[0].count = 4;
    draft.components[0].explosionMode = builderExplosionModes.OPTION;
    draft.resultMode = builderResultModes.SUCCESSES;
    draft.thresholdMode = builderModes.REQUEST;
    draft.threshold = 5;
    draft.occurrenceBonus.enabled = true;

    const definition = buildRandomDefinition(draft);
    expect(definition.parameters.map((parameter) => parameter.label)).toEqual([
      'Groupe 1 - quantité',
      'Seuil',
    ]);
    expect(definition.options).toMatchObject([{ id: 'exploding', defaultValue: false }]);
    expect(definition.pipeline.map((step) => step.type)).toEqual([
      randomPipelineStepTypes.EXPLODE,
      randomPipelineStepTypes.SUCCESS_THRESHOLD,
      randomPipelineStepTypes.AGGREGATE,
      randomPipelineStepTypes.OCCURRENCE_BONUS,
    ]);
    expect(definition.pipeline.find((step) => step.type === randomPipelineStepTypes.AGGREGATE).operation)
      .toBe(randomAggregateOperations.COUNT_SUCCESSES);
  });

  it('round-trips definitions through an editable draft', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'Deux sources';
    draft.components[0].sourceMode = builderModes.REQUEST;
    draft.keepMode = 'lowest';
    draft.keepCount = 1;
    draft.modifierEnabled = true;

    const first = buildRandomDefinition(draft);
    const second = buildRandomDefinition(definitionToDraft(first, sources));
    expect(second).toEqual(first);
  });

  it('produces definitions directly executable by the engine', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].count = 2;
    draft.modifierEnabled = true;
    draft.modifier = 3;
    const definition = buildRandomDefinition(draft);
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { modifier: 3 },
      rng: () => 0,
    });
    expect(result.primaryAggregate.value).toBe(5);
  });

  it('supports scoped group calculations and a configurable explosion threshold', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].count = 2;
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionTrigger = builderExplosionTriggers.THRESHOLD;
    draft.components[0].explosionThreshold = 3;
    draft.components[0].reroll.enabled = true;
    draft.components[0].reroll.value = 1;
    draft.components[0].calculation.enabled = true;
    draft.components[0].calculation.modifierEnabled = true;

    const definition = buildRandomDefinition(draft);
    const componentId = draft.components[0].id;
    const scopedAggregate = definition.pipeline.find(
      (step) => step.outputId === `${componentId}-result`,
    );
    const explosion = definition.pipeline.find(
      (step) => step.type === randomPipelineStepTypes.EXPLODE,
    );
    const reroll = definition.pipeline.find(
      (step) => step.type === randomPipelineStepTypes.REROLL,
    );

    expect(scopedAggregate.componentIds).toEqual([componentId]);
    expect(explosion).toMatchObject({
      componentIds: [componentId],
      condition: {
        type: 'compare',
        operator: 'gte',
        value: { kind: 'fixed', value: 3 },
      },
    });
    expect(reroll.componentIds).toEqual([componentId]);
    expect(definition.parameters.map((parameter) => parameter.id))
      .toContain(`${componentId}-modifier`);
  });

  it('calculates each enabled group before the overall result', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].count = 2;
    draft.components[0].calculation.enabled = true;
    draft.components.push({
      ...draft.components[0],
      id: 'second-group',
      label: 'Second groupe',
      count: 1,
      calculation: createCalculationDraft(true),
    });

    const definition = buildRandomDefinition(draft);
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => 0,
    });

    expect(result.aggregates.map((aggregate) => [aggregate.id, aggregate.value]))
      .toEqual([
        [`${draft.components[0].id}-result`, 2],
        ['second-group-result', 1],
        ['result', 3],
      ]);
  });

  it('explodes from a configured inclusive threshold', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].sourceId = 'standard-d10';
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionTrigger = builderExplosionTriggers.THRESHOLD;
    draft.components[0].explosionThreshold = 9;
    const values = [0.85, 0];
    let index = 0;

    const result = executeRandomDefinition({
      definition: buildRandomDefinition(draft),
      sources,
      rng: () => values[index++] ?? 0,
    });

    expect(result.draws.map((draw) => draw.outcome.value)).toEqual([9, 1]);
  });

  it('preserves optional group names and colors in draws', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].label = '';
    draft.components[0].color = '#e11d48';

    const definition = buildRandomDefinition(draft);
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => 0,
    });

    expect(definition.components[0]).toMatchObject({ label: '', color: '#e11d48' });
    expect(result.draws[0]).toMatchObject({
      componentLabel: '',
      componentColor: '#e11d48',
    });
  });

  it('compiles configurable roll combinations instead of a fixed advantage option', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.kind = builderDefinitionKinds.COMBINATION;
    draft.exposed = false;
    draft.combination = {
      enabled: true,
      label: 'Approche',
      control: 'select',
      defaultChoiceId: 'other',
      choices: [
        { id: 'single', label: 'Simple', definitionId: '' },
        { id: 'other', label: 'Autre', definitionId: 'other-roll' },
      ],
    };

    const definition = buildRandomDefinition(draft);
    expect(definition.options[0]).toMatchObject({
      id: 'combination',
      label: 'Approche',
      control: 'select',
      defaultValue: 'other',
      choices: [
        { value: 'single', label: 'Simple' },
        { value: 'other', label: 'Autre' },
      ],
    });
    expect(definition.pipeline[0]).toMatchObject({
      type: randomPipelineStepTypes.REPEAT_SELECT,
      variants: {
        single: { definitionId: undefined },
        other: { definitionId: 'other-roll' },
      },
    });
    expect(definition.exposed).toBe(true);
  });

  it('builds subtraction as a generic aggregate', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.components[0].count = 3;
    draft.resultMode = builderResultModes.SUBTRACT;

    const definition = buildRandomDefinition(draft);
    expect(definition.pipeline.find((step) => step.type === randomPipelineStepTypes.AGGREGATE))
      .toMatchObject({ operation: randomAggregateOperations.SUBTRACT });
    const result = executeRandomDefinition({
      definition,
      sources,
      rng: () => 0.5,
    });
    expect(result.primaryAggregate.value).toBe(-3);
  });
});
