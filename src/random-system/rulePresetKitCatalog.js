import {
  fixedValue,
  parameterValue,
  randomAggregateOperations,
  randomChoiceControlKinds,
  randomSourceKinds,
  normalizeRandomDefinition,
  normalizeRandomSource,
  randomOptionTypes,
  randomParameterTypes,
  randomPipelineStepTypes,
} from './engine.js';
import { createWeightedSource } from './core/sources.js';
import { resetCardSource } from './cardSources.js';
import { createStandardSources, standardSourceIds } from './defaults.js';
export {
  randomKitApplicationPolicies,
  randomKitFamilyTags,
  randomKitInitiativeModes,
  standardCardSourceIds,
} from './rulePresetKitConstants.js';
import { randomKitApplicationPolicies, randomKitFamilyTags, randomKitInitiativeModes, standardCardSourceIds } from './rulePresetKitConstants.js';

const cosmerePlotSourceId = 'kit-cosmere-plot-d6';
const cosmerePlotImages = {
  complication2: '/icons/cadence/special-dice/Cosmere_Complication_2.svg',
  complication4: '/icons/cadence/special-dice/Cosmere_Complication_4.svg',
  boon: '/icons/cadence/special-dice/Cosmere_Aubaine.svg',
};

function integerParameter(id, label, defaultValue, min = -999, max = 999) {
  return {
    id,
    label,
    type: randomParameterTypes.INTEGER,
    defaultValue,
    min,
    max,
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

function totalStep(outputId = 'total', label = 'Total') {
  return {
    id: outputId,
    type: randomPipelineStepTypes.AGGREGATE,
    operation: randomAggregateOperations.SUM,
    outputId,
    label,
  };
}

function modifierStep(targetAggregateId = 'total') {
  return {
    id: 'modifier',
    type: randomPipelineStepTypes.MODIFIER,
    targetAggregateId,
    value: parameterValue('modifier'),
    label: 'Modificateur',
  };
}

function valueStep(outputId = 'result', label = 'Resultat') {
  return {
    id: outputId,
    type: randomPipelineStepTypes.AGGREGATE,
    operation: randomAggregateOperations.VALUES,
    outputId,
    label,
  };
}

function d20RollDefinition(id, name) {
  return {
    id,
    name,
    visualId: 'd20',
    parameters: [integerParameter('modifier', 'Modificateur', 0)],
    options: [{
      id: 'mode',
      label: 'Mode',
      type: randomOptionTypes.CHOICE,
      control: randomChoiceControlKinds.SLIDER,
      defaultValue: 'normal',
      choices: [
        { value: 'disadvantage', label: 'Désavantage' },
        { value: 'normal', label: 'Normal' },
        { value: 'advantage', label: 'Avantage' },
      ],
    }],
    components: [{
      id: 'd20',
      label: 'd20',
      source: fixedValue(standardSourceIds.D20),
      count: fixedValue(1),
    }],
    pipeline: [
      {
        id: 'mode',
        type: randomPipelineStepTypes.REPEAT_SELECT,
        optionId: 'mode',
        variants: {
          normal: { repetitions: 1, select: 'first', aggregateId: 'total' },
          advantage: { repetitions: 2, select: 'highest', aggregateId: 'total' },
          disadvantage: { repetitions: 2, select: 'lowest', aggregateId: 'total' },
        },
      },
      totalStep(),
      modifierStep(),
    ],
    primaryAggregateId: 'total',
  };
}

function d20SimpleRollDefinition(id, name) {
  return {
    id,
    name,
    visualId: 'd20',
    parameters: [integerParameter('modifier', 'Modificateur', 0)],
    components: [{ id: 'd20', label: 'd20', source: fixedValue(standardSourceIds.D20), count: fixedValue(1) }],
    pipeline: [totalStep(), modifierStep()],
    primaryAggregateId: 'total',
  };
}

function singleDieTotalDefinition(id, name, sourceId) {
  return {
    id,
    name,
    parameters: [integerParameter('modifier', 'Modificateur', 0)],
    components: [{
      id: 'die',
      label: 'De',
      source: fixedValue(sourceId),
      count: fixedValue(1),
    }],
    pipeline: [totalStep(), modifierStep()],
    primaryAggregateId: 'total',
  };
}

function dicePoolTotalDefinition(id, name, defaultSourceId) {
  return {
    id,
    name,
    visualId: 'dice-pool',
    parameters: [
      sourceParameter('die', 'De', defaultSourceId),
      integerParameter('count', 'Nombre de des', 1, 1, 1000),
      integerParameter('modifier', 'Modificateur', 0),
    ],
    components: [{
      id: 'dice',
      label: 'Des',
      source: parameterValue('die'),
      count: parameterValue('count'),
    }],
    pipeline: [totalStep(), modifierStep()],
    primaryAggregateId: 'total',
  };
}

function mixedDiceTotalDefinition(id, name, firstSourceId, secondSourceId, exploding = false) {
  const pipeline = [totalStep(), modifierStep()];
  if (exploding) {
    pipeline.unshift({
      id: 'explosion',
      type: randomPipelineStepTypes.EXPLODE,
      condition: { type: 'source-extreme', extreme: 'max' },
      maxIterations: 20,
    });
  }
  return {
    id,
    name,
    visualId: 'dice-pool',
    parameters: [
      sourceParameter('die-1', 'Premier dé', firstSourceId),
      integerParameter('count-1', 'Nombre', 1, 0, 1000),
      sourceParameter('die-2', 'Second dé', secondSourceId),
      integerParameter('count-2', 'Nombre', 0, 0, 1000),
      integerParameter('modifier', 'Modificateur', 0),
    ],
    components: [
      {
        id: 'dice-1',
        label: 'Premier groupe',
        source: parameterValue('die-1'),
        count: parameterValue('count-1'),
      },
      {
        id: 'dice-2',
        label: 'Second groupe',
        source: parameterValue('die-2'),
        count: parameterValue('count-2'),
      },
    ],
    pipeline,
    primaryAggregateId: 'total',
  };
}

function poolSuccessDefinition(id, name, sourceId, thresholdDefault) {
  return {
    id,
    name,
    visualId: 'dice-pool',
    parameters: [
      integerParameter('count', 'Nombre de des', 5, 1, 1000),
      integerParameter('threshold', 'Seuil', thresholdDefault, -999, 999),
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
      source: fixedValue(sourceId),
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
        id: 'success-threshold',
        type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
        condition: { type: 'compare', operator: 'gte', value: parameterValue('threshold') },
      },
      {
        id: 'successes',
        type: randomPipelineStepTypes.AGGREGATE,
        operation: randomAggregateOperations.COUNT_SUCCESSES,
        outputId: 'successes',
        label: 'Succes',
      },
    ],
    primaryAggregateId: 'successes',
  };
}

function savageTraitDefinition() {
  return {
    id: 'kit-savage-trait-wild',
    name: 'Dé de trait + dé Joker',
    visualId: 'dice-pool',
    parameters: [
      sourceParameter('trait-die', 'Dé de trait', standardSourceIds.D8),
      integerParameter('modifier', 'Modificateur', 0),
    ],
    components: [
      {
        id: 'trait',
        label: 'Trait',
        source: parameterValue('trait-die'),
        count: fixedValue(1),
      },
      {
        id: 'wild',
        label: 'Dé Joker',
        source: fixedValue(standardSourceIds.D6),
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
        id: 'keep-highest',
        type: randomPipelineStepTypes.KEEP,
        count: fixedValue(1),
        unit: 'chain',
        order: 'highest',
      },
      totalStep(),
      modifierStep(),
    ],
    primaryAggregateId: 'total',
  };
}

function createCosmerePlotSource() {
  return createWeightedSource({
    id: cosmerePlotSourceId,
    name: 'Cosmere - dé d’intrigue',
    outcomes: [
      { id: 'complication-2', value: 1, label: 'Complication 2', weight: 1, image: cosmerePlotImages.complication2 },
      { id: 'complication-4', value: 2, label: 'Complication 4', weight: 1, image: cosmerePlotImages.complication4 },
      { id: 'blank-3', value: 3, label: 'Face vierge', weight: 1 },
      { id: 'blank-4', value: 4, label: 'Face vierge', weight: 1 },
      { id: 'boon-5', value: 5, label: 'Aubaine', weight: 1, image: cosmerePlotImages.boon },
      { id: 'boon-6', value: 6, label: 'Aubaine', weight: 1, image: cosmerePlotImages.boon },
    ],
  });
}

const d20PresetIds = [
  'generiques/classique',
  'generiques/declaration-puis-resolution',
  'generiques/initiative-a-cout',
  'generiques/initiative-souple-ordonnee',
  'generiques/phases-cochees',
  'generiques/phases-par-initiative',
  'systemes/d20-boss-mythique',
  'systemes/d20-tactique-dd-pathfinder',
];

export const randomKitCatalog = [
  {
    id: 'kit-d20-generic',
    label: 'd20 generique',
    description: 'Couvre les dés polyédriques usuels des jeux d20, avec avantage ou désavantage sur le d20 et un tirage multiple configurable.',
    familyTags: [randomKitFamilyTags.D20_GENERIC],
    presetIds: d20PresetIds,
    sourceIds: [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
      standardSourceIds.D20,
      standardSourceIds.D100,
    ],
    sources: [],
    definitions: [
      d20SimpleRollDefinition('kit-d20-check-simple', 'Jet d20 simple'),
      d20RollDefinition('kit-d20-check', 'Jet d20'),
      mixedDiceTotalDefinition('kit-d20-polyhedral', 'Dés polyédriques', standardSourceIds.D6, standardSourceIds.D4),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NUMERIC,
      defaultDefinitionId: 'kit-d20-check',
      tiebreaker: 'modifier-or-manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.FILL_EMPTY,
  },
  {
    id: 'kit-d100-percentile',
    label: 'd100 / percentile',
    description: 'Couvre les jets percentile avec dé bonus ou pénalité, ainsi que les dés de dégâts usuels de l’Appel de Cthulhu.',
    familyTags: [randomKitFamilyTags.D100_PERCENTILE],
    presetIds: ['systemes/appel-de-cthulhu-7e'],
    sourceIds: [
      standardSourceIds.D3,
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D20,
      standardSourceIds.D100,
    ],
    sources: [],
    definitions: [
      {
        id: 'kit-d100-check',
        name: 'Jet percentile',
        parameters: [integerParameter('target', 'Seuil', 50, 1, 100)],
        options: [{
          id: 'mode',
          label: 'Mode',
          type: randomOptionTypes.CHOICE,
          control: randomChoiceControlKinds.SLIDER,
          defaultValue: 'normal',
          choices: [
            { value: 'bonus', label: 'Dé bonus' },
            { value: 'normal', label: 'Normal' },
            { value: 'penalty', label: 'Dé pénalité' },
          ],
        }],
        components: [{
          id: 'd100',
          label: 'd100',
          source: fixedValue(standardSourceIds.D100),
          count: fixedValue(1),
        }],
        pipeline: [
          {
            id: 'mode',
            type: randomPipelineStepTypes.REPEAT_SELECT,
            optionId: 'mode',
            variants: {
              normal: { repetitions: 1, select: 'first', aggregateId: 'roll' },
              bonus: { repetitions: 2, select: 'lowest', aggregateId: 'roll' },
              penalty: { repetitions: 2, select: 'highest', aggregateId: 'roll' },
            },
          },
          {
            id: 'success-threshold',
            type: randomPipelineStepTypes.SUCCESS_THRESHOLD,
            condition: { type: 'compare', operator: 'lte', value: parameterValue('target') },
          },
          totalStep('roll', 'Resultat'),
        ],
        primaryAggregateId: 'roll',
      },
      mixedDiceTotalDefinition('kit-d100-polyhedral', 'Dés polyédriques', standardSourceIds.D6, standardSourceIds.D4),
    ],
    initiative: {
      mode: randomKitInitiativeModes.MANUAL,
      defaultDefinitionId: null,
      tiebreaker: 'manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-d6-pool',
    label: 'Pool de d6',
    description: 'Couvre les pools de d6 à succès de Shadowrun et les sommes de d6 avec modificateur.',
    familyTags: [randomKitFamilyTags.D6_POOL],
    presetIds: ['systemes/shadowrun-5'],
    sourceIds: [standardSourceIds.D6],
    sources: [],
    definitions: [
      poolSuccessDefinition('kit-d6-pool-successes', 'Pool de d6', standardSourceIds.D6, 5),
      dicePoolTotalDefinition('kit-d6-total', 'd6 cumulés', standardSourceIds.D6),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NUMERIC,
      defaultDefinitionId: 'kit-d6-total',
      tiebreaker: 'manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-narrative-no-initiative',
    label: 'Narratif sans initiative',
    description: 'Ajoute les tirages narratifs courants, dont 2d6 + modificateur et pool de d10, sans initiative chiffree par defaut.',
    familyTags: [randomKitFamilyTags.TWO_D6_MOD, randomKitFamilyTags.D10_POOL],
    presetIds: [
      'generiques/initiative-souple-sans-initiative',
      'systemes/narratif-sans-initiative-pbta-vtm',
    ],
    sourceIds: [standardSourceIds.D6, standardSourceIds.D10],
    sources: [],
    definitions: [
      {
        id: 'kit-2d6-mod',
        name: '2d6 + modificateur',
        parameters: [integerParameter('modifier', 'Modificateur', 0)],
        components: [{
          id: 'dice',
          label: '2d6',
          source: fixedValue(standardSourceIds.D6),
          count: fixedValue(2),
        }],
        pipeline: [totalStep(), modifierStep()],
        primaryAggregateId: 'total',
      },
      poolSuccessDefinition('kit-d10-pool-successes', 'Pool de d10', standardSourceIds.D10, 8),
    ],
    initiative: {
      mode: randomKitInitiativeModes.NONE,
      defaultDefinitionId: null,
      defaultSourceId: null,
      tiebreaker: 'none',
      order: 'none',
    },
    applicationPolicy: randomKitApplicationPolicies.MANUAL_ONLY,
  },
  {
    id: 'kit-cosmere-label-order',
    label: 'Cosmere RPG',
    description: 'Couvre le d20, le dé d’intrigue d6 et les dés polyédriques utilisés par le Cosmere RPG.',
    familyTags: [randomKitFamilyTags.D20_GENERIC],
    presetIds: ['systemes/cosmere-rpg'],
    sourceIds: [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
      standardSourceIds.D20,
      cosmerePlotSourceId,
    ],
    sources: [createCosmerePlotSource()],
    definitions: [
      d20RollDefinition('kit-cosmere-d20-check', 'Jet d20'),
      {
        id: 'kit-cosmere-plot',
        name: 'Dé d’intrigue (d6)',
        components: [{
          id: 'plot',
          label: 'Dé d’intrigue',
          source: fixedValue(cosmerePlotSourceId),
          count: fixedValue(1),
        }],
        pipeline: [valueStep('plot', 'Intrigue')],
        primaryAggregateId: 'plot',
      },
      mixedDiceTotalDefinition('kit-cosmere-polyhedral', 'Dés polyédriques', standardSourceIds.D6, standardSourceIds.D4),
    ],
    initiative: {
      mode: randomKitInitiativeModes.LABEL_ORDER,
      defaultDefinitionId: null,
      tiebreaker: 'manual',
      order: 'text-order',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-savage-step-cards',
    label: 'Savage Worlds',
    description: 'Couvre les dés de trait et le dé Joker, les dés cumulés explosifs et le paquet de cartes standard.',
    familyTags: [
      randomKitFamilyTags.STEP_DICE,
      randomKitFamilyTags.EXPLODING_DICE,
      randomKitFamilyTags.CARDS,
    ],
    presetIds: ['systemes/savage-worlds'],
    sourceIds: [
      standardSourceIds.D4,
      standardSourceIds.D6,
      standardSourceIds.D8,
      standardSourceIds.D10,
      standardSourceIds.D12,
      standardCardSourceIds.STANDARD_54,
    ],
    sources: [],
    definitions: [
      savageTraitDefinition(),
      mixedDiceTotalDefinition('kit-savage-step', 'Dés explosifs cumulés', standardSourceIds.D6, standardSourceIds.D8, true),
    ],
    initiative: {
      mode: randomKitInitiativeModes.CARDS,
      defaultDefinitionId: null,
      defaultSourceId: standardCardSourceIds.STANDARD_54,
      defaultCardCount: 1,
      tiebreaker: 'card-suit-then-manual',
      order: 'card-order',
    },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  },
  {
    id: 'kit-random-order',
    label: 'Ordre aleatoire generique',
    description: 'Utilise un d100 générique quand une règle de campagne demande un ordre aléatoire.',
    familyTags: [randomKitFamilyTags.RANDOM_ORDER],
    presetIds: [],
    sourceIds: [standardSourceIds.D100],
    sources: [],
    definitions: [singleDieTotalDefinition('kit-random-d100', 'd100', standardSourceIds.D100)],
    initiative: {
      mode: randomKitInitiativeModes.RANDOM_ORDER,
      defaultDefinitionId: 'kit-random-d100',
      tiebreaker: 'reroll-or-manual',
      order: 'desc',
    },
    applicationPolicy: randomKitApplicationPolicies.REPLACE_ALL,
  },
];

