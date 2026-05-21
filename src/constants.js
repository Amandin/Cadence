export const APP_VERSION = '0.2.8.1';
export const STORAGE_KEY = 'cadence:campaign:v1';
export const TEMPLATE_STORAGE_KEY = 'cadence:templates:v1';

export const participantKinds = ['PJ', 'Alliép', 'Opposant', 'Environnement'];

export const legacyParticipantKinds = {
  Opposition: 'Opposant',
  Horloge: 'Environnement',
  Autre: 'Environnement',
};

export const defaultCategoryOrder = ['PJ', 'Opposant', 'Allié', 'Environnement'];

export const temporalityModes = {
  CLASSIC: 'classique',
  FLEXIBLE: 'souple',
  PHASES: 'phases',
};

export const defaultTemporalityMode = temporalityModes.CLASSIC;
export const defaultStartRound = 0;
export const defaultPhaseDecrement = 10;
export const defaultPhaseRerollEachRound = false;
export const defaultPhaseActivateOncePerRound = true;

export const temporalityLabels = {
  [temporalityModes.CLASSIC]: 'Classique',
  [temporalityModes.FLEXIBLE]: 'Souple',
  [temporalityModes.PHASES]: 'Phases',
};

export const temporalityDescriptions = {
  [temporalityModes.CLASSIC]: 'Cadence suit l’ordre d’initiative et avance au participant suivant.',
  [temporalityModes.FLEXIBLE]: 'Le MJ marque librement qui a joué dans la liste.',
  [temporalityModes.PHASES]: 'Cadence enchaî�e des phases et applique un décrément aux initiatives.',
};

export const equalityRules = {
  NEVER: 'never',
  STRICT: 'strict',
  LOOSE: 'loose',
};

export const defaultEqualityRule = equalityRules.STRICT;

export const equalityRuleLabels = {
  [equalityRules.NEVER]: 'Jamais',
  [equalityRules.STRICT]: 'Strict',
  [equalityRules.LOOSE]: 'Souple',
};

export const equalityRuleDescriptions = {
  [equalityRules.NEVER]: 'Aucun vrai simultané : si tout est égal, Cadence trie par nom.',
  [equalityRules.STRICT]: 'Simultané seulement si initiative, départage et type sont identiques.',
  [equalityRules.LOOSE]: 'Simultané dés que initiative et départage sont identiques.',
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
