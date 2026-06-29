import {
  randomPipelineStepTypes,
} from './constants.js';
import {
  applyAggregate,
  applyKeep,
  applyTableLookup,
  applyMarkers,
  applyModifier,
  applyOccurrenceBonus,
  mapDrawValues,
  markSuccesses,
} from './calculationSteps.js';
import { resolveDefinitionInputs } from './definitions.js';
import {
  drawInitialComponents,
  explodeDraws,
  isStepEnabled,
  rerollDraws,
} from './drawOperations.js';
import { RandomSystemError } from './errors.js';
import { secureRandomFloat } from '../random.js';
import { boundedInteger, cleanId } from './utils.js';

let executionSequence = 0;

function runGroup(context, steps, rng, groupIndex) {
  const drawState = { ...drawInitialComponents(context, rng, groupIndex), aggregates: new Map() };
  for (const step of steps) {
    if (!isStepEnabled(step, context.options)) continue;
    if (step.type === randomPipelineStepTypes.REROLL) rerollDraws(drawState, step, context, rng);
    if (step.type === randomPipelineStepTypes.EXPLODE) explodeDraws(drawState, step, context, rng);
    if (step.type === randomPipelineStepTypes.MAP_VALUE) mapDrawValues(drawState, step, context);
    if (step.type === randomPipelineStepTypes.SUCCESS_THRESHOLD) markSuccesses(drawState, step, context);
    if (step.type === randomPipelineStepTypes.MARKER) applyMarkers(drawState, step, context);
    if (step.type === randomPipelineStepTypes.KEEP) applyKeep(drawState, step, context);
    if (step.type === randomPipelineStepTypes.AGGREGATE) applyAggregate(drawState, step, context);
    if (step.type === randomPipelineStepTypes.OCCURRENCE_BONUS) applyOccurrenceBonus(drawState, step, context);
    if (step.type === randomPipelineStepTypes.MODIFIER) applyModifier(drawState, step, context);
    if (step.type === randomPipelineStepTypes.LOOKUP_TABLE) applyTableLookup(drawState, step, context);
  }
  return {
    index: groupIndex,
    draws: drawState.draws,
    aggregates: Array.from(drawState.aggregates.values()),
  };
}

function repeatConfiguration(step, options) {
  if (!step) return { repetitions: 1, select: 'first', aggregateId: '' };
  const optionValue = step.optionId ? options[step.optionId] : step.value;
  const variant = step.variants?.[optionValue] || step.defaultVariant || {};
  return {
    repetitions: boundedInteger(variant.repetitions ?? step.repetitions, 1, 20, 1),
    select: ['highest', 'lowest', 'first', 'sum', 'subtract'].includes(variant.select) ? variant.select : 'first',
    aggregateId: cleanId(variant.aggregateId || step.aggregateId, ''),
  };
}

function aggregateValue(group, aggregateId) {
  const aggregate = group.aggregates.find((item) => item.id === aggregateId) || group.aggregates[0];
  return Number.isFinite(Number(aggregate?.value)) ? Number(aggregate.value) : 0;
}

function selectedGroupIndex(groups, repeat) {
  if (repeat.select === 'sum' || repeat.select === 'subtract') return -1;
  if (repeat.select === 'first' || groups.length < 2) return 0;
  return groups.reduce((selectedIndex, group, index) => {
    const score = aggregateValue(group, repeat.aggregateId);
    const selectedScore = aggregateValue(groups[selectedIndex], repeat.aggregateId);
    if (score === selectedScore) return selectedIndex;
    if (repeat.select === 'lowest') return score < selectedScore ? index : selectedIndex;
    return score > selectedScore ? index : selectedIndex;
  }, 0);
}

function combineGroupAggregates(groups, operation) {
  const combined = new Map();
  for (const group of groups) {
    for (const aggregate of group.aggregates) {
      if (!combined.has(aggregate.id)) {
        combined.set(aggregate.id, {
          ...aggregate,
          value: Array.isArray(aggregate.value) ? [] : 0,
          adjustments: [],
          valueCount: 0,
        });
      }
      const target = combined.get(aggregate.id);
      if (Array.isArray(aggregate.value)) target.value.push(...aggregate.value);
      else if (Number.isFinite(Number(aggregate.value))) {
        const numeric = Number(aggregate.value);
        target.value = operation === 'subtract' && target.valueCount > 0
          ? target.value - numeric
          : target.value + numeric;
        target.valueCount += 1;
      }
      else target.value = [...(Array.isArray(target.value) ? target.value : []), aggregate.value];
      if (aggregate.adjustments) target.adjustments.push(...aggregate.adjustments);
    }
  }
  return Array.from(combined.values()).map(({ valueCount, ...aggregate }) => ({
    ...aggregate,
    adjustments: aggregate.adjustments.length ? aggregate.adjustments : undefined,
  }));
}

export function executeRandomDefinition({
  definition,
  sources,
  parameters = {},
  options = {},
  rng = secureRandomFloat,
  now = Date.now(),
} = {}) {
  const context = resolveDefinitionInputs(definition, sources, parameters, options);
  if (!context.definition.components.length) {
    throw new RandomSystemError(
      'empty-definition',
      `La définition ${context.definition.name} ne contient aucune source à tirer.`,
      { definitionId: context.definition.id },
    );
  }

  const repeatStep = context.definition.pipeline.find((step) => (
    step.type === randomPipelineStepTypes.REPEAT_SELECT && isStepEnabled(step, context.options)
  ));
  const steps = context.definition.pipeline.filter((step) => step.type !== randomPipelineStepTypes.REPEAT_SELECT);
  const repeat = repeatConfiguration(repeatStep, context.options);
  const groups = Array.from(
    { length: repeat.repetitions },
    (_, groupIndex) => runGroup(context, steps, rng, groupIndex),
  );
  const keptGroupIndex = selectedGroupIndex(groups, repeat);
  const combined = repeat.select === 'sum' || repeat.select === 'subtract';
  const selectedGroup = combined ? null : groups[keptGroupIndex];
  groups.forEach((group, index) => { group.selected = combined || index === keptGroupIndex; });
  const draws = combined ? groups.flatMap((group) => group.draws) : selectedGroup.draws;
  const aggregates = combined ? combineGroupAggregates(groups, repeat.select) : selectedGroup.aggregates;
  const primaryAggregate = aggregates.find(
    (aggregate) => aggregate.id === context.definition.primaryAggregateId,
  ) || aggregates[0] || null;

  executionSequence += 1;
  return {
    id: `${now}-${context.definition.id}-${executionSequence}`,
    kind: 'random-roll',
    definitionId: context.definition.id,
    definitionName: context.definition.name,
    rolledAt: now,
    parameters: context.parameters,
    options: context.options,
    groups,
    selectedGroupIndex: keptGroupIndex,
    combined,
    draws,
    aggregates,
    primaryAggregateId: primaryAggregate?.id || '',
    primaryAggregate,
  };
}
