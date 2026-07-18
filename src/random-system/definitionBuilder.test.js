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
import { createStandardSources, standardSourceIds } from './defaults.js';
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
    draft.visualId = 'd10';
    draft.components[0].sourceMode = builderModes.REQUEST;
    draft.keepMode = 'lowest';
    draft.keepCount = 1;
    draft.modifierEnabled = true;

    const first = buildRandomDefinition(draft);
    const second = buildRandomDefinition(definitionToDraft(first, sources));
    expect(first.visualId).toBe('d10');
    expect(second).toEqual(first);
  });

  it('exposes repeatable rolls, bounded explosions and requested inputs without code', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.recursive = true;
    draft.components[0].sourceMode = builderModes.REQUEST;
    draft.components[0].sourceChoices = [standardSourceIds.D6, standardSourceIds.D8];
    draft.components[0].countMode = builderModes.PROMPT;
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionLimit = 100;

    const definition = buildRandomDefinition(draft);
    expect(definition.recursive).toBe(true);
    expect(definition.parameters).toMatchObject([
      { type: 'source', choices: [standardSourceIds.D6, standardSourceIds.D8] },
      { type: 'integer', prompt: true, defaultValue: '' },
    ]);
    expect(definition.pipeline.find((step) => step.type === randomPipelineStepTypes.EXPLODE))
      .toMatchObject({ maxIterations: 100 });
    expect(buildRandomDefinition(definitionToDraft(definition, sources))).toEqual(definition);
  });

  it('builds several named result counters from the no-code draft', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.counters = [
      { id: 'critical', label: 'Critiques', operator: 'gte', value: 20 },
      { id: 'fumble', label: 'Complications', operator: 'eq', value: 1 },
    ];

    const definition = buildRandomDefinition(draft);
    const counters = definition.pipeline.filter((step) => (
      step.type === randomPipelineStepTypes.AGGREGATE
      && step.operation === randomAggregateOperations.COUNT_MATCHES
    ));
    expect(counters.map((counter) => [counter.outputId, counter.label])).toEqual([
      ['counter-critical', 'Critiques'],
      ['counter-fumble', 'Complications'],
    ]);
    expect(buildRandomDefinition(definitionToDraft(definition, sources))).toEqual(definition);
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
    draft.components[0].sourceId = standardSourceIds.D4;
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

  it('creates d20 advantage and disadvantage entirely from the no-code draft', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'd20 avantage';
    draft.rollOptions = [{
      id: 'approach',
      label: 'Approche',
      control: 'slider',
      defaultValue: 'normal',
      choices: [
        { value: 'disadvantage', label: 'Désavantage' },
        { value: 'normal', label: 'Normal' },
        { value: 'advantage', label: 'Avantage' },
      ],
    }];
    const branch = (id, count, value, keepMode = 'none') => ({
      ...draft.components[0],
      id,
      label: value,
      sourceId: standardSourceIds.D20,
      count,
      enabledWhen: [{ optionId: 'approach', equals: value }],
      calculation: {
        ...createCalculationDraft(keepMode !== 'none'),
        keepMode,
        keepCount: 1,
      },
    });
    draft.components = [
      branch('disadvantage', 2, 'disadvantage', 'lowest'),
      branch('normal', 1, 'normal'),
      branch('advantage', 2, 'advantage', 'highest'),
    ];
    draft.modifierEnabled = true;
    draft.modifierMode = builderModes.PROMPT;

    const definition = buildRandomDefinition(draft);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { modifier: 2 },
      options: { approach: 'advantage' },
      rng: () => [0.1, 0.9][index++],
    });

    expect(result.draws).toHaveLength(2);
    expect(result.primaryAggregate.value).toBe(21);
    expect(buildRandomDefinition(definitionToDraft(definition, sources))).toEqual(definition);
  });

  it('composes the d20 mode and Cosmere stakes as two independent no-code choices', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'Cosmere';
    draft.rollOptions = [
      {
        id: 'approach',
        label: 'Approche',
        control: 'slider',
        defaultValue: 'normal',
        choices: [
          { value: 'disadvantage', label: 'Désavantage' },
          { value: 'normal', label: 'Normal' },
          { value: 'advantage', label: 'Avantage' },
        ],
      },
      {
        id: 'stakes',
        label: 'Monter les enjeux',
        control: 'switch',
        defaultValue: 'none',
        choices: [
          { value: 'none', label: 'Non' },
          { value: 'raise', label: 'Oui' },
        ],
      },
    ];
    const branch = (id, count, value, keepMode = 'none') => ({
      ...draft.components[0],
      id,
      sourceId: standardSourceIds.D20,
      count,
      enabledWhen: [{ optionId: 'approach', equals: value }],
      calculation: {
        ...createCalculationDraft(keepMode !== 'none'),
        keepMode,
        keepCount: 1,
      },
    });
    draft.components = [
      branch('disadvantage', 2, 'disadvantage', 'lowest'),
      branch('normal', 1, 'normal'),
      branch('advantage', 2, 'advantage', 'highest'),
      {
        ...draft.components[0],
        id: 'intrigue',
        label: 'Dé d’intrigue',
        sourceId: standardSourceIds.D6,
        count: 1,
        enabledWhen: [{ optionId: 'stakes', equals: 'raise' }],
      },
    ];
    draft.modifierEnabled = true;
    draft.modifierMode = builderModes.PROMPT;

    const definition = buildRandomDefinition(draft);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { modifier: 2 },
      options: { approach: 'advantage', stakes: 'raise' },
      rng: () => [0.1, 0.9, 0.5][index++],
    });

    expect(definition.options).toHaveLength(2);
    expect(result.draws).toHaveLength(3);
    expect(result.primaryAggregate.value).toBe(25);
  });

  it('creates the reusable standard dice roll with conditional explosion and reroll', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'Dés standards';
    draft.recursive = true;
    draft.rollOptions = [{
      id: 'mode',
      label: 'Mode',
      control: 'slider',
      defaultValue: 'standard',
      choices: [
        { value: 'standard', label: 'Standard' },
        { value: 'explosion', label: 'Explosion' },
        { value: 'reroll', label: 'Relance' },
      ],
    }];
    draft.components[0].sourceMode = builderModes.REQUEST;
    draft.components[0].sourceId = standardSourceIds.D6;
    draft.components[0].sourceChoices = [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
    ];
    draft.components[0].countMode = builderModes.PROMPT;
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionEnabledWhen = [{ optionId: 'mode', equals: 'explosion' }];
    draft.components[0].reroll = {
      enabled: true,
      operator: 'eq',
      value: 1,
      maxIterations: 1,
      enabledWhen: [{ optionId: 'mode', equals: 'reroll' }],
    };
    draft.modifierEnabled = true;
    draft.modifierMode = builderModes.PROMPT;

    const definition = buildRandomDefinition(draft);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: {
        [`source-${draft.components[0].id}`]: standardSourceIds.D6,
        [`count-${draft.components[0].id}`]: 1,
        modifier: 2,
      },
      options: { mode: 'explosion' },
      rng: () => [0.99, 0][index++],
    });

    expect(definition.recursive).toBe(true);
    expect(result.draws).toHaveLength(2);
    expect(result.primaryAggregate.value).toBe(9);
    expect(buildRandomDefinition(definitionToDraft(definition, sources))).toEqual(definition);
  });

  it('creates Shadowrun successes complications and the exploding chance mode without code', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'Shadowrun';
    draft.rollOptions = [{
      id: 'chance',
      label: 'Jet de chance',
      control: 'switch',
      defaultValue: 'standard',
      choices: [
        { value: 'standard', label: 'Standard' },
        { value: 'chance', label: 'Chance' },
      ],
    }];
    draft.components[0].sourceId = standardSourceIds.D6;
    draft.components[0].countMode = builderModes.PROMPT;
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionEnabledWhen = [{ optionId: 'chance', equals: 'chance' }];
    draft.resultMode = builderResultModes.SUCCESSES;
    draft.threshold = 5;
    draft.thresholdOperator = 'gte';
    draft.counters = [{ id: 'ones', label: 'Complications', operator: 'eq', value: 1 }];

    const definition = buildRandomDefinition(draft);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: { [`count-${draft.components[0].id}`]: 1 },
      options: { chance: 'chance' },
      rng: () => [0.99, 0.99, 0][index++],
    });

    expect(result.primaryAggregate.value).toBe(2);
    expect(result.aggregates.find((aggregate) => aggregate.id === 'counter-ones')?.value).toBe(1);
    expect(buildRandomDefinition(definitionToDraft(definition, sources))).toEqual(definition);
  });

  it('creates the exploding L5R pool with a requested keep count without code', () => {
    const sources = createStandardSources();
    const draft = createDefinitionDraft(sources);
    draft.name = 'L5R';
    draft.components[0].sourceId = standardSourceIds.D10;
    draft.components[0].countMode = builderModes.PROMPT;
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.keepMode = 'highest';
    draft.keepCountMode = builderModes.PROMPT;

    const definition = buildRandomDefinition(draft);
    let index = 0;
    const result = executeRandomDefinition({
      definition,
      sources,
      parameters: {
        [`count-${draft.components[0].id}`]: 3,
        'keep-count': 2,
      },
      rng: () => [0.8, 0.2, 0.5][index++],
    });

    expect(result.primaryAggregate.value).toBe(15);
    expect(definition.parameters.map((parameter) => parameter.id)).toEqual([
      `count-${draft.components[0].id}`,
      'keep-count',
    ]);
  });
});
