import {
  buildRandomDefinition,
  builderExplosionModes,
  builderModes,
  builderResultModes,
  createCalculationDraft,
  createDefinitionDraft,
} from './definitionBuilder.js';
import { standardSourceIds } from './defaults.js';
import { randomOptionTypes } from './engine.js';

export const noCodeExampleCatalog = Object.freeze([
  { id: 'd20-advantage', name: 'd20 avec avantage et désavantage', description: 'Trois modes d20 avec modificateur demandé au lancer.' },
  { id: 'cosmere', name: 'Cosmere', description: 'Avantage ou désavantage et dé d’intrigue activable séparément.' },
  { id: 'standard-dice', name: 'Jet de dés personnalisable', description: 'Choisissez le type et le nombre de dés, puis ajoutez si besoin une explosion ou une relance.' },
  { id: 'shadowrun', name: 'Shadowrun', description: 'Réserve de d6 succès sur 5+ complications sur 1 et jet de chance explosif.' },
  { id: 'l5r', name: 'L5R', description: 'Réserve de d10 explosifs dont on garde les meilleurs résultats.' },
  { id: 'daggerheart', name: 'Daggerheart', description: 'Deux d12 de couleurs distinctes avec un d6 ajouté en avantage ou soustrait en désavantage.' },
  { id: 'pbta', name: 'PbtA · 2d6 + modificateur', description: 'Le jet 2d6 classique avec modificateur demandé.' },
  { id: 'savage-worlds', name: 'Savage Worlds · dé de trait et dé joker', description: 'Deux dés explosifs dont seul le meilleur résultat est conservé.' },
  { id: 'year-zero', name: 'Year Zero · trois réserves de d6', description: 'Caractéristique compétence et équipement avec succès sur 6.' },
  { id: 'd10-success-pool', name: 'Pool de d10 · succès sur 8+', description: 'Réserve de d10 avec 10 explosifs et compteur de complications sur 1.' },
  { id: 'percentile', name: 'Test percentile', description: 'Un d100 doit obtenir un résultat inférieur ou égal au seuil demandé.' },
]);

export const dnd5DefaultNoCodeExampleIds = Object.freeze(['d20-advantage', 'standard-dice']);
export const dnd5InitiativeDefinitionId = 'default-dnd5-d20-advantage';

function option(id, label, defaultValue, choices, control = choices.length === 2 ? 'switch' : 'slider') {
  return { id, label, defaultValue, control, choices };
}

function toggleOption(id, label, defaultValue = false) {
  return { id, label, type: randomOptionTypes.BOOLEAN, defaultValue };
}

function condition(optionId, equals) {
  return [{ optionId, equals }];
}

function exampleBase(exampleId, sources) {
  const metadata = noCodeExampleCatalog.find((item) => item.id === exampleId);
  const draft = createDefinitionDraft(sources);
  draft.id = `example-${exampleId}`;
  draft.name = metadata?.name || 'Exemple de tirage';
  return draft;
}

function componentFrom(draft, id, patch = {}) {
  return {
    ...draft.components[0],
    id,
    label: patch.label ?? draft.components[0].label,
    calculation: {
      ...createCalculationDraft(false),
      ...(patch.calculation || {}),
    },
    reroll: {
      ...draft.components[0].reroll,
      ...(patch.reroll || {}),
    },
    ...patch,
  };
}

function enableRequestedModifier(draft) {
  draft.modifierEnabled = true;
  draft.modifierMode = builderModes.PROMPT;
}

function d20Branches(draft) {
  const branch = (id, count, approach, keepMode = 'none') => componentFrom(draft, id, {
    label: approach,
    sourceId: standardSourceIds.D20,
    count,
    enabledWhen: condition('approach', approach),
    calculation: {
      ...createCalculationDraft(keepMode !== 'none'),
      keepMode,
      keepCount: 1,
    },
  });
  return [
    branch('disadvantage', 2, 'disadvantage', 'lowest'),
    branch('normal', 1, 'normal'),
    branch('advantage', 2, 'advantage', 'highest'),
  ];
}

