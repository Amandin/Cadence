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
  if (mode !== builderModes.REQUEST && mode !== builderModes.PROMPT) return fixedValue(fixed);
  addParameter(parameters, {
    ...parameter,
    id: parameterId,
    prompt: mode === builderModes.PROMPT,
  });
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

function enabledWhenFromDraft(value) {
  const conditions = (Array.isArray(value) ? value : value ? [value] : [])
    .filter((condition) => condition?.optionId)
    .map((condition) => ({
      optionId: String(condition.optionId),
      equals: condition.equals,
    }));
  if (!conditions.length) return null;
  return conditions.length === 1 ? conditions[0] : conditions;
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
      maxIterations: Math.max(1, Math.min(100, Number(component.explosionLimit) || 100)),
      enabledWhen: enabledWhenFromDraft(component.explosionEnabledWhen)
        || (component.explosionMode === builderExplosionModes.OPTION
          ? { optionId: 'exploding', equals: true }
          : null),
    }));
}

function buildComponents(draft, parameters) {
  return draft.components.map((component) => {
    const label = String(component.label || '').trim();
    return {
      id: component.id,
      label,
      color: component.color,
      multiplier: component.contribution === 'subtract' ? -1 : 1,
      source: valueFromMode(
        component.sourceMode,
        component.sourceId,
        `source-${component.id}`,
        parameters,
        {
          label: label ? `${label} - source` : 'Source',
          type: randomParameterTypes.SOURCE,
          defaultValue: component.sourceId,
          choices: component.sourceChoices || [],
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
          defaultValue: Math.max(0, Number(component.count) || 0),
          min: 0,
          max: 1000,
        },
      ),
      enabledWhen: enabledWhenFromDraft(component.enabledWhen),
    };
  });
}

function buildRollOptions(draft) {
  const options = (draft.rollOptions || []).map((option, index) => {
    const choices = (option.choices || []).map((choice, choiceIndex) => ({
      value: String(choice.value || `choice-${choiceIndex + 1}`),
      label: String(choice.label || '').trim() || `Choix ${choiceIndex + 1}`,
    }));
    const fallbackControl = choices.length === 2
      ? randomChoiceControlKinds.SWITCH
      : choices.length <= 5
        ? randomChoiceControlKinds.SLIDER
        : randomChoiceControlKinds.SELECT;
    return {
      id: String(option.id || `option-${index + 1}`),
      label: String(option.label || '').trim() || `Choix ${index + 1}`,
      type: randomOptionTypes.CHOICE,
      defaultValue: choices.some((choice) => choice.value === option.defaultValue)
        ? option.defaultValue
        : choices[0]?.value || '',
      control: Object.values(randomChoiceControlKinds).includes(option.control)
        && option.control !== randomChoiceControlKinds.AUTO
        ? option.control
        : fallbackControl,
      choices,
    };
  });
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
    visualId: draft.visualId,
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
      enabledWhen: enabledWhenFromDraft(component.reroll.enabledWhen),
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
  enabledWhen = null,
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
      condition: {
        type: 'compare',
        operator: calculation.thresholdOperator || 'gte',
        value: threshold,
      },
      enabledWhen,
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
      enabledWhen,
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
    enabledWhen,
    label: calculation.resultMode === builderResultModes.SUCCESSES
      ? `${scopedLabel}Succès`
      : label || 'Résultat',
  });

  if (calculation.modifierEnabled && calculation.resultMode !== builderResultModes.VALUES) {
    const modifier = valueFromMode(
      calculation.modifierMode || builderModes.REQUEST,
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
      enabledWhen,
      label: 'Modificateur',
    });
  }

  (calculation.counters || []).forEach((counter, index) => {
    pipeline.push({
      id: `${prefix}counter-${counter.id || index + 1}`,
      type: randomPipelineStepTypes.AGGREGATE,
      componentIds,
      operation: randomAggregateOperations.COUNT_MATCHES,
      condition: comparisonCondition(counter.operator || 'eq', counter.value),
      outputId: `${prefix}counter-${counter.id || index + 1}`,
      enabledWhen,
      label: String(counter.label || '').trim() || `Compteur ${index + 1}`,
    });
  });
}

function appendCalculations(pipeline, draft, parameters) {
  draft.components.forEach((component) => {
    if (!component.calculation?.enabled) return;
    appendCalculation(pipeline, component.calculation, parameters, {
      componentIds: [component.id],
      idPrefix: component.id,
      label: component.label,
      outputId: `${component.id}-result`,
      enabledWhen: enabledWhenFromDraft(component.enabledWhen),
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
    visualId: draft.visualId,
    kind: randomDefinitionKinds.ROLL,
    exposed: draft.exposed,
    active: draft.active !== false,
    recursive: draft.recursive === true,
    parameters,
    options: buildRollOptions(draft),
    components,
    pipeline,
    primaryAggregateId: draft.linkedTable?.enabled && draft.linkedTable.sourceId ? 'table-result' : 'result',
  });
}
