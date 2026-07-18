import { randomParameterTypes } from './engine.js';

function normalizeLabel(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isInitiativeBonusParameter(parameter = {}) {
  const signature = normalizeLabel(`${parameter.id || ''} ${parameter.label || ''}`);
  return parameter.type !== randomParameterTypes.SOURCE
    && parameter.type !== randomParameterTypes.TEXT
    && (signature.includes('modifier') || signature.includes('modificateur') || signature.includes('bonus'));
}

export function initiativeRollInputs(definition = {}, bonus = 0, optionOverrides = {}) {
  const normalizedBonus = Number(bonus);
  const safeBonus = Number.isFinite(normalizedBonus) ? normalizedBonus : 0;
  let bonusInjected = false;
  const parameters = Object.fromEntries((definition.parameters || []).map((parameter) => {
    if (isInitiativeBonusParameter(parameter)) {
      bonusInjected = true;
      return [parameter.id, safeBonus];
    }
    return [parameter.id, parameter.defaultValue];
  }));
  const options = Object.fromEntries((definition.options || []).map((option) => [
    option.id,
    optionOverrides[option.id] ?? option.defaultValue,
  ]));
  return { parameters, options, bonus: safeBonus, bonusInjected };
}

export function initiativeApproachOption(definition = {}) {
  return (definition?.options || []).find((option) => {
    const choices = (option.choices || []).map((choice) => normalizeLabel(`${choice.value} ${choice.label}`));
    return choices.some((choice) => choice.includes('desavantage') || choice.includes('disadvantage'))
      && choices.some((choice) => choice.includes('normal'))
      && choices.some((choice) => choice.includes('avantage') || choice.includes('advantage'));
  }) || null;
}