function configureD20Advantage(draft) {
  draft.visualId = 'd20';
  draft.rollOptions = [option('approach', 'Approche', 'normal', [
    { value: 'disadvantage', label: 'Désavantage' },
    { value: 'normal', label: 'Normal' },
    { value: 'advantage', label: 'Avantage' },
  ])];
  draft.components = d20Branches(draft);
  enableRequestedModifier(draft);
}

function configureCosmere(draft, sources) {
  configureD20Advantage(draft);
  draft.rollOptions.push(option('stakes', 'Monter les enjeux', 'none', [
    { value: 'none', label: 'Non' },
    { value: 'raise', label: 'Oui' },
  ]));
  const intrigueSource = sources.find((source) => source.id === 'kit-cosmere-plot-d6')?.id
    || standardSourceIds.D6;
  draft.components.push(componentFrom(draft, 'intrigue', {
    label: 'Dé d’intrigue',
    sourceId: intrigueSource,
    count: 1,
    enabledWhen: condition('stakes', 'raise'),
  }));
}

function configureStandardDice(draft) {
  draft.visualId = 'dice-pool';
  draft.recursive = true;
  draft.rollOptions = [toggleOption('rerolling', 'Relancer les 1')];
  const component = draft.components[0];
  component.id = 'dice';
  component.label = 'Dés';
  component.sourceMode = builderModes.REQUEST;
  component.sourceId = standardSourceIds.D20;
  component.sourceChoices = [
    standardSourceIds.D4,
    standardSourceIds.D6,
    standardSourceIds.D8,
    standardSourceIds.D10,
    standardSourceIds.D12,
    standardSourceIds.D20,
  ];
  component.countMode = builderModes.PROMPT;
  component.explosionMode = builderExplosionModes.OPTION;
  component.explosionOfferAfterRoll = true;
  component.reroll = {
    enabled: true,
    operator: 'eq',
    value: 1,
    maxIterations: 1,
    enabledWhen: condition('rerolling', true),
    offerAfterRoll: true,
  };
  enableRequestedModifier(draft);
}

function configureShadowrun(draft) {
  draft.visualId = 'dice-pool';
  draft.rollOptions = [option('chance', 'Type de jet', 'standard', [
    { value: 'standard', label: 'Standard' },
    { value: 'chance', label: 'Chance' },
  ])];
  const component = draft.components[0];
  component.id = 'pool';
  component.label = 'Réserve';
  component.sourceId = standardSourceIds.D6;
  component.countMode = builderModes.PROMPT;
  component.explosionMode = builderExplosionModes.ALWAYS;
  component.explosionEnabledWhen = condition('chance', 'chance');
  draft.resultMode = builderResultModes.SUCCESSES;
  draft.thresholdOperator = 'gte';
  draft.threshold = 5;
  draft.counters = [{ id: 'complications', label: 'Complications', operator: 'eq', value: 1 }];
}

function configureL5R(draft) {
  draft.visualId = 'd10';
  const component = draft.components[0];
  component.id = 'pool';
  component.label = 'Réserve';
  component.sourceId = standardSourceIds.D10;
  component.countMode = builderModes.PROMPT;
  component.explosionMode = builderExplosionModes.ALWAYS;
  draft.keepMode = 'highest';
  draft.keepCountMode = builderModes.PROMPT;
}

function configureDaggerheart(draft) {
  draft.visualId = 'd12';
  draft.rollOptions = [option('approach', 'Approche', 'normal', [
    { value: 'disadvantage', label: 'Désavantage' },
    { value: 'normal', label: 'Normal' },
    { value: 'advantage', label: 'Avantage' },
  ])];
  draft.components = [
    componentFrom(draft, 'hope-d12', {
      label: 'Dé d’Espoir',
      sourceId: standardSourceIds.D12,
      count: 1,
      color: '#2f8f83',
    }),
    componentFrom(draft, 'fear-d12', {
      label: 'Dé de Peur',
      sourceId: standardSourceIds.D12,
      count: 1,
      color: '#8b5cf6',
    }),
    componentFrom(draft, 'disadvantage-d6', {
      label: 'Dé de désavantage',
      sourceId: standardSourceIds.D6,
      count: 1,
      contribution: 'subtract',
      enabledWhen: condition('approach', 'disadvantage'),
    }),
    componentFrom(draft, 'advantage-d6', {
      label: 'Dé d’avantage',
      sourceId: standardSourceIds.D6,
      count: 1,
      enabledWhen: condition('approach', 'advantage'),
    }),
  ];
  enableRequestedModifier(draft);
}

