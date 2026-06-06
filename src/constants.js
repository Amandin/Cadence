export const APP_VERSION = '0.6.17-work';
export const STORAGE_KEY = 'cadence:campaign:v1';
export const TEMPLATE_STORAGE_KEY = 'cadence:templates:v1';

export const participantKinds = ['PJ', 'Allié', 'Opposant', 'Environnement'];

export const legacyParticipantKinds = {
  Opposition: 'Opposant',
  Horloge: 'Environnement',
  Autre: 'Environnement',
};

export const defaultCategoryOrder = ['PJ', 'Opposant', 'Allié', 'Environnement'];
export const defaultTiebreakerVisible = true;
export const defaultTiebreakerLabel = 'Départage';
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
export const defaultInitiativeCostThreshold = 0;
export const defaultInitiativeCostQuickCosts = [1, 2, 3, 5];
export const defaultInitiativeCostLimitToCurrent = false;

export const temporalityLabels = {
  [temporalityModes.CLASSIC]: 'Classique',
  [temporalityModes.FLEXIBLE]: 'Souple',
  [temporalityModes.PHASES]: 'Phases',
  [temporalityModes.DECLARATION]: 'Déclaration puis résolution',
};

export const temporalityDescriptions = {
  [temporalityModes.CLASSIC]: 'Cadence suit l’ordre d’initiative et avance au participant suivant.',
  [temporalityModes.FLEXIBLE]: 'Les effets liés à l’activation sont résolus au début du round pour tous les personnages. Le bouton A joué ne déclenche pas d’évolution.',
  [temporalityModes.PHASES]: 'Cadence enchaîne des phases et applique un décrément aux initiatives.',
  [temporalityModes.DECLARATION]: 'Un temps de déclaration précède une résolution ordonnée des actions déclarées.',
};

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

export const initiativeOrderLabels = {
  [initiativeOrders.DESC]: 'Décroissant',
  [initiativeOrders.ASC]: 'Croissant',
};

export const initiativeOrderDescriptions = {
  [initiativeOrders.DESC]: 'Les valeurs hautes agissent d’abord.',
  [initiativeOrders.ASC]: 'Les valeurs basses agissent d’abord.',
};

export const equalityRuleLabels = {
  [equalityRules.NEVER]: 'Jamais',
  [equalityRules.STRICT]: 'Par type',
  [equalityRules.LOOSE]: 'Par initiative',
};

export const equalityRuleDescriptions = {
  [equalityRules.NEVER]: 'Aucun vrai simultané : si tout est égal, Cadence trie par nom.',
  [equalityRules.STRICT]: 'Simultané seulement si initiative, départage et type sont identiques.',
  [equalityRules.LOOSE]: 'Simultané dès que initiative et départage sont identiques.',
};

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
  red: '#f87171',
  amber: '#fbbf24',
  emerald: '#34d399',
  blue: '#38bdf8',
  violet: '#a78bfa',
  pink: '#f472b6',
  default: '#94a3b8',
};
