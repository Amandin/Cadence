import {
  createUniformSource,
  fixedValue,
  parameterValue,
  randomAggregateOperations,
  randomChoiceControlKinds,
  randomDefinitionKinds,
  randomKeepOrders,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';
import { createStarterCardSources } from './cardSourceDefaults.js';

export const standardSourceIds = {
  D4: 'standard-d4',
  D6: 'standard-d6',
  D8: 'standard-d8',
  D10: 'standard-d10',
  D12: 'standard-d12',
  D20: 'standard-d20',
  D100: 'standard-d100',
  WEATHER_D10: 'example-weather-d10',
};

export function createWeatherD10Source() {
  return createUniformSource({
    id: standardSourceIds.WEATHER_D10,
    name: 'd10 Météo',
    min: 1,
    max: 10,
    labels: {
      1: 'Grand soleil',
      2: 'Éclaircies',
      3: 'Nuageux',
      4: 'Couvert',
      5: 'Bruine',
      6: 'Pluie',
      7: 'Forte pluie',
      8: 'Orage',
      9: 'Brouillard',
      10: 'Vent violent',
    },
    symbols: {
      1: '☀️',
      2: '🌤️',
      3: '⛅',
      4: '☁️',
      5: '☔',
      6: '🌧️',
      7: '🌧️☔',
      8: '⛈️',
      9: '🌫️',
      10: '💨',
    },
  });
}

export function createStandardSources() {
  return [
    ...[4, 6, 8, 10, 12, 20, 100].map((max) => createUniformSource({
      id: `standard-d${max}`,
      name: `d${max}`,
      min: 1,
      max,
    })),
    createWeatherD10Source(),
    ...createStarterCardSources(),
  ];
}

function totalStep(outputId = 'total', label = 'Total') {
  return {
    id: outputId,
    type: randomPipelineStepTypes.AGGREGATE,
    operation: randomAggregateOperations.SUM,
    outputId,
    label,
  };
}

function sourceParameter(id, label, defaultValue) {
  return {
    id,
    label,
    type: randomParameterTypes.SOURCE,
    defaultValue,
  };
}

function integerParameter(id, label, defaultValue, min, max) {
  return {
    id,
    label,
    type: randomParameterTypes.INTEGER,
    defaultValue,
    min,
    max,
  };
}

export function createStarterDefinitions() {
  return [
    {
      id: 'starter-d20',
      name: 'Jet d20',
      kind: randomDefinitionKinds.COMBINATION,
      exposed: true,
      parameters: [],
      options: [{
        id: 'combination',
        label: 'Mode',
        type: randomOptionTypes.CHOICE,
        control: randomChoiceControlKinds.SLIDER,
        defaultValue: 'normal',
        choices: [
          { value: 'normal', label: 'Normal' },
          { value: 'advantage', label: 'Avantage' },
          { value: 'disadvantage', label: 'Désavantage' },
        ],
      }],
      components: [],
      pipeline: [{
        id: 'combination',
        type: randomPipelineStepTypes.REPEAT_SELECT,
        optionId: 'combination',
        variants: {
          normal: { definitionId: 'starter-d20-normal' },
          advantage: { definitionId: 'starter-d20-advantage' },
          disadvantage: { definitionId: 'starter-d20-disadvantage' },
        },
      }],
      primaryAggregateId: '',
    },
    ...[
      ['starter-d20-normal', 'Jet d20 - Normal', 1, null],
      ['starter-d20-advantage', 'Jet d20 - Avantage', 2, randomKeepOrders.HIGHEST],
      ['starter-d20-disadvantage', 'Jet d20 - Désavantage', 2, randomKeepOrders.LOWEST],
    ].map(([id, name, count, keepOrder]) => ({
      id,
      name,
      kind: randomDefinitionKinds.ROLL,
      exposed: false,
      parameters: [integerParameter('modifier', 'Modificateur', 0, -999, 999)],
      components: [{
        id: 'main',
        label: 'Jet',
        source: fixedValue(standardSourceIds.D20),
        count: fixedValue(count),
      }],
      pipeline: [
        ...(keepOrder ? [{
          id: 'keep',
          type: randomPipelineStepTypes.KEEP,
          count: fixedValue(1),
          unit: 'chain',
          order: keepOrder,
        }] : []),
        totalStep(),
        {
          id: 'modifier',
          type: randomPipelineStepTypes.MODIFIER,
          targetAggregateId: 'total',
          value: parameterValue('modifier'),
          label: 'Modificateur',
        },
      ],
      primaryAggregateId: 'total',
    })),
    {
      id: 'starter-pool',
      name: 'Pool',
      parameters: [
        integerParameter('count', 'Nombre de tirages', 5, 1, 1000),
        integerParameter('threshold', 'Seuil', 6, -999, 999),
      ],
      options: [{
        id: 'exploding',
        label: 'Explosion',
        type: randomOptionTypes.BOOLEAN,
        defaultValue: false,
      }],
      components: [{
        id: 'pool',
        label: 'Pool',
        source: fixedValue(standardSourceIds.D10),
        count: parameterValue('count'),
      }],
      pipeline: [
        {
          id: 'explosion',
          type: randomPipelineStepTypes.EXPLODE,
          condition: { type: 'source-extreme', extreme: 'max' },
          maxIterations: 20,
          enabledWhen: { optionId: 'exploding', equals: true },
        },
        {
          id: 'threshold',
          type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
          condition: { type: 'compare', operator: 'gte', value: parameterValue('threshold') },
        },
        {
          id: 'successes',
          type: randomPipelineStepTypes.AGGREGATE,
          operation: randomAggregateOperations.COUNT_SUCCESSES,
          outputId: 'successes',
          label: 'Succès',
        },
      ],
      primaryAggregateId: 'successes',
    },
    {
      id: 'starter-roll-keep',
      name: 'Roll & Keep',
      parameters: [
        integerParameter('count', 'Nombre de tirages', 5, 1, 1000),
        integerParameter('keep', 'Résultats gardés', 2, 1, 1000),
      ],
      components: [{
        id: 'pool',
        label: 'Pool',
        source: fixedValue(standardSourceIds.D10),
        count: parameterValue('count'),
      }],
      pipeline: [
        {
          id: 'keep',
          type: randomPipelineStepTypes.KEEP,
          count: parameterValue('keep'),
          unit: 'chain',
          order: randomKeepOrders.HIGHEST,
        },
        totalStep(),
      ],
      primaryAggregateId: 'total',
    },
    {
      id: 'starter-watermelon',
      name: 'Pastèque',
      parameters: [sourceParameter('second-source', 'Type du second tirage', standardSourceIds.D10)],
      components: [
        {
          id: 'base',
          label: 'Base',
          source: fixedValue(standardSourceIds.D6),
          count: fixedValue(1),
        },
        {
          id: 'second',
          label: 'Second tirage',
          source: parameterValue('second-source'),
          count: fixedValue(1),
        },
      ],
      pipeline: [
        {
          id: 'explosion',
          type: randomPipelineStepTypes.EXPLODE,
          condition: { type: 'source-extreme', extreme: 'max' },
          maxIterations: 20,
        },
        {
          id: 'keep',
          type: randomPipelineStepTypes.KEEP,
          count: fixedValue(1),
          unit: 'chain',
          order: randomKeepOrders.HIGHEST,
        },
        totalStep('best', 'Meilleur résultat'),
      ],
      primaryAggregateId: 'best',
    },
    {
      id: 'starter-step',
      name: 'Step',
      parameters: [
        sourceParameter('source', 'Source', standardSourceIds.D8),
        integerParameter('modifier', 'Modificateur', 0, -999, 999),
      ],
      components: [{
        id: 'step',
        label: 'Step',
        source: parameterValue('source'),
        count: fixedValue(1),
      }],
      pipeline: [
        totalStep(),
        {
          id: 'modifier',
          type: randomPipelineStepTypes.MODIFIER,
          targetAggregateId: 'total',
          value: parameterValue('modifier'),
          label: 'Modificateur',
        },
      ],
      primaryAggregateId: 'total',
    },
  ];
}
