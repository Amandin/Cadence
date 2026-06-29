import {
  normalizeRandomDefinition,
  randomChoiceControlKinds,
  randomAggregateOperations,
  randomDefinitionKinds,
  randomPipelineStepTypes,
} from './engine.js';
import { createResourceId } from './resourceIds.js';

export const builderModes = {
  FIXED: 'fixed',
  REQUEST: 'request',
};

export const builderExplosionModes = {
  NEVER: 'never',
  ALWAYS: 'always',
  OPTION: 'option',
};

export const builderExplosionTriggers = {
  MAXIMUM: 'maximum',
  THRESHOLD: 'threshold',
};

export const builderResultModes = {
  VALUES: 'values',
  SUM: 'sum',
  SUBTRACT: 'subtract',
  SUCCESSES: 'successes',
};

export const builderDefinitionKinds = randomDefinitionKinds;

export function createCalculationDraft(enabled = false) {
  return {
    enabled,
    resultMode: builderResultModes.SUM,
    thresholdMode: builderModes.FIXED,
    threshold: 6,
    keepMode: 'none',
    keepCountMode: builderModes.FIXED,
    keepCount: 1,
    modifierEnabled: false,
    modifier: 0,
  };
}

function defaultChoiceControl(choiceCount) {
  if (choiceCount === 2) return randomChoiceControlKinds.SWITCH;
  if (choiceCount <= 5) return randomChoiceControlKinds.SLIDER;
  return randomChoiceControlKinds.SELECT;
}

export function createDefinitionDraft(sources = [], definitions = []) {
  const fallbackDefinitionId = definitions.find(
    (definition) => definition.kind !== randomDefinitionKinds.COMBINATION,
  )?.id || '';
  return {
    id: createResourceId('definition'),
    name: 'Nouveau lancer',
    kind: randomDefinitionKinds.ROLL,
    exposed: true,
    components: [{
      id: createResourceId('component'),
      label: 'Groupe 1',
      color: '',
      sourceMode: builderModes.FIXED,
      sourceId: sources[0]?.id || '',
      countMode: builderModes.FIXED,
      count: 1,
      explosionMode: builderExplosionModes.NEVER,
      explosionTrigger: builderExplosionTriggers.MAXIMUM,
      explosionThreshold: 6,
      reroll: { enabled: false, operator: 'eq', value: 1, maxIterations: 1 },
      calculation: createCalculationDraft(false),
    }],
    resultMode: builderResultModes.SUM,
    thresholdMode: builderModes.FIXED,
    threshold: 6,
    keepMode: 'none',
    keepCountMode: builderModes.FIXED,
    keepCount: 1,
    modifierEnabled: false,
    modifier: 0,
    linkedTable: {
      enabled: false,
      sourceId: sources[0]?.id || '',
      label: 'Table',
    },
    combination: {
      enabled: false,
      label: 'Mode',
      control: randomChoiceControlKinds.SLIDER,
      defaultChoiceId: 'standard',
      choices: [
        { id: 'standard', label: 'Standard', definitionId: fallbackDefinitionId },
        { id: 'higher', label: 'Plus haut', definitionId: fallbackDefinitionId },
        { id: 'lower', label: 'Plus bas', definitionId: fallbackDefinitionId },
      ],
    },
    customValue: { enabled: false, operator: 'eq', value: 1, mappedValue: 0 },
    marker: { enabled: false, operator: 'eq', value: 1, label: 'Marqueur' },
    occurrenceBonus: { enabled: false, operator: 'eq', value: 10, every: 2, amount: 2 },
  };
}

function parameterForReference(definition, reference) {
  if (reference?.kind !== 'parameter') return null;
  return definition.parameters.find((parameter) => parameter.id === reference.parameterId) || null;
}

function editableValue(reference, definition, fallback) {
  if (reference?.kind === 'parameter') {
    const parameter = parameterForReference(definition, reference);
    return { mode: builderModes.REQUEST, value: parameter?.defaultValue ?? fallback };
  }
  return { mode: builderModes.FIXED, value: reference?.value ?? fallback };
}

function conditionDraft(step, fallback) {
  return {
    enabled: !!step,
    operator: step?.condition?.operator || fallback.operator,
    value: step?.condition?.value?.value ?? fallback.value,
    maxIterations: step?.maxIterations ?? fallback.maxIterations,
  };
}

function scopedPipelineStep(definition, type, componentId = null) {
  return definition.pipeline.find((step) => (
    step.type === type
    && (componentId
      ? step.componentIds.length === 1 && step.componentIds[0] === componentId
      : step.componentIds.length === 0)
  ));
}

