import {
  randomAggregateOperations,
  randomKeepOrders,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
  randomSourceKinds,
} from './core/constants.js';
import { normalizeRandomDefinition } from './core/definitions.js';
import { expressionValue, fixedValue, parameterValue } from './core/references.js';

import { RollCodeError, parseRollCode } from './rollCodeParser.js';
export { RollCodeError, parseRollCode } from './rollCodeParser.js';

function sourceIdForAlias(reference, sources, position) {
  const alias = String(reference.value || '');
  const standard = alias.match(/^d(\d+)$/)?.[1];
  const candidates = standard ? [`standard-d${standard}`, alias] : [alias];
  const source = sources.find((item) => candidates.includes(item.id))
    || sources.find((item) => item.name.toLocaleLowerCase('fr') === alias.toLocaleLowerCase('fr'));
  if (!source) {
    throw new RollCodeError(`Source de tirage introuvable : ${alias}`, position, 'roll-code-source-not-found');
  }
  return source.id;
}

const conditionOperators = { '=': 'eq', '==': 'eq', '!=': 'neq', '<': 'lt', '<=': 'lte', '>': 'gt', '>=': 'gte' };

function compileCondition(condition) {
  if (!condition) return null;
  if (condition.type === 'all' || condition.type === 'any') {
    return { type: condition.type, conditions: condition.conditions.map(compileCondition) };
  }
  if (condition.type === 'not') return { type: 'not', condition: compileCondition(condition.condition) };
  return {
    type: 'compare',
    operator: conditionOperators[condition.operator],
    value: condition.value,
  };
}

function referenceLabel(reference) {
  return reference?.kind === 'parameter'
    ? `[${reference.parameterId}]`
    : String(reference?.value ?? '');
}

function compileExpression(node, rollMap) {
  if (node.type === 'roll') {
    const roll = rollMap.get(node.rollId);
    return {
      type: 'roll',
      componentId: roll.id,
      condition: compileCondition(roll.successes[0]),
      collapse: roll.explode?.collapse
        ? {
          condition: compileCondition(roll.explode.collapse),
          value: roll.explode.collapse.value,
        }
        : null,
    };
  }
  if (node.type === 'binary') return { ...node, left: compileExpression(node.left, rollMap), right: compileExpression(node.right, rollMap) };
  if (node.type === 'unary') return { ...node, value: compileExpression(node.value, rollMap) };
  if (node.type === 'function') return {
    ...node,
    arguments: node.arguments.map((argument) => compileExpression(argument, rollMap)),
  };
  if (node.type === 'marker-count') return {
    ...node,
    expression: compileExpression(node.expression, rollMap),
  };
  if (node.type === 'conditional') return {
    ...node,
    condition: compileNumericCondition(node.condition, rollMap),
    whenTrue: compileExpression(node.whenTrue, rollMap),
    whenFalse: compileExpression(node.whenFalse, rollMap),
  };
  if (node.type === 'repeat') return {
    ...node,
    expression: compileExpression(node.expression, rollMap),
  };
  if (node.type === 'select') return {
    ...node,
    choices: node.choices.map((choice) => compileExpression(choice, rollMap)),
  };
  if (node.type === 'choice') return {
    ...node,
    choices: node.choices.map((choice) => ({
      ...choice,
      expression: compileExpression(choice.expression, rollMap),
    })),
  };
  return node;
}

function compileNumericCondition(condition, rollMap) {
  if (condition.type === 'compare-values') return {
    ...condition,
    left: compileExpression(condition.left, rollMap),
    right: compileExpression(condition.right, rollMap),
  };
  if (condition.type === 'not') return { ...condition, condition: compileNumericCondition(condition.condition, rollMap) };
  return { ...condition, conditions: condition.conditions.map((item) => compileNumericCondition(item, rollMap)) };
}

function collectExpressionReferences(node, references = { rollIds: new Set(), optionIds: new Set() }) {
  if (!node || typeof node !== 'object') return references;
  if (node.type === 'roll') references.rollIds.add(node.rollId);
  if (node.type === 'binary') {
    collectExpressionReferences(node.left, references);
    collectExpressionReferences(node.right, references);
  }
  if (node.type === 'unary') collectExpressionReferences(node.value, references);
  if (node.type === 'function') {
    node.arguments.forEach((argument) => collectExpressionReferences(argument, references));
  }
  if (node.type === 'marker-count') collectExpressionReferences(node.expression, references);
  if (node.type === 'conditional') {
    collectNumericConditionReferences(node.condition, references);
    collectExpressionReferences(node.whenTrue, references);
    collectExpressionReferences(node.whenFalse, references);
  }
  if (node.type === 'repeat') collectExpressionReferences(node.expression, references);
  if (node.type === 'select') node.choices.forEach((choice) => collectExpressionReferences(choice, references));
  if (node.type === 'choice') {
    references.optionIds.add(node.optionId);
    node.choices.forEach((choice) => collectExpressionReferences(choice.expression, references));
  }
  return references;
}

