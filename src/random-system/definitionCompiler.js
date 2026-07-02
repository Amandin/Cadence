import {
  fixedValue,
  normalizeRandomDefinition,
  parameterValue,
  randomAggregateOperations,
  randomChoiceControlKinds,
  randomDefinitionKinds,
  randomKeepOrders,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';
import {
  builderExplosionModes,
  builderExplosionTriggers,
  builderModes,
  builderResultModes,
} from './definitionDraft.js';

function addParameter(parameters, parameter) {
  if (!parameters.some((item) => item.id === parameter.id)) parameters.push(parameter);
}

function valueFromMode(mode, fixed, parameterId, parameters, parameter) {
  if (mode !== builderModes.REQUEST) return fixedValue(fixed);
  addParameter(parameters, { ...parameter, id: parameterId });
  return parameterValue(parameterId);
}

function comparisonCondition(operator, value, field = 'raw') {
  return {
    type: 'compare',
    field,
    operator,
    value: fixedValue(value),
  };
}

function explosionSteps(draft) {
  return draft.components
    .filter((component) => component.explosionMode !== builderExplosionModes.NEVER)
    .map((component) => ({
      id: `explode-${component.id}`,
      type: randomPipelineStepTypes.EXPLODE,
      componentIds: [component.id],
      condition: component.explosionTrigger === builderExplosionTriggers.THRESHOLD
        ? comparisonCondition('gte', Number(component.explosionThreshold) || 0)
        : { type: 'source-extreme', extreme: 'max' },
      maxIterations: 20,
      enabledWhen: component.explosionMode === builderExplosionModes.OPTION
        ? { optionId: 'exploding', equals: true }
        : null,
    }));
}

function buildComponents(draft, parameters) {
  return draft.components.map((component) => {
    const label = String(component.label || '').trim();
    return {
      id: component.id,
      label,
      color: component.color,
      source: valueFromMode(
        component.sourceMode,
        component.sourceId,
        `source-${component.id}`,
        parameters,
        {
          label: label ? `${label} - source` : 'Source',
          type: randomParameterTypes.SOURCE,
          defaultValue: component.sourceId,
        },
      ),
      count: valueFromMode(
        component.countMode,
        Math.max(0, Number(component.count) || 0),
        `count-${component.id}`,
        parameters,
        {
          label: label ? `${label} - quantité` : 'Quantité',
          type: randomParameterTypes.INTEGER,
          defaultValue: Math.max(1, Number(component.count) || 1),
          min: 1,
          max: 1000,
        },
      ),
    };
  });
}

function buildRollOptions(draft) {
  const options = [];
  if (draft.components.some((item) => item.explosionMode === builderExplosionModes.OPTION)) {
    options.push({
      id: 'exploding',
      label: 'Explosion',
      type: randomOptionTypes.BOOLEAN,
      defaultValue: false,
    });
  }
  return options;
}

function buildCombinationDefinition(draft) {
  const choices = draft.combination.choices.length
    ? draft.combination.choices
    : [{ id: 'default', label: 'Standard', definitionId: '' }];
  const fallbackControl = choices.length === 2
    ? randomChoiceControlKinds.SWITCH
    : choices.length <= 5
      ? randomChoiceControlKinds.SLIDER
      : randomChoiceControlKinds.SELECT;
  return normalizeRandomDefinition({
    id: draft.id,
    name: String(draft.name || '').trim() || 'Combinaison sans nom',
    kind: randomDefinitionKinds.COMBINATION,
    exposed: true,
    active: draft.active !== false,
    parameters: [],
    options: [{
      id: 'combination',
      label: String(draft.combination.label || '').trim() || 'Mode',
      type: randomOptionTypes.CHOICE,
      defaultValue: choices.some((choice) => choice.id === draft.combination.defaultChoiceId)
        ? draft.combination.defaultChoiceId
        : choices[0].id,
      control: Object.values(randomChoiceControlKinds).includes(draft.combination.control)
        && draft.combination.control !== randomChoiceControlKinds.AUTO
        ? draft.combination.control
        : fallbackControl,
      choices: choices.map((choice) => ({
        value: choice.id,
        label: String(choice.label || '').trim() || choice.id,
      })),
    }],
    components: [],
    pipeline: [{
      id: 'combination',
      type: randomPipelineStepTypes.REPEAT_SELECT,
      optionId: 'combination',
      variants: Object.fromEntries(choices.map((choice) => [
        choice.id,
        {
          definitionId: choice.definitionId || undefined,
        },
      ])),
    }],
    primaryAggregateId: '',
  });
}

function appendInputTransforms(pipeline, draft) {
  draft.components.forEach((component) => {
    if (!component.reroll?.enabled) return;
    pipeline.push({
      id: `reroll-${component.id}`,
      type: randomPipelineStepTypes.REROLL,
      componentIds: [component.id],
      condition: comparisonCondition(component.reroll.operator, component.reroll.value),
      maxIterations: Math.max(1, Number(component.reroll.maxIterations) || 1),
    });
  });
  pipeline.push(...explosionSteps(draft));
  if (draft.customValue.enabled) {
    pipeline.push({
      id: 'custom-value',
      type: randomPipelineStepTypes.MAP_VALUE,
      mappings: [{
        condition: comparisonCondition(draft.customValue.operator, draft.customValue.value),
        value: fixedValue(Number(draft.customValue.mappedValue) || 0),
      }],
    });
  }
}

function appendCalculation(pipeline, calculation, parameters, {
  componentIds = [],
  idPrefix = '',
  label = 'Resultat',
  outputId = 'result',
} = {}) {
  const prefix = idPrefix ? `${idPrefix}-` : '';
  const scopedLabel = idPrefix && label ? `${label} - ` : '';
  if (calculation.resultMode === builderResultModes.SUCCESSES) {
    const threshold = valueFromMode(
      calculation.thresholdMode,
      Number(calculation.threshold) || 0,
      `${prefix}threshold`,
      parameters,
      {
        label: `${scopedLabel}Seuil`,
        type: randomParameterTypes.NUMBER,
        defaultValue: Number(calculation.threshold) || 0,
      },
    );
    pipeline.push({
      id: `${prefix}success-threshold`,
      type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
      componentIds,
      condition: { type: 'compare', operator: 'gte', value: threshold },
    });
  }
  if (calculation.keepMode !== 'none') {
    const keepCount = valueFromMode(
      calculation.keepCountMode,
      Math.max(1, Number(calculation.keepCount) || 1),
      `${prefix}keep-count`,
      parameters,
      {
        label: `${scopedLabel}Résultats gardés`,
        type: randomParameterTypes.INTEGER,
        defaultValue: Math.max(1, Number(calculation.keepCount) || 1),
        min: 1,
        max: 1000,
      },
    );
    pipeline.push({
      id: `${prefix}keep`,
      type: randomPipelineStepTypes.KEEP,
      componentIds,
      count: keepCount,
      unit: 'chain',
      order: calculation.keepMode === randomKeepOrders.LOWEST
        ? randomKeepOrders.LOWEST
        : randomKeepOrders.HIGHEST,
    });
  }

  const operation = calculation.resultMode === builderResultModes.VALUES
    ? randomAggregateOperations.VALUES
    : calculation.resultMode === builderResultModes.SUBTRACT
      ? randomAggregateOperations.SUBTRACT
      : calculation.resultMode === builderResultModes.SUCCESSES
        ? randomAggregateOperations.COUNT_SUCCESSES
        : randomAggregateOperations.SUM;
  pipeline.push({
    id: `${prefix}aggregate`,
    type: randomPipelineStepTypes.AGGREGATE,
    componentIds,
    operation,
    outputId,
    label: calculation.resultMode === builderResultModes.SUCCESSES
      ? `${scopedLabel}Succès`
      : label || 'Résultat',
  });

  if (calculation.modifierEnabled && calculation.resultMode !== builderResultModes.VALUES) {
    const modifier = valueFromMode(
      builderModes.REQUEST,
      Number(calculation.modifier) || 0,
      `${prefix}modifier`,
      parameters,
      {
        label: `${scopedLabel}Modificateur`,
        type: randomParameterTypes.NUMBER,
        defaultValue: Number(calculation.modifier) || 0,
      },
    );
    pipeline.push({
      id: `${prefix}modifier`,
      type: randomPipelineStepTypes.MODIFIER,
      targetAggregateId: outputId,
      value: modifier,
      label: 'Modificateur',
    });
  }
}

function appendCalculations(pipeline, draft, parameters) {
  draft.components.forEach((component) => {
    if (!component.calculation?.enabled) return;
    appendCalculation(pipeline, component.calculation, parameters, {
      componentIds: [component.id],
      idPrefix: component.id,
      label: component.label,
      outputId: `${component.id}-result`,
    });
  });
  if (draft.marker.enabled) {
    pipeline.push({
      id: 'marker',
      type: randomPipelineStepTypes.MARKER,
      markerId: 'marker',
      label: String(draft.marker.label || '').trim() || 'Marqueur',
      condition: comparisonCondition(draft.marker.operator, draft.marker.value),
    });
  }
  appendCalculation(pipeline, draft, parameters);
  if (draft.occurrenceBonus.enabled && draft.resultMode !== builderResultModes.VALUES) {
    pipeline.push({
      id: 'occurrence-bonus',
      type: randomPipelineStepTypes.OCCURRENCE_BONUS,
      targetAggregateId: 'result',
      condition: comparisonCondition(draft.occurrenceBonus.operator, draft.occurrenceBonus.value),
      every: fixedValue(Math.max(1, Number(draft.occurrenceBonus.every) || 1)),
      amount: fixedValue(Number(draft.occurrenceBonus.amount) || 0),
      label: 'Bonus d occurrence',
    });
  }
  if (draft.linkedTable?.enabled && draft.linkedTable.sourceId) {
    pipeline.push({
      id: 'linked-table',
      type: randomPipelineStepTypes.LOOKUP_TABLE,
      sourceId: draft.linkedTable.sourceId,
      targetAggregateId: 'result',
      outputId: 'table-result',
      label: String(draft.linkedTable.label || '').trim() || 'Table',
    });
  }
}

export function buildRandomDefinition(draft) {
  if (draft.kind === randomDefinitionKinds.COMBINATION) {
    return buildCombinationDefinition(draft);
  }
  const parameters = [];
  const components = buildComponents(draft, parameters);
  const pipeline = [];
  appendInputTransforms(pipeline, draft);
  appendCalculations(pipeline, draft, parameters);
  return normalizeRandomDefinition({
    id: draft.id,
    name: String(draft.name || '').trim() || 'Lancer sans nom',
    kind: randomDefinitionKinds.ROLL,
    exposed: draft.exposed,
    active: draft.active !== false,
    parameters,
    options: buildRollOptions(draft),
    components,
    pipeline,
    primaryAggregateId: draft.linkedTable?.enabled && draft.linkedTable.sourceId ? 'table-result' : 'result',
  });
}
