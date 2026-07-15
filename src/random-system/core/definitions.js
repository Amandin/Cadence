import {
  MAX_DRAWS_PER_COMPONENT,
  randomChoiceControlKinds,
  randomDefinitionKinds,
  randomOptionTypes,
  randomParameterTypes,
} from './constants.js';
import { RandomSystemError } from './errors.js';
import { normalizeRandomDefinitionVisualId } from '../definitionVisuals.js';
import { normalizeValueReference } from './references.js';
import { normalizeRandomSource } from './sources.js';
import {
  boundedInteger,
  cleanId,
  cleanLabel,
  finiteNumber,
  primitiveValue,
} from './utils.js';

function normalizeParameter(parameter, index) {
  const type = Object.values(randomParameterTypes).includes(parameter?.type)
    ? parameter.type
    : randomParameterTypes.NUMBER;
  const choices = type === randomParameterTypes.SOURCE
    ? [...new Set((Array.isArray(parameter?.choices) ? parameter.choices : [])
      .map((choice) => String(choice || '').trim())
      .filter(Boolean))]
    : [];
  const requestedDefault = parameter?.defaultValue ?? (type === randomParameterTypes.SOURCE ? '' : 0);
  const prompt = type !== randomParameterTypes.SOURCE && parameter?.prompt === true;
  return {
    id: cleanId(parameter?.id, `parameter-${index + 1}`),
    label: cleanLabel(parameter?.label, `Paramètre ${index + 1}`),
    type,
    defaultValue: prompt
      ? ''
      : type === randomParameterTypes.SOURCE && choices.length && !choices.includes(String(requestedDefault))
      ? choices[0]
      : requestedDefault,
    prompt,
    choices,
    min: Number.isFinite(Number(parameter?.min)) ? Number(parameter.min) : undefined,
    max: Number.isFinite(Number(parameter?.max)) ? Number(parameter.max) : undefined,
    required: parameter?.required !== false,
  };
}

function normalizeOption(option, index) {
  const type = option?.type === randomOptionTypes.CHOICE
    ? randomOptionTypes.CHOICE
    : randomOptionTypes.BOOLEAN;
  const choices = type === randomOptionTypes.CHOICE
    ? (Array.isArray(option?.choices) ? option.choices : [])
      .map((choice, choiceIndex) => ({
        value: primitiveValue(choice?.value ?? `choice-${choiceIndex + 1}`),
        label: cleanLabel(choice?.label, String(choice?.value ?? choiceIndex + 1)),
      }))
    : [];
  const requestedDefault = type === randomOptionTypes.BOOLEAN
    ? !!option?.defaultValue
    : option?.defaultValue;
  const defaultValue = type === randomOptionTypes.BOOLEAN
    ? requestedDefault
    : choices.some((choice) => choice.value === requestedDefault)
      ? requestedDefault
      : choices[0]?.value ?? '';
  return {
    id: cleanId(option?.id, `option-${index + 1}`),
    label: cleanLabel(option?.label, `Option ${index + 1}`),
    type,
    defaultValue,
    choices,
    ...(type === randomOptionTypes.CHOICE ? {
      control: Object.values(randomChoiceControlKinds).includes(option?.control)
        ? option.control
        : randomChoiceControlKinds.AUTO,
    } : {}),
  };
}

function normalizeComponent(component, index) {
  const label = typeof component?.label === 'string'
    ? component.label.trim()
    : `Groupe ${index + 1}`;
  const color = /^#[0-9a-f]{6}$/i.test(String(component?.color || ''))
    ? String(component.color).toLowerCase()
    : '';
  return {
    id: cleanId(component?.id, `component-${index + 1}`),
    label,
    color,
    source: normalizeValueReference(component?.source, ''),
    count: normalizeValueReference(component?.count, 1),
    enabledWhen: normalizeEnabledWhen(component?.enabledWhen),
  };
}

function normalizeEnabledWhen(value) {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  const conditions = source.filter((condition) => condition?.optionId).map((condition) => ({
    optionId: String(condition.optionId),
    equals: primitiveValue(condition.equals ?? true),
  }));
  if (!conditions.length) return null;
  return conditions.length === 1 ? conditions[0] : conditions;
}

function normalizePipelineStep(step, index) {
  return {
    ...step,
    id: cleanId(step?.id, `step-${index + 1}`),
    type: cleanId(step?.type, ''),
    componentIds: Array.isArray(step?.componentIds)
      ? step.componentIds.map((id) => String(id))
      : [],
    enabledWhen: normalizeEnabledWhen(step?.enabledWhen),
  };
}