function calculationFromDefinition(definition, componentId = null) {
  const aggregate = scopedPipelineStep(definition, randomPipelineStepTypes.AGGREGATE, componentId);
  const threshold = scopedPipelineStep(definition, randomPipelineStepTypes.SUCCESS_THRESHOLD, componentId);
  const keep = scopedPipelineStep(definition, randomPipelineStepTypes.KEEP, componentId);
  const modifier = definition.pipeline.find((step) => (
    step.type === randomPipelineStepTypes.MODIFIER
    && step.targetAggregateId === aggregate?.outputId
  ));
  const thresholdValue = editableValue(threshold?.condition?.value, definition, 6);
  const keepValue = editableValue(keep?.count, definition, 1);
  const modifierValue = editableValue(modifier?.value, definition, 0);
  return {
    enabled: !!aggregate,
    resultMode: aggregate?.operation === randomAggregateOperations.VALUES
      ? builderResultModes.VALUES
      : aggregate?.operation === randomAggregateOperations.SUBTRACT
        ? builderResultModes.SUBTRACT
        : aggregate?.operation === randomAggregateOperations.COUNT_SUCCESSES
          ? builderResultModes.SUCCESSES
          : builderResultModes.SUM,
    thresholdMode: thresholdValue.mode,
    threshold: thresholdValue.value,
    keepMode: keep ? keep.order : 'none',
    keepCountMode: keepValue.mode,
    keepCount: keepValue.value,
    modifierEnabled: !!modifier,
    modifier: modifierValue.value,
  };
}

export function definitionToDraft(definition, sources = []) {
  if (!definition) return createDefinitionDraft(sources);
  const normalized = normalizeRandomDefinition(definition);
  const explodeSteps = normalized.pipeline.filter((step) => step.type === randomPipelineStepTypes.EXPLODE);
  const rerollSteps = normalized.pipeline.filter((step) => step.type === randomPipelineStepTypes.REROLL);
  const components = normalized.components.map((component) => {
    const source = editableValue(component.source, normalized, sources[0]?.id || '');
    const count = editableValue(component.count, normalized, 1);
    const explosion = explodeSteps.find((step) => !step.componentIds.length || step.componentIds.includes(component.id));
    const reroll = rerollSteps.find((step) => !step.componentIds.length || step.componentIds.includes(component.id));
    return {
      id: component.id,
      label: component.label,
      color: component.color,
      sourceMode: source.mode,
      sourceId: source.value,
      countMode: count.mode,
      count: count.value,
      explosionMode: !explosion
        ? builderExplosionModes.NEVER
        : explosion.enabledWhen
          ? builderExplosionModes.OPTION
          : builderExplosionModes.ALWAYS,
      explosionTrigger: !explosion || explosion.condition?.type === 'source-extreme'
        ? builderExplosionTriggers.MAXIMUM
        : builderExplosionTriggers.THRESHOLD,
      explosionThreshold: explosion?.condition?.value?.value ?? 6,
      reroll: conditionDraft(reroll, { operator: 'eq', value: 1, maxIterations: 1 }),
      calculation: calculationFromDefinition(normalized, component.id),
    };
  });
  const overallCalculation = calculationFromDefinition(normalized);
  const customValue = scopedPipelineStep(normalized, randomPipelineStepTypes.MAP_VALUE);
  const linkedTable = scopedPipelineStep(normalized, randomPipelineStepTypes.LOOKUP_TABLE);
  const marker = scopedPipelineStep(normalized, randomPipelineStepTypes.MARKER);
  const occurrenceBonus = scopedPipelineStep(normalized, randomPipelineStepTypes.OCCURRENCE_BONUS);
  const repeat = normalized.pipeline.find((step) => step.type === randomPipelineStepTypes.REPEAT_SELECT);
  const repeatOption = normalized.options.find((option) => option.id === repeat?.optionId);
  const combinationChoices = repeatOption?.choices || [];
  const customMapping = customValue?.mappings?.[0];

  return {
    ...createDefinitionDraft(sources),
    id: normalized.id,
    name: normalized.name,
    kind: normalized.kind,
    exposed: normalized.exposed,
    components,
    ...overallCalculation,
    linkedTable: {
      enabled: !!linkedTable,
      sourceId: linkedTable?.sourceId || sources[0]?.id || '',
      label: linkedTable?.label || 'Table',
    },
    combination: {
      enabled: normalized.kind === randomDefinitionKinds.COMBINATION,
      label: repeatOption?.label || 'Mode',
      defaultChoiceId: String(repeatOption?.defaultValue ?? combinationChoices[0]?.value ?? ''),
      control: repeatOption?.control && repeatOption.control !== randomChoiceControlKinds.AUTO
        ? repeatOption.control
        : defaultChoiceControl(combinationChoices.length),
      choices: repeatOption?.choices?.map((choice) => {
        const variant = repeat?.variants?.[choice.value] || {};
        return {
          id: String(choice.value),
          label: choice.label,
          definitionId: variant.definitionId || '',
        };
      }) || createDefinitionDraft(sources).combination.choices,
    },
    customValue: {
      enabled: !!customValue,
      operator: customMapping?.condition?.operator || 'eq',
      value: customMapping?.condition?.value?.value ?? 1,
      mappedValue: customMapping?.value?.value ?? 0,
    },
    marker: {
      enabled: !!marker,
      operator: marker?.condition?.operator || 'eq',
      value: marker?.condition?.value?.value ?? 1,
      label: marker?.label || 'Marqueur',
    },
    occurrenceBonus: {
      enabled: !!occurrenceBonus,
      operator: occurrenceBonus?.condition?.operator || 'eq',
      value: occurrenceBonus?.condition?.value?.value ?? 10,
      every: occurrenceBonus?.every?.value ?? 2,
      amount: occurrenceBonus?.amount?.value ?? 2,
    },
  };
}
