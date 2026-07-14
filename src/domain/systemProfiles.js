import { rulePresetCatalog } from '../rulePresets.js';
import { compileProfileHierarchy, createProfileHierarchy, loadProfileHierarchy } from './profileHierarchy.js';

export const initiativeSupportLevels = {
  OFFICIAL: 'official',
  COMMON_VARIANT: 'common-variant',
  HOME: 'home',
};

export const initiativeProfileStatuses = {
  AVAILABLE: 'available',
  PLANNED: 'planned',
};

export const quickRollProfileCatalog = Object.freeze([
  {
    id: 'quick-roll/d20-core',
    label: 'd20 avec avantage / désavantage',
    description: 'Lance deux d20 et conserve le meilleur ou le moins bon résultat.',
    kitId: 'kit-d20-generic',
    definitionIds: ['kit-d20-check', 'kit-d20-polyhedral'],
  },
  {
    id: 'quick-roll/d20-simple',
    label: 'd20 simple',
    description: 'Un d20 avec modificateur, sans avantage ni désavantage.',
    kitId: 'kit-d20-generic',
    definitionIds: ['kit-d20-check-simple', 'kit-d20-polyhedral'],
  },
  {
    id: 'quick-roll/d100-percentile',
    label: 'd100 / percentile',
    description: 'Jet sous seuil et dés polyédriques usuels.',
    kitId: 'kit-d100-percentile',
    definitionIds: ['kit-d100-check', 'kit-d100-polyhedral'],
  },
  {
    id: 'quick-roll/d6-pool',
    label: 'Pool de d6',
    description: 'Pool à succès et total de d6.',
    kitId: 'kit-d6-pool',
    definitionIds: ['kit-d6-pool-successes', 'kit-d6-total'],
  },
  {
    id: 'quick-roll/savage-worlds',
    label: 'Dés de Savage Worlds',
    description: 'Dé de trait, dé Joker, dés explosifs et paquet de cartes.',
    kitId: 'kit-savage-step-cards',
    definitionIds: ['kit-savage-trait-wild', 'kit-savage-step'],
  },
  {
    id: 'quick-roll/pbta-2d6',
    label: '2d6 + modificateur',
    description: 'Jet narratif 2d6 avec modificateur.',
    kitId: 'kit-narrative-no-initiative',
    definitionIds: ['kit-2d6-mod'],
  },
  {
    id: 'quick-roll/d10-pool',
    label: 'Pool de d10',
    description: 'Pool de d10 avec seuil de succès.',
    kitId: 'kit-narrative-no-initiative',
    definitionIds: ['kit-d10-pool-successes'],
  },
  {
    id: 'quick-roll/cosmere-rpg',
    label: 'Dé d’intrigue du Cosmere RPG',
    description: 'Ajoute uniquement le dé d’intrigue au profil Rapide / lent.',
    kitId: 'kit-cosmere-label-order',
    definitionIds: ['kit-cosmere-plot'],
    initiativeProfileIds: ['initiative/cosmere-fast-slow'],
  },
]);

const catalogPresetIds = new Set(rulePresetCatalog.map((preset) => preset.catalogId));

function initiativeProfile(profile) {
  const presetId = String(profile.rulePresetId || '').trim();
  return Object.freeze({
    ...profile,
    rulePresetId: presetId && catalogPresetIds.has(presetId) ? presetId : '',
    legacyRulePresetIds: Object.freeze([...(profile.legacyRulePresetIds || [])]),
  });
}