export function normalizeRandomDefinition(definition, index = 0) {
  const inferredKind = (Array.isArray(definition?.pipeline) ? definition.pipeline : [])
    .some((step) => step?.type === 'repeat-select')
    ? randomDefinitionKinds.COMBINATION
    : randomDefinitionKinds.ROLL;
  const kind = Object.values(randomDefinitionKinds).includes(definition?.kind)
    ? definition.kind
    : inferredKind;
  return {
    id: cleanId(definition?.id, `definition-${index + 1}`),
    name: cleanLabel(definition?.name, `Définition ${index + 1}`),
    visualId: normalizeRandomDefinitionVisualId(definition?.visualId, definition),
    kind,
    exposed: kind === randomDefinitionKinds.COMBINATION || definition?.exposed !== false,
    active: definition?.active !== undefined
      ? definition.active !== false
      : kind === randomDefinitionKinds.COMBINATION || definition?.exposed !== false,
    recursive: definition?.recursive === true,
    parameters: (Array.isArray(definition?.parameters) ? definition.parameters : []).map(normalizeParameter),
    options: (Array.isArray(definition?.options) ? definition.options : []).map(normalizeOption),
    components: (Array.isArray(definition?.components) ? definition.components : []).map(normalizeComponent),
    pipeline: (Array.isArray(definition?.pipeline) ? definition.pipeline : []).map(normalizePipelineStep),
    primaryAggregateId: cleanId(definition?.primaryAggregateId, ''),
    code: typeof definition?.code === 'string' ? definition.code : '',
  };
}

function normalizeParameterValue(parameter, value, sourceMap) {
  if (parameter.type === randomParameterTypes.SOURCE) {
    const sourceId = String(value ?? '').trim();
    if (!sourceMap.has(sourceId)) {
      throw new RandomSystemError(
        'invalid-source-parameter',
        `La source demandée par « ${parameter.label} » est introuvable.`,
        { parameterId: parameter.id, sourceId },
      );
    }
    if (parameter.choices.length && !parameter.choices.includes(sourceId)) {
      throw new RandomSystemError(
        'invalid-source-choice',
        `La source choisie pour « ${parameter.label} » ne fait pas partie de la preselection.`,
        { parameterId: parameter.id, sourceId, choices: parameter.choices },
      );
    }
    return sourceId;
  }
  if (parameter.prompt && (value === '' || value === null || value === undefined)) {
    throw new RandomSystemError(
      'missing-number-parameter',
      `Une valeur est demandee pour « ${parameter.label} ».`,
      { parameterId: parameter.id },
    );
  }
  if (parameter.type === randomParameterTypes.INTEGER) {
    const min = parameter.min ?? -MAX_DRAWS_PER_COMPONENT;
    const max = parameter.max ?? MAX_DRAWS_PER_COMPONENT;
    return boundedInteger(value, min, max, boundedInteger(parameter.defaultValue, min, max, 0));
  }
  if (parameter.type === randomParameterTypes.NUMBER) {
    const numeric = finiteNumber(value, finiteNumber(parameter.defaultValue, 0));
    return Math.min(parameter.max ?? numeric, Math.max(parameter.min ?? numeric, numeric));
  }
  return String(value ?? parameter.defaultValue ?? '');
}

export function resolveDefinitionInputs(definition, sources, suppliedParameters = {}, suppliedOptions = {}) {
  const normalized = normalizeRandomDefinition(definition);
  const sourceMap = new Map((Array.isArray(sources) ? sources : []).map((source, index) => {
    const next = normalizeRandomSource(source, index);
    return [next.id, next];
  }));
  const parameters = Object.fromEntries(normalized.parameters.map((parameter) => {
    const supplied = Object.prototype.hasOwnProperty.call(suppliedParameters, parameter.id)
      ? suppliedParameters[parameter.id]
      : parameter.defaultValue;
    return [parameter.id, normalizeParameterValue(parameter, supplied, sourceMap)];
  }));
  const options = Object.fromEntries(normalized.options.map((option) => {
    const supplied = Object.prototype.hasOwnProperty.call(suppliedOptions, option.id)
      ? suppliedOptions[option.id]
      : option.defaultValue;
    if (option.type === randomOptionTypes.BOOLEAN) return [option.id, !!supplied];
    const valid = option.choices.some((choice) => choice.value === supplied);
    return [option.id, valid ? supplied : option.defaultValue];
  }));
  return {
    definition: normalized,
    sourceMap,
    componentMap: new Map(normalized.components.map((component) => [component.id, component])),
    sourceExtremeCache: new Map(),
    parameters,
    options,
  };
}
