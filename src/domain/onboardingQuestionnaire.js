import {
  defaultTiebreakerLabel,
  initiativeOrders,
  initiativeValueTypes,
  manualMultipleActionScopes,
  multipleActionModes,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { normalizeCampaignRules } from './campaignRules.js';
import {
  initiativeTextOrderEnabled,
  initiativeTextOrderPresetId,
  presetInitiativeTextOrder,
} from './initiativeTextOrder.js';

export const onboardingOrganizationModes = {
  ORDERED: temporalityModes.CLASSIC,
  FLEXIBLE: temporalityModes.FLEXIBLE,
  PHASES: temporalityModes.PHASES,
};

export const onboardingMultipleActionModes = {
  NEVER: 'never',
  ELITES: 'elites',
  EVERYONE: 'everyone',
  AUTOMATIC: 'automatic',
};

export const onboardingInitiativeFormats = {
  DESCENDING: 'descending',
  ASCENDING: 'ascending',
  LABELS: 'labels',
};

export const onboardingLabelPresets = {
  FAST_SLOW: 'fast-slow',
  CARDS: 'cards',
  TAROT: 'tarot',
};

export const onboardingDefaultRules = Object.freeze(normalizeCampaignRules({
  temporalite: temporalityModes.CLASSIC,
  declarationMode: false,
  initiativeOrder: initiativeOrders.DESC,
  tiebreakerVisible: true,
  tiebreakerLabel: defaultTiebreakerLabel,
  initiativeBonusEnabled: true,
  surpriseImpact: 'limited',
  surpriseAdvanceOn: 'activation',
  surpriseDedicatedRound: false,
  multipleActionMode: multipleActionModes.NONE,
  equalityRule: 'strict',
}));

const fastSlowInitiative = {
  enabled: true,
  preset: 'fast-slow',
  separator: '',
  separators: [],
  unknown: 'last',
  parts: [{ label: 'Vitesse', values: ['Rapide', 'Lent'] }],
};

function multipleActionAnswer(rules) {
  if (rules.multipleActionMode === multipleActionModes.INITIATIVE_COST) return onboardingMultipleActionModes.AUTOMATIC;
  if (rules.multipleActionMode !== multipleActionModes.MANUAL) return onboardingMultipleActionModes.NEVER;
  return rules.manualMultipleActionScope === manualMultipleActionScopes.ELITE_ONLY
    ? onboardingMultipleActionModes.ELITES
    : onboardingMultipleActionModes.EVERYONE;
}

function initiativeFormatAnswer(rules) {
  if (initiativeTextOrderEnabled(rules.initiativeTextOrder)) return onboardingInitiativeFormats.LABELS;
  return rules.initiativeOrder === initiativeOrders.ASC
    ? onboardingInitiativeFormats.ASCENDING
    : onboardingInitiativeFormats.DESCENDING;
}

function labelPresetAnswer(rules) {
  const presetId = initiativeTextOrderPresetId(rules.initiativeTextOrder);
  if (presetId === onboardingLabelPresets.CARDS) return onboardingLabelPresets.CARDS;
  if (presetId === onboardingLabelPresets.TAROT) return onboardingLabelPresets.TAROT;
  return onboardingLabelPresets.FAST_SLOW;
}

export function onboardingAnswersFromRules(source = {}) {
  const rules = normalizeCampaignRules(source);
  const multipleActions = rules.temporalite === temporalityModes.CLASSIC
    ? multipleActionAnswer(rules)
    : rules.temporalite === temporalityModes.FLEXIBLE && multipleActionAnswer(rules) !== onboardingMultipleActionModes.AUTOMATIC
      ? multipleActionAnswer(rules)
      : onboardingMultipleActionModes.NEVER;
  return {
    organization: rules.temporalite,
    surpriseRound: !!rules.surpriseDedicatedRound,
    flexibleInitiative: !!rules.flexibleUseInitiative,
    phaseType: rules.phaseActionMode || phaseActionModes.CHECKED,
    phaseCount: rules.phaseCount,
    phaseDecrement: rules.phaseDecrement,
    phaseReroll: !!rules.phaseRerollEachRound,
    multipleActions,
    declarationMode: multipleActions === onboardingMultipleActionModes.AUTOMATIC ? false : !!rules.declarationMode,
    initiativeFormat: multipleActions === onboardingMultipleActionModes.AUTOMATIC ? onboardingInitiativeFormats.DESCENDING : initiativeFormatAnswer(rules),
    labelPreset: labelPresetAnswer(rules),
    tiebreakerVisible: !!rules.tiebreakerVisible,
    tiebreakerLabel: rules.tiebreakerLabel || defaultTiebreakerLabel,
    initiativeSource: rules.initiativeBonusEnabled || rules.initiativeBonusRollDefinitionId ? 'roll' : 'fixed',
  };
}

function multipleActionPatch(answer) {
  if (answer === onboardingMultipleActionModes.AUTOMATIC) {
    return {
      multipleActionMode: multipleActionModes.INITIATIVE_COST,
      manualMultipleActionScope: manualMultipleActionScopes.ALL,
    };
  }
  if (answer === onboardingMultipleActionModes.ELITES) {
    return {
      multipleActionMode: multipleActionModes.MANUAL,
      manualMultipleActionScope: manualMultipleActionScopes.ELITE_ONLY,
    };
  }
  if (answer === onboardingMultipleActionModes.EVERYONE) {
    return {
      multipleActionMode: multipleActionModes.MANUAL,
      manualMultipleActionScope: manualMultipleActionScopes.ALL,
    };
  }
  return {
    multipleActionMode: multipleActionModes.NONE,
    manualMultipleActionScope: manualMultipleActionScopes.ALL,
  };
}

function labelOrderFor(answer) {
  if (answer === onboardingLabelPresets.CARDS) return presetInitiativeTextOrder('cards');
  if (answer === onboardingLabelPresets.TAROT) return presetInitiativeTextOrder('tarot');
  return fastSlowInitiative;
}

export function onboardingUsesInitiative(answers = {}) {
  return answers.organization !== temporalityModes.FLEXIBLE || answers.flexibleInitiative !== false;
}

export function onboardingForcesNumericInitiative(answers = {}) {
  return (
    answers.organization === temporalityModes.PHASES
    && answers.phaseType === phaseActionModes.AUTOMATIC
  ) || answers.multipleActions === onboardingMultipleActionModes.AUTOMATIC;
}

export function campaignRulesFromOnboardingAnswers(answers = {}, baseRules = {}) {
  const usesInitiative = onboardingUsesInitiative(answers);
  const forcedNumeric = onboardingForcesNumericInitiative(answers);
  const labelInitiative = usesInitiative && !forcedNumeric && answers.initiativeFormat === onboardingInitiativeFormats.LABELS;
  const initiativeOrder = forcedNumeric || answers.initiativeFormat !== onboardingInitiativeFormats.ASCENDING
    ? initiativeOrders.DESC
    : initiativeOrders.ASC;
  const initiativeTextOrder = labelInitiative
    ? labelOrderFor(answers.labelPreset)
    : { ...normalizeCampaignRules(baseRules).initiativeTextOrder, enabled: false };
  const multipleActions = answers.organization === temporalityModes.PHASES
    ? multipleActionPatch(onboardingMultipleActionModes.NEVER)
    : multipleActionPatch(answers.multipleActions);

  return normalizeCampaignRules({
    ...baseRules,
    temporalite: answers.organization || temporalityModes.CLASSIC,
    surpriseDedicatedRound: !!answers.surpriseRound,
    flexibleUseInitiative: answers.organization === temporalityModes.FLEXIBLE
      ? answers.flexibleInitiative !== false
      : true,
    phaseActionMode: answers.organization === temporalityModes.PHASES
      ? answers.phaseType || phaseActionModes.CHECKED
      : '',
    phaseCount: Math.max(1, Number(answers.phaseCount) || 3),
    phaseDecrement: Math.max(1, Number(answers.phaseDecrement) || 10),
    phaseRerollEachRound: answers.organization === temporalityModes.PHASES
      && answers.phaseType === phaseActionModes.AUTOMATIC
      ? !!answers.phaseReroll
      : answers.multipleActions === onboardingMultipleActionModes.AUTOMATIC
        ? !!answers.phaseReroll
        : false,
    ...multipleActions,
    initiativeOrder,
    initiativeValueType: labelInitiative ? initiativeValueTypes.LABEL : initiativeValueTypes.NUMERIC,
    initiativeTextOrder,
    tiebreakerVisible: usesInitiative ? !!answers.tiebreakerVisible : false,
    tiebreakerLabel: answers.tiebreakerLabel || defaultTiebreakerLabel,
    initiativeBonusEnabled: usesInitiative && !labelInitiative && answers.initiativeSource === 'roll',
    initiativeBonusRollDefinitionId: '',
    equalityRule: 'strict',
    declarationMode: !!answers.declarationMode && answers.multipleActions !== onboardingMultipleActionModes.AUTOMATIC,
    surpriseImpact: 'limited',
    surpriseAdvanceOn: answers.organization === temporalityModes.FLEXIBLE ? 'round' : 'activation',
  });
}
