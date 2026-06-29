import {
  normalizeRandomDefinition,
  randomPipelineStepTypes,
} from './engine.js';

export function definitionIsReferenced(definitions, targetDefinitionId) {
  return (Array.isArray(definitions) ? definitions : []).some((definition) => (
    definition.id !== targetDefinitionId
    && (definition.pipeline || []).some((step) => (
      step.type === randomPipelineStepTypes.REPEAT_SELECT
      && Object.values(step.variants || {}).some(
        (variant) => variant?.definitionId === targetDefinitionId,
      )
    ))
  ));
}

function combinationFromNormalizedDefinition(normalized) {
  const step = normalized.pipeline.find((item) => item.type === randomPipelineStepTypes.REPEAT_SELECT);
  if (!step) return null;
  const option = normalized.options.find((item) => item.id === step.optionId);
  if (!option) return null;
  return { option, step };
}

function variantFromCombination(combination, optionValues) {
  if (!combination) return null;
  const selected = Object.prototype.hasOwnProperty.call(optionValues, combination.option.id)
    ? optionValues[combination.option.id]
    : combination.option.defaultValue;
  return combination.step.variants?.[selected] || combination.step.defaultVariant || null;
}

function targetFromVariant(parent, definitions, variant) {
  const targetId = String(variant?.definitionId || '').trim();
  if (!targetId || targetId === parent.id) return parent;
  return normalizeRandomDefinition(
    definitions.find((item) => item.id === targetId) || parent,
  );
}

export function definitionCombination(definition) {
  return combinationFromNormalizedDefinition(normalizeRandomDefinition(definition));
}

export function combinationTargetDefinition(definition, definitions, optionValues = {}) {
  const parent = normalizeRandomDefinition(definition);
  const combination = combinationFromNormalizedDefinition(parent);
  return targetFromVariant(
    parent,
    definitions,
    variantFromCombination(combination, optionValues),
  );
}

export function prepareCombinedDefinition(definition, definitions, optionValues = {}) {
  const parent = normalizeRandomDefinition(definition);
  const combination = combinationFromNormalizedDefinition(parent);
  if (!combination) return { definition: parent, target: parent, combination: null, variant: null };
  const variant = variantFromCombination(combination, optionValues) || {};
  const target = targetFromVariant(parent, definitions, variant);
  const targetCombination = combinationFromNormalizedDefinition(target);
  const ignoredOptionIds = new Set([targetCombination?.option.id].filter(Boolean));

  return {
    target,
    combination,
    variant,
    definition: normalizeRandomDefinition({
      ...target,
      id: parent.id,
      name: parent.name,
      parameters: target.parameters,
      options: target.options.filter((option) => !ignoredOptionIds.has(option.id)),
      pipeline: [
        {
          id: 'runtime-combination',
          type: randomPipelineStepTypes.REPEAT_SELECT,
          value: 'selected',
          variants: {
            selected: {
              repetitions: variant.repetitions ?? 1,
              select: variant.select || 'first',
              aggregateId: variant.aggregateId || target.primaryAggregateId,
            },
          },
        },
        ...target.pipeline.filter((step) => step.type !== randomPipelineStepTypes.REPEAT_SELECT),
      ],
      primaryAggregateId: target.primaryAggregateId,
    }),
  };
}
