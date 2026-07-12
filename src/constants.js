export const APP_VERSION = '0.15.2';
export const STORAGE_KEY = 'cadence:campaign:v1';
export const TEMPLATE_STORAGE_KEY = 'cadence:templates:v1';

export const participantKinds = ['PJ', 'Compagnon', 'Allié', 'Élite', 'Opposant', 'Environnement'];
export const tacticalRoles = ['normal', 'group', 'boss'];
export const defaultTacticalRole = 'normal';

export const legacyParticipantKinds = {
  Opposition: 'Opposant',
  Horloge: 'Environnement',
  Autre: 'Environnement',
};

// Kept in its historical order so loading an old campaign never changes initiative visibly.
// The two newer standard profiles remain available and can be inserted anywhere by the user.
export const defaultCategoryOrder = ['PJ', 'Opposant', 'Allié', 'Environnement'];
export const defaultTiebreakerVisible = true;
export const defaultTiebreakerLabel = 'Départage';
export const defaultInitiativeBonusEnabled = true;
export const defaultFlexibleUseInitiative = true;
export const surpriseImpacts = { LIMITED: 'limited', INACTIVE: 'inactive' };
export const defaultSurpriseImpact = surpriseImpacts.LIMITED;
export const defaultSurpriseAdvanceOn = 'activation';
export const defaultSurpriseDedicatedRound = false;

export const temporalityModes = {
  CLASSIC: 'classique',
  FLEXIBLE: 'souple',
  PHASES: 'phases',
  DECLARATION: 'declaration',
};

export const defaultTemporalityMode = temporalityModes.CLASSIC;
export const defaultDeclarationMode = false;
export const defaultStartRound = 1;
export const defaultPhaseDecrement = 10;
export const defaultPhaseRerollEachRound = false;
export const defaultPhaseActivateOncePerRound = true;
export const phaseActionModes = { AUTOMATIC: 'automatic', CHECKED: 'checked' };
export const defaultPhaseActionMode = phaseActionModes.AUTOMATIC;
export const defaultPhaseCount = 3;
export const initiativeValueTypes = { NUMERIC: 'numeric', LABEL: 'label' };
export const defaultInitiativeValueType = initiativeValueTypes.NUMERIC;
export const activationAdvancePolicies = { ONCE_PER_ROUND: 'once-per-round', EVERY_ACTION: 'every-action' };
export const defaultActivationAdvancePolicy = activationAdvancePolicies.ONCE_PER_ROUND;
export const multipleActionModes = { NONE: 'none', MANUAL: 'manual', INITIATIVE_COST: 'initiative-cost' };
export const defaultMultipleActionMode = multipleActionModes.NONE;
export const manualMultipleActionScopes = { ALL: 'all', ELITE_ONLY: 'elite-only' };
export const defaultManualMultipleActionScope = manualMultipleActionScopes.ALL;
export const defaultInitiativeCostThreshold = 0;
export const defaultInitiativeCostQuickCosts = [1, 2, 3, 5];
export const defaultInitiativeCostLimitToCurrent = false;

export const equalityRules = {
  NEVER: 'never',
  STRICT: 'strict',
  LOOSE: 'loose',
};

export const defaultEqualityRule = equalityRules.STRICT;

export const initiativeOrders = {
  DESC: 'desc',
  ASC: 'asc',
};

export const defaultInitiativeOrder = initiativeOrders.DESC;

export const trackerTypeLabels = {
  bar: 'Barre',
  points: 'Puces',
  number: 'Compteur',
  clock: 'Horloge',
  boxes: 'Cases',
};

export const colorNames = {
  slate: 'Ardoise',
  red: 'Rouge',
  orange: 'Orange',
  amber: 'Ambre',
  emerald: 'Émeraude',
  cyan: 'Cyan',
  blue: 'Bleu',
  violet: 'Violet',
  pink: 'Rose',
  rose: 'Framboise',
};

export const colorAccents = {
  neutral: '#94a3b8',
  green: '#22c55e',
  slate: '#64748b',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  emerald: '#10b981',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  pink: '#ec4899',
  rose: '#f43f5e',
  default: '#94a3b8',
};

