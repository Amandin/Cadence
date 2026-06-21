import {
  defaultPhaseActionMode,
  initiativeOrders,
  multipleActionModes,
  phaseActionModes,
  temporalityModes,
} from '../constants.js';
import { t } from '../i18n/index.js';
import { normalizeInitiativeTextOrder } from './initiativeTextOrder.js';
import { isInitiativeCostMode, isManualMultipleActionMode, multipleActionModeFromRules } from './initiativeCost.js';

const blocked = (disabled, reason) => ({ disabled: !!disabled, reason: disabled ? reason : '' });
const temporalitySummaryKeys = {
  [temporalityModes.CLASSIC]: 'rules.temporality.classic',
  [temporalityModes.FLEXIBLE]: 'rules.temporality.flexible',
  [temporalityModes.PHASES]: 'rules.temporality.phases',
  [temporalityModes.DECLARATION]: 'rules.temporality.declaration',
};

export const usesTextInitiative = (rules = {}) => normalizeInitiativeTextOrder(rules.initiativeTextOrder).enabled;
export const usesManualMultipleActionSlots = (rules = {}) => isManualMultipleActionMode(rules);
export const usesInitiativeCost = (rules = {}) => isInitiativeCostMode(rules);
export const usesDeclaration = (rules = {}) => !!rules.declarationMode;
export const usesAutomaticPhases = (rules = {}) => rules.temporalite === temporalityModes.PHASES && (rules.phaseActionMode || defaultPhaseActionMode) === phaseActionModes.AUTOMATIC;
export const usesFlexibleInitiative = (rules = {}) => rules.temporalite !== temporalityModes.FLEXIBLE || rules.flexibleUseInitiative !== false;
export const canRerollInitiativeEachRound = (rules = {}) => usesAutomaticPhases(rules) || usesInitiativeCost(rules);

export function temporalityPatch(rules = {}, temporalite) {
  if (temporalite === temporalityModes.PHASES && (usesTextInitiative(rules) || rules.temporalite === temporalityModes.FLEXIBLE)) return { temporalite, phaseActionMode: phaseActionModes.CHECKED };
  if (temporalite === temporalityModes.FLEXIBLE) return { temporalite, phaseActionMode: '', surpriseAdvanceOn: 'round' };
  return { temporalite };
}

export function ruleCompatibilityIssues(rules = {}) {
  const issues = [];
  const multipleSlots = usesManualMultipleActionSlots(rules);
  const initiativeCost = usesInitiativeCost(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const flexible = rules.temporalite === temporalityModes.FLEXIBLE;

  if (phases && multipleSlots) issues.push({ id: 'phases-multiple-slots', message: t('rules.compat.phasesMultipleSlots') });
  if (initiativeCost && flexible) issues.push({ id: 'initiative-cost-flexible', message: t('rules.compat.initiativeCostFlexible') });
  if (initiativeCost && phases) issues.push({ id: 'initiative-cost-phases', message: t('rules.compat.initiativeCostPhases') });
  if (initiativeCost && textInitiative) issues.push({ id: 'initiative-cost-labels', message: t('rules.compat.initiativeCostLabels') });
  if (initiativeCost && declaration) issues.push({ id: 'initiative-cost-declaration', message: t('rules.compat.initiativeCostDeclaration') });
  if (initiativeCost && rules.initiativeOrder === initiativeOrders.ASC) issues.push({ id: 'initiative-cost-ascending', message: t('rules.compat.initiativeCostAscending') });
  if (usesAutomaticPhases(rules) && textInitiative) issues.push({ id: 'automatic-phases-text-initiative', message: t('rules.compat.automaticPhasesTextInitiative') });
  if (flexible && rules.surpriseAdvanceOn !== 'round') issues.push({ id: 'surprise-activation-flexible', message: t('rules.compat.surpriseFlexible') });

  return issues;
}

export function ruleOptionAvailability(rules = {}) {
  const multipleSlots = usesManualMultipleActionSlots(rules);
  const initiativeCost = usesInitiativeCost(rules);
  const textInitiative = usesTextInitiative(rules);
  const declaration = usesDeclaration(rules);
  const phases = rules.temporalite === temporalityModes.PHASES;
  const automaticPhases = usesAutomaticPhases(rules);
  const flexibleInitiative = usesFlexibleInitiative(rules);

  return {
    declarationMode: blocked(initiativeCost, t('rules.compat.disableInitiativeCostActionsFirst')),
    multipleActionSlots: blocked(phases, t('rules.compat.manualSlotsUnavailableWithPhases')),
    initiativeCost: blocked(
      rules.temporalite === temporalityModes.FLEXIBLE || phases || textInitiative || declaration || rules.initiativeOrder === initiativeOrders.ASC,
      rules.temporalite === temporalityModes.FLEXIBLE
        ? t('rules.compat.unavailableFlexible')
        : phases
          ? t('rules.compat.unavailablePhases')
          : textInitiative
            ? t('rules.compat.numericOnly')
            : declaration
              ? t('rules.compat.disableDeclarationFirst')
              : rules.initiativeOrder === initiativeOrders.ASC
                ? t('rules.compat.unavailableAscending')
                : '',
    ),
    surpriseAdvanceOn: {
      activation: blocked(rules.temporalite === temporalityModes.FLEXIBLE, t('rules.compat.surpriseFlexible')),
      round: blocked(false, ''),
    },
    labelInitiative: blocked(automaticPhases || !flexibleInitiative || initiativeCost, initiativeCost ? t('rules.compat.disableInitiativeCostFirst') : automaticPhases ? t('rules.compat.automaticPhasesNeedNumeric') : t('rules.compat.flexibleNoLabels')),
    temporality: {
      [temporalityModes.CLASSIC]: blocked(false, ''),
      [temporalityModes.FLEXIBLE]: blocked(initiativeCost, t('rules.compat.disableInitiativeCostFirst')),
      [temporalityModes.PHASES]: blocked(multipleSlots || initiativeCost, initiativeCost ? t('rules.compat.disableInitiativeCostFirst') : t('rules.compat.disableManualActionsFirst')),
    },
    phaseActionMode: {
      [phaseActionModes.AUTOMATIC]: blocked(textInitiative || multipleSlots || initiativeCost, textInitiative ? t('rules.compat.textInitiativeAutomaticPhases') : initiativeCost ? t('rules.compat.disableInitiativeCostFirst') : t('rules.compat.disableManualActionsFirst')),
      [phaseActionModes.CHECKED]: blocked(multipleSlots || initiativeCost, initiativeCost ? t('rules.compat.disableInitiativeCostFirst') : t('rules.compat.disableManualActionsFirst')),
    },
  };
}

export function activeRuleSummary(rules = {}) {
  return [
    t(temporalitySummaryKeys[rules.temporalite || temporalityModes.CLASSIC] || temporalitySummaryKeys[temporalityModes.CLASSIC]),
    usesFlexibleInitiative(rules) ? usesTextInitiative(rules) ? t('rules.summary.labelInitiative') : t('rules.summary.numericInitiative') : t('rules.summary.noInitiative'),
    multipleActionModeFromRules(rules) === multipleActionModes.INITIATIVE_COST ? t('rules.summary.initiativeCost') : multipleActionModeFromRules(rules) === multipleActionModes.MANUAL ? t('rules.summary.manualSlots') : t('rules.summary.singleAction'),
    usesDeclaration(rules) ? t('rules.summary.declaration') : '',
  ].filter(Boolean);
}