function collectNumericConditionReferences(condition, references) {
  if (condition.type === 'compare-values') {
    collectExpressionReferences(condition.left, references);
    collectExpressionReferences(condition.right, references);
    return;
  }
  if (condition.type === 'not') collectNumericConditionReferences(condition.condition, references);
  else condition.conditions.forEach((item) => collectNumericConditionReferences(item, references));
}

function combineEnabledWhen(...values) {
  const conditions = values.flatMap((value) => (
    Array.isArray(value) ? value : value ? [value] : []
  ));
  if (!conditions.length) return null;
  return conditions.length === 1 ? conditions[0] : conditions;
}

function questionEnabledWhen(question) {
  return question ? { optionId: question.optionId, equals: true } : null;
}

export function compileRollCode(code, { id = 'coded-roll', name = 'Jet code', sources = [], exposed = true, active = true, visualId } = {}) {
  const program = parseRollCode(code);
  const references = collectExpressionReferences(program.expression);
  const activeRolls = program.rolls.filter((roll) => references.rollIds.has(roll.id));
  const parameters = program.declarations.map((declaration) => ({
    id: declaration.name,
    label: declaration.label || declaration.name,
    type: declaration.type === 'source' ? randomParameterTypes.SOURCE : randomParameterTypes.NUMBER,
    defaultValue: declaration.type === 'source'
      ? sourceIdForAlias(declaration.defaultValue, sources, declaration.position)
      : declaration.defaultValue,
    prompt: declaration.prompt === true,
    choices: declaration.type === 'source' && declaration.allowedSources
      ? [...new Set(declaration.allowedSources.map((source) => (
        sourceIdForAlias(source, sources, declaration.position)
      )))]
      : [],
    required: true,
  }));
  activeRolls.forEach((roll) => {
    const sourceIds = roll.source.kind === 'parameter'
      ? (() => {
        const parameter = parameters.find((item) => item.id === roll.source.parameterId);
        return parameter ? [parameter.defaultValue, ...(parameter.choices || [])] : [];
      })()
      : [sourceIdForAlias(roll.source, sources, roll.position)];
    sourceIds.forEach((sourceId) => {
      const source = sources.find((item) => item.id === sourceId);
      const expectsCards = !!roll.cardMode;
      if (!!source && (source.kind === randomSourceKinds.CARDS) !== expectsCards) {
        throw new RollCodeError(expectsCards
          ? `Le tirage c@ attend un paquet de cartes : ${source.name}`
          : `Le tirage d@ ne peut pas utiliser le paquet ${source.name}.`, roll.position);
      }
    });
  });
  const components = activeRolls.map((roll) => ({
    id: roll.id,
    label: '',
    source: roll.source.kind === 'parameter'
      ? parameterValue(roll.source.parameterId)
      : fixedValue(sourceIdForAlias(roll.source, sources, roll.position)),
    count: roll.count,
    cardMode: roll.cardMode || 'draw',
    sourceKind: roll.cardMode ? 'cards' : 'random',
    repeatBaseCount: roll.repeatBaseCount || null,
    enabledWhen: roll.enabledWhen || null,
  }));
  const options = program.choices.filter((choice) => references.optionIds.has(choice.optionId)).map((choice) => ({
    id: choice.optionId,
    label: choice.choices.map((item) => item.label).join(' / '),
    type: randomOptionTypes.CHOICE,
    defaultValue: choice.defaultValue,
    choices: choice.choices.map((item) => ({ value: item.value, label: item.label })),
  })).concat((program.questions || []).map((question) => ({
    id: question.optionId,
    label: question.label,
    type: randomOptionTypes.BOOLEAN,
    defaultValue: question.defaultValue,
    choices: [],
  })));
  const pipeline = [];
  const treatmentComponentIds = (treatment) => {
    if (!treatment.targets?.length) return [];
    return treatment.targets.map((target) => {
      const roll = activeRolls[target - 1];
      if (!roll) throw new RollCodeError(`Groupe de jet introuvable : ${target}`);
      return roll.id;
    });
  };
  activeRolls.forEach((roll) => {
    if (roll.reroll) pipeline.push({
      id: `reroll-${roll.id}`,
      type: randomPipelineStepTypes.REROLL,
      componentIds: [roll.id],
      condition: compileCondition(roll.reroll),
      maxIterations: roll.reroll.recursive ? 100 : 1,
      decision: roll.reroll.optional ? 'after-roll' : undefined,
      label: roll.reroll.recursive ? 'Relancer recursivement' : 'Relancer',
      enabledWhen: combineEnabledWhen(
        roll.enabledWhen,
        questionEnabledWhen(roll.reroll.question),
      ),
    });
    if (roll.explode) pipeline.push({
      id: `explode-${roll.id}`,
      type: randomPipelineStepTypes.EXPLODE,
      componentIds: [roll.id],
      condition: roll.explode.trigger
        ? compileCondition(roll.explode.trigger)
        : { type: 'source-extreme', extreme: 'max' },
      maxIterations: roll.explode.maxIterations,
      decision: roll.explode.optional ? 'after-roll' : undefined,
      label: 'Faire exploser',
      enabledWhen: combineEnabledWhen(
        roll.enabledWhen,
        questionEnabledWhen(roll.explode.question),
      ),
    });
    if (roll.keep) pipeline.push({
      id: `keep-${roll.id}`,
      type: randomPipelineStepTypes.KEEP,
      componentIds: [roll.id],
      count: roll.keep.count,
      unit: 'chain',
      order: roll.keep.order,
      perRepeat: roll.perRepeat === true,
      decision: roll.keep.optional ? 'after-roll' : undefined,
      label: roll.keep.order === randomKeepOrders.LOWEST ? 'Conserver les plus faibles' : 'Conserver les plus eleves',
      enabledWhen: combineEnabledWhen(roll.enabledWhen, questionEnabledWhen(roll.keep.question)),
    });
    roll.successes.forEach((success, index) => pipeline.push({
      id: `success-${roll.id}-${index + 1}`,
      type: randomPipelineStepTypes.AGGREGATE,
      componentIds: [roll.id],
      operation: randomAggregateOperations.COUNT_MATCHES,
      condition: compileCondition(success),
      outputId: `${roll.id}-success-${index + 1}`,
      label: `Compteur ${index + 1} (${success.operator}${referenceLabel(success.value)})`,
      enabledWhen: roll.enabledWhen || null,
    }));
  });
  program.treatments.forEach((treatment, index) => {
    if (treatment.type === 'map-value') pipeline.push({
      id: `map-value-${index + 1}`,
      type: randomPipelineStepTypes.MAP_VALUE,
      componentIds: treatmentComponentIds(treatment),
      mappings: [{ condition: compileCondition(treatment.condition), value: treatment.value }],
    });
    if (treatment.type === 'marker') pipeline.push({
      id: `marker-${index + 1}`,
      type: randomPipelineStepTypes.MARKER,
      componentIds: treatmentComponentIds(treatment),
      markerId: treatment.markerId,
      label: treatment.markerId,
      condition: compileCondition(treatment.condition),
    });
  });
  const preparationOrder = {
    [randomPipelineStepTypes.REROLL]: 1,
    [randomPipelineStepTypes.EXPLODE]: 1,
    [randomPipelineStepTypes.MAP_VALUE]: 2,
    [randomPipelineStepTypes.MARKER]: 2,
    [randomPipelineStepTypes.KEEP]: 3,
    [randomPipelineStepTypes.AGGREGATE]: 4,
  };
  pipeline.sort((left, right) => (preparationOrder[left.type] || 9) - (preparationOrder[right.type] || 9));
  pipeline.push({
    id: 'code-result',
    type: randomPipelineStepTypes.EXPRESSION,
    expression: compileExpression(program.expression, new Map(program.rolls.map((roll) => [roll.id, roll]))),
    outputId: 'result',
    label: 'Resultat',
    operation: randomAggregateOperations.SUM,
  });
  program.treatments.forEach((treatment, index) => {
    if (treatment.type !== 'occurrence-bonus') return;
    const targetRoll = treatment.counter ? activeRolls[treatment.targets[0] - 1] : null;
    if (treatment.counter && !targetRoll) {
      throw new RollCodeError(`Groupe de jet introuvable : ${treatment.targets[0]}`);
    }
    const targetAggregateId = treatment.counter
      ? `${targetRoll.id}-success-${treatment.counter}`
      : 'result';
    if (treatment.counter) {
      if (!targetRoll?.successes[treatment.counter - 1]) {
        throw new RollCodeError(`Compteur de succes introuvable : ${treatment.counter}`);
      }
    }
    pipeline.push({
      id: `occurrence-bonus-${index + 1}`,
      type: randomPipelineStepTypes.OCCURRENCE_BONUS,
      componentIds: treatmentComponentIds(treatment),
      condition: compileCondition(treatment.condition),
      every: treatment.every,
      amount: treatment.amount,
      targetAggregateId,
      label: `Bonus par occurrences (${treatment.condition.operator}${referenceLabel(treatment.condition.value)})`,
    });
  });
  let primaryAggregateId = 'result';
  program.treatments.forEach((treatment, index) => {
    if (treatment.type !== 'lookup-table') return;
    const outputId = `table-result-${index + 1}`;
    const source = treatment.source.kind === 'parameter'
      ? parameterValue(treatment.source.parameterId)
      : fixedValue(sourceIdForAlias(treatment.source, sources, treatment.position));
    pipeline.push({
      id: `lookup-table-${index + 1}`,
      type: randomPipelineStepTypes.LOOKUP_TABLE,
      source,
      targetAggregateId: primaryAggregateId,
      outputId,
      label: 'Table',
    });
    primaryAggregateId = outputId;
  });
  return normalizeRandomDefinition({
    id,
    name: program.resultName || name,
    visualId,
    exposed,
    active,
    recursive: program.recursive,
    parameters,
    options,
    components,
    pipeline,
    primaryAggregateId,
    code,
  });
}