function configurePbta(draft) {
  draft.visualId = 'd6';
  draft.components[0].id = 'main';
  draft.components[0].label = '2d6';
  draft.components[0].sourceId = standardSourceIds.D6;
  draft.components[0].count = 2;
  enableRequestedModifier(draft);
}

function configureSavageWorlds(draft) {
  draft.visualId = 'dice-pool';
  draft.components = [
    componentFrom(draft, 'trait', {
      label: 'Dé de trait',
      sourceMode: builderModes.REQUEST,
      sourceId: standardSourceIds.D8,
      sourceChoices: [
        standardSourceIds.D4,
        standardSourceIds.D6,
        standardSourceIds.D8,
        standardSourceIds.D10,
        standardSourceIds.D12,
      ],
      count: 1,
      explosionMode: builderExplosionModes.ALWAYS,
    }),
    componentFrom(draft, 'wild-die', {
      label: 'Dé joker',
      sourceId: standardSourceIds.D6,
      count: 1,
      explosionMode: builderExplosionModes.ALWAYS,
    }),
  ];
  draft.keepMode = 'highest';
  draft.keepCount = 1;
  enableRequestedModifier(draft);
}

function configureYearZero(draft) {
  draft.visualId = 'dice-pool';
  const pool = (id, label, color) => componentFrom(draft, id, {
    label,
    color,
    sourceId: standardSourceIds.D6,
    countMode: builderModes.REQUEST,
    count: 0,
  });
  draft.components = [
    pool('attribute', 'Caractéristique', '#c8a94b'),
    pool('skill', 'Compétence', '#2f8f83'),
    pool('gear', 'Équipement', '#1f2937'),
  ];
  draft.resultMode = builderResultModes.SUCCESSES;
  draft.thresholdOperator = 'gte';
  draft.threshold = 6;
}

function configureD10SuccessPool(draft) {
  draft.visualId = 'dice-pool';
  const component = draft.components[0];
  component.id = 'pool';
  component.label = 'Réserve';
  component.sourceId = standardSourceIds.D10;
  component.countMode = builderModes.PROMPT;
  component.explosionMode = builderExplosionModes.ALWAYS;
  draft.resultMode = builderResultModes.SUCCESSES;
  draft.thresholdOperator = 'gte';
  draft.threshold = 8;
  draft.counters = [{ id: 'ones', label: 'Complications', operator: 'eq', value: 1 }];
}

function configurePercentile(draft) {
  draft.visualId = 'percentile';
  draft.components[0].id = 'percentile';
  draft.components[0].label = 'd100';
  draft.components[0].sourceId = standardSourceIds.D100;
  draft.components[0].count = 1;
  draft.resultMode = builderResultModes.SUCCESSES;
  draft.thresholdOperator = 'lte';
  draft.thresholdMode = builderModes.PROMPT;
}

const configurators = {
  'd20-advantage': configureD20Advantage,
  cosmere: configureCosmere,
  'standard-dice': configureStandardDice,
  shadowrun: configureShadowrun,
  l5r: configureL5R,
  daggerheart: configureDaggerheart,
  pbta: configurePbta,
  'savage-worlds': configureSavageWorlds,
  'year-zero': configureYearZero,
  'd10-success-pool': configureD10SuccessPool,
  percentile: configurePercentile,
};

export function createNoCodeExampleDraft(exampleId, sources = []) {
  const draft = exampleBase(exampleId, sources);
  configurators[exampleId]?.(draft, sources);
  return draft;
}

export function createDnd5DefaultDefinitions(sources = []) {
  return dnd5DefaultNoCodeExampleIds.map((exampleId) => {
    const draft = createNoCodeExampleDraft(exampleId, sources);
    draft.id = exampleId === 'd20-advantage'
      ? dnd5InitiativeDefinitionId
      : `default-dnd5-${exampleId}`;
    return buildRandomDefinition(draft);
  });
}