export const initiativeProfileCatalog = Object.freeze([
  initiativeProfile({
    id: 'initiative/generic-classic',
    label: 'Initiative classique',
    description: 'Un score par participant, trié du plus élevé au plus faible.',
    supportLevel: initiativeSupportLevels.HOME,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/classique',
  }),
  initiativeProfile({
    id: 'initiative/generic-flexible',
    label: 'Initiative souple sans initiative',
    description: 'Aucun score : la table choisit qui agit selon la fiction.',
    supportLevel: initiativeSupportLevels.HOME,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/initiative-souple-sans-initiative',
  }),
  initiativeProfile({
    id: 'initiative/d20-classic',
    label: 'Initiative classique',
    description: 'd20 + modificateur, ordre décroissant et départage des égalités.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/d20-tactique-dd-pathfinder',
    examples: 'D&D, Pathfinder, Héros & Dragons',
    legacyRulePresetIds: ['systemes/d20-boss-mythique'],
  }),
  initiativeProfile({
    id: 'initiative/d20-popcorn',
    label: 'Initiative souple / popcorn',
    description: 'Le participant actif désigne le prochain à agir.',
    supportLevel: initiativeSupportLevels.COMMON_VARIANT,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/initiative-souple-ordonnee',
  }),
  initiativeProfile({
    id: 'initiative/d20-cinematic',
    label: 'Initiative par camp ou ordre cinématique',
    description: 'Un ordre commun par camp, ou déterminé par la logique de la scène.',
    supportLevel: initiativeSupportLevels.COMMON_VARIANT,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/initiative-souple-sans-initiative',
  }),
  initiativeProfile({
    id: 'initiative/cosmere-fast-slow',
    label: 'Rapide / lent à chaque round',
    description: 'Chaque participant choisit une action rapide ou lente à chaque round.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/cosmere-rpg',
    examples: 'Cosmere RPG',
  }),
  initiativeProfile({
    id: 'initiative/shadowrun-1-3-decrement',
    label: 'Score décroissant par décrément de 10',
    description: 'Plusieurs passes : le score baisse de 10 après chaque action.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/phases-par-initiative',
  }),
  initiativeProfile({
    id: 'initiative/shadowrun-4-phases',
    label: 'Score d’initiative et passes cochées',
    description: 'Un score initial et des passes successives suivies par cases.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/phases-cochees',
  }),
  initiativeProfile({
    id: 'initiative/shadowrun-5-decrement',
    label: 'Passes par décrément de 10',
    description: 'Pool de d6 à seuil pour l’initiative, puis décrément de 10 par passe.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/shadowrun-5',
  }),
  initiativeProfile({
    id: 'initiative/shadowrun-6-classic',
    label: 'Initiative classique',
    description: 'Un score d’initiative unique, joué dans l’ordre décroissant.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/classique',
  }),
  initiativeProfile({
    id: 'initiative/shadowrun-anarchy-flexible',
    label: 'Mode souple / narratif',
    description: 'Ordre libre piloté par la narration, sans score obligatoire.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/narratif-sans-initiative-pbta-vtm',
  }),
  initiativeProfile({
    id: 'initiative/savage-cards',
    label: 'Initiative par cartes à chaque round',
    description: 'Une carte par participant, redistribuée au début de chaque round.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/savage-worlds',
  }),
  initiativeProfile({
    id: 'initiative/savage-group-cards',
    label: 'Carte par groupe',
    description: 'Une seule carte d’initiative partagée par groupe de participants.',
    supportLevel: initiativeSupportLevels.COMMON_VARIANT,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/savage-worlds',
  }),
  initiativeProfile({
    id: 'initiative/coc-dex',
    label: 'DEX descendante',
    description: 'Ordre fixe du score de DEX le plus élevé au plus faible.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/appel-de-cthulhu-7e',
  }),
  initiativeProfile({
    id: 'initiative/coc-narrative',
    label: 'Mode narratif',
    description: 'Ordre libre déterminé par la fiction et les circonstances.',
    supportLevel: initiativeSupportLevels.COMMON_VARIANT,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/narratif-sans-initiative-pbta-vtm',
  }),
  initiativeProfile({
    id: 'initiative/pbta-spotlight',
    label: 'Spotlight souple',
    description: 'Pas de tour chiffré : le spotlight passe selon la conversation.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/narratif-sans-initiative-pbta-vtm',
  }),
  initiativeProfile({
    id: 'initiative/vampire-v5-narrative',
    label: 'Conflit narratif / souple',
    description: 'Résolution par catégories d’action et priorité narrative.',
    supportLevel: initiativeSupportLevels.COMMON_VARIANT,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'systemes/narratif-sans-initiative-pbta-vtm',
  }),
  initiativeProfile({
    id: 'initiative/vampire-classic-tactical',
    label: 'Initiative tactique',
    description: 'Score d’initiative individuel et ordre décroissant.',
    supportLevel: initiativeSupportLevels.OFFICIAL,
    status: initiativeProfileStatuses.AVAILABLE,
    rulePresetId: 'generiques/classique',
  }),
]);

