export const randomSourceKinds = {
  UNIFORM: 'uniform',
  WEIGHTED: 'weighted',
  CARDS: 'cards',
};

export const randomParameterTypes = {
  INTEGER: 'integer',
  NUMBER: 'number',
  SOURCE: 'source',
  TEXT: 'text',
};

export const randomOptionTypes = {
  BOOLEAN: 'boolean',
  CHOICE: 'choice',
};

export const randomChoiceControlKinds = {
  AUTO: 'auto',
  SWITCH: 'switch',
  SLIDER: 'slider',
  SELECT: 'select',
};

export const randomDefinitionKinds = {
  ROLL: 'roll',
  COMBINATION: 'combination',
};

export const randomPipelineStepTypes = {
  REPEAT_SELECT: 'repeat-select',
  REROLL: 'reroll',
  EXPLODE: 'explode',
  MAP_VALUE: 'map-value',
  LOOKUP_TABLE: 'lookup-table',
  SUCCESS_THRESHOLD: 'success-threshold',
  MARKER: 'marker',
  KEEP: 'keep',
  AGGREGATE: 'aggregate',
  OCCURRENCE_BONUS: 'occurrence-bonus',
  MODIFIER: 'modifier',
};

export const randomAggregateOperations = {
  VALUES: 'values',
  SUM: 'sum',
  SUBTRACT: 'subtract',
  COUNT_SUCCESSES: 'count-successes',
  COUNT_MATCHES: 'count-matches',
  COUNT_MARKER: 'count-marker',
};

export const randomKeepOrders = {
  HIGHEST: 'highest',
  LOWEST: 'lowest',
};

export const MAX_SOURCE_OUTCOMES = 10000;
export const MAX_DRAWS_PER_COMPONENT = 1000;
export const MAX_TRANSFORM_ITERATIONS = 100;
