import { resolveValue } from './core/references.js';

function currentParameters(definition, parameters = {}) {
  return Object.fromEntries((definition?.parameters || []).map((parameter) => [
    parameter.id,
    parameters[parameter.id] ?? parameter.defaultValue,
  ]));
}

function currentOptions(definition, options = {}) {
  return Object.fromEntries((definition?.options || []).map((option) => [
    option.id,
    options[option.id] ?? option.defaultValue,
  ]));
}

function sourceAlias(sourceId) {
  const id = String(sourceId || '').trim();
  const standardDie = id.match(/^standard-d(\d+)$/);
  return standardDie ? `d${standardDie[1]}` : id;
}

function componentExpression(component, parameters) {
  const count = Math.max(0, Number(resolveValue(component.count, parameters, 1)) || 0);
  const sourceId = resolveValue(component.source, parameters, '');
  const alias = sourceAlias(sourceId);
  if (!alias || count <= 0) return '';
  if (component.sourceKind === 'cards') return `${count}c@${alias}`;
  if (/^d\d+$/.test(alias)) return `${count}${alias}`;
  return `${count}@${alias}`;
}

function conditionSuffix(condition, parameters) {
  if (!condition || condition.type !== 'compare') return '';
  const operators = { eq: '=', neq: '!=', lt: '<', lte: '<=', gt: '>', gte: '>=' };
  const operator = operators[condition.operator];
  if (!operator) return '';
  return `${operator}${resolveValue(condition.value, parameters, 0)}`;
}

export function definitionToRollCode(definition, inputs = {}) {
  if (definition?.code?.trim()) return definition.code.trim();
  const parameters = currentParameters(definition, inputs.parameters);
  const options = currentOptions(definition, inputs.options);
  const components = (definition?.components || []).map((component) => ({
    component,
    expression: componentExpression(component, parameters),
  })).filter((item) => item.expression);
  if (!components.length) return '1d20';

  const pipeline = definition?.pipeline || [];
  const repeat = pipeline.find((step) => step.type === 'repeat-select');
  const repeatVariant = repeat?.variants?.[options[repeat.optionId]];
  if (repeatVariant?.repetitions > 1 && components.length === 1) {
    const component = components[0].component;
    const baseCount = Math.max(1, Number(resolveValue(component.count, parameters, 1)) || 1);
    const repeatedCount = baseCount * repeatVariant.repetitions;
    const alias = sourceAlias(resolveValue(component.source, parameters, ''));
    components[0].expression = /^d\d+$/.test(alias) ? `${repeatedCount}${alias}` : `${repeatedCount}@${alias}`;
    if (repeatVariant.select === 'highest') components[0].expression += `kh${baseCount}`;
    if (repeatVariant.select === 'lowest') components[0].expression += `kl${baseCount}`;
  }

  const keep = pipeline.find((step) => step.type === 'keep' && !step.enabledWhen);
  if (keep && components.length === 1) {
    components[0].expression += `${keep.order === 'lowest' ? 'kl' : 'kh'}${resolveValue(keep.count, parameters, 1)}`;
  }
  const explode = pipeline.find((step) => step.type === 'explode' && !step.enabledWhen);
  if (explode && components.length === 1) {
    const suffix = explode.condition?.type === 'source-extreme' ? '' : conditionSuffix(explode.condition, parameters);
    components[0].expression += `!${suffix}`;
  }
  const reroll = pipeline.find((step) => step.type === 'reroll' && !step.enabledWhen);
  if (reroll && components.length === 1) components[0].expression += `r${conditionSuffix(reroll.condition, parameters)}`;
  const threshold = pipeline.find((step) => step.type === 'success-threshold' && !step.enabledWhen);
  if (threshold && components.length === 1) components[0].expression += `s${conditionSuffix(threshold.condition, parameters)}`;

  let expression = components.map((item) => item.expression).join(' + ');
  pipeline.filter((step) => step.type === 'modifier' && !step.enabledWhen).forEach((step) => {
    const value = Number(resolveValue(step.value, parameters, 0));
    if (Number.isFinite(value) && value !== 0) expression += value > 0 ? ` + ${value}` : ` - ${Math.abs(value)}`;
  });
  return expression;
}