export const systemProfileCatalog = Object.freeze([
  {
    id: 'system/generic',
    name: 'Système générique / Maison',
    description: 'Initiative classique ou souple, avec d20, d100, dés polyédriques, pools de dés ou cartes.',
    family: 'generic',
    editions: [],
    initiativeProfileIds: ['initiative/generic-classic', 'initiative/generic-flexible', 'initiative/savage-cards', 'initiative/savage-group-cards'],
    examples: 'Jeux maison, Savage Worlds, systèmes classiques',
    randomQuickRollProfileIds: ['quick-roll/d20-simple', 'quick-roll/d20-core', 'quick-roll/d100-percentile', 'quick-roll/d6-pool', 'quick-roll/pbta-2d6', 'quick-roll/d10-pool', 'quick-roll/savage-worlds'],
  },
  {
    id: 'system/dnd-pathfinder',
    name: 'Systèmes d20 classiques',
    description: 'Initiative au d20, ordre décroissant, variantes par camp et avantage / désavantage.',
    family: 'd20',
    editions: [],
    initiativeProfileIds: ['initiative/d20-classic', 'initiative/d20-popcorn', 'initiative/d20-cinematic', 'initiative/cosmere-fast-slow'],
    examples: 'D&D, Pathfinder, Héros & Dragons, Cosmere RPG',
    randomQuickRollProfileIds: ['quick-roll/d20-simple', 'quick-roll/d20-core', 'quick-roll/cosmere-rpg'],
  },
  {
    id: 'system/shadowrun',
    name: 'Shadowrun',
    description: 'Pool de d6 à seuil, score d’initiative et passes multiples ou ordre narratif selon l’édition.',
    family: 'shadowrun',
    examples: 'Shadowrun 1e à 6e, Shadowrun Anarchy',
    editions: [
      { id: 'sr-1-3', label: 'Shadowrun 1e / 2e / 3e', initiativeProfileIds: ['initiative/shadowrun-1-3-decrement'] },
      { id: 'sr-4-20a', label: 'Shadowrun 4e / 20A', initiativeProfileIds: ['initiative/shadowrun-4-phases'] },
      { id: 'sr-5', label: 'Shadowrun 5e', initiativeProfileIds: ['initiative/shadowrun-5-decrement'] },
      { id: 'sr-6', label: 'Shadowrun 6e', initiativeProfileIds: ['initiative/shadowrun-6-classic'] },
      { id: 'sr-anarchy', label: 'Shadowrun Anarchy / narratif', initiativeProfileIds: ['initiative/shadowrun-anarchy-flexible'] },
    ],
    initiativeProfileIds: [],
    randomQuickRollProfileIds: ['quick-roll/d6-pool'],
  },
  {
    id: 'system/call-of-cthulhu',
    name: 'Appel de Cthulhu',
    description: 'Jets percentile sous compétence et initiative par DEX descendante ou ordre narratif.',
    family: 'd100',
    examples: 'L’Appel de Cthulhu, Basic Roleplaying',
    editions: [{ id: 'coc-7e', label: '7e', initiativeProfileIds: ['initiative/coc-dex', 'initiative/coc-narrative'] }],
    initiativeProfileIds: [],
    randomQuickRollProfileIds: ['quick-roll/d100-percentile'],
  },
  {
    id: 'system/pbta',
    name: 'PbtA',
    description: 'Jets 2d6 + modificateur, sans initiative chiffrée, avec spotlight souple.',
    family: 'pbta',
    examples: 'Apocalypse World, Dungeon World, Monster of the Week',
    editions: [],
    initiativeProfileIds: ['initiative/pbta-spotlight'],
    randomQuickRollProfileIds: ['quick-roll/pbta-2d6'],
  },
  {
    id: 'system/vampire',
    name: 'Vampire',
    description: 'Pools de d10 à seuil, conflit narratif ou initiative tactique selon l’édition.',
    family: 'world-of-darkness',
    examples: 'Vampire V5, Vampire V20, Monde des Ténèbres',
    editions: [
      { id: 'v5', label: 'Vampire V5', initiativeProfileIds: ['initiative/vampire-v5-narrative'] },
      { id: 'classic-v20', label: 'Vampire classique / V20', initiativeProfileIds: ['initiative/vampire-classic-tactical'] },
    ],
    initiativeProfileIds: [],
    randomQuickRollProfileIds: ['quick-roll/d10-pool'],
  },
]);

export const defaultProfileHierarchy = createProfileHierarchy({ systems: systemProfileCatalog, initiatives: initiativeProfileCatalog, quickRolls: quickRollProfileCatalog });

export function effectiveProfileCatalogs() {
  return compileProfileHierarchy(loadProfileHierarchy(defaultProfileHierarchy), { systems: systemProfileCatalog, initiatives: initiativeProfileCatalog, quickRolls: quickRollProfileCatalog });
}

export function effectiveSystemProfileCatalog() {
  return effectiveProfileCatalogs().systems;
}

export function initiativeProfileById(profileId) {
  return effectiveProfileCatalogs().initiatives.find((profile) => profile.id === profileId) || null;
}

export function systemProfileById(profileId) {
  return effectiveSystemProfileCatalog().find((profile) => profile.id === profileId) || null;
}

export function quickRollProfileById(profileId) {
  return effectiveProfileCatalogs().quickRolls.find((profile) => profile.id === profileId) || null;
}

export function quickRollProfilesForSystem(systemProfileId, initiativeProfileId = '') {
  const system = systemProfileById(systemProfileId);
  if (!system) return [];
  return (system.randomQuickRollProfileIds || []).map(quickRollProfileById).filter((profile) => profile && (!profile.initiativeProfileIds?.length || profile.initiativeProfileIds.includes(initiativeProfileId)));
}

export function onboardingSupportSummary({ initiativeProfileId = '', randomQuickRollProfileIds = [] } = {}) {
  const initiativeProfile = initiativeProfileById(initiativeProfileId);
  const quickRollProfiles = [...new Set(randomQuickRollProfileIds)]
    .map(quickRollProfileById)
    .filter(Boolean);
  return {
    ready: [
      initiativeProfile ? `Ordre des tours : ${initiativeProfile.label}.` : 'Tu garderas un ordre de jeu libre.',
      ...quickRollProfiles.map((profile) => `Jet prêt à lancer : ${profile.label}.`),
    ],
    atHand: ['Participants, rôles tactiques, états et compteurs resteront sous les yeux de la table.'],
    yourCall: ['Tu gardes la main sur les effets, les dégâts, les circonstances et les décisions de la table.'],
  };
}

export function initiativeProfilesForSystem(systemProfileId, editionId = '') {
  const system = systemProfileById(systemProfileId);
  if (!system) return [];
  const edition = system.editions.find((item) => item.id === editionId);
  const profileIds = edition?.initiativeProfileIds || system.initiativeProfileIds;
  return profileIds.map(initiativeProfileById).filter(Boolean);
}
