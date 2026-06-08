import { TEMPLATE_STORAGE_KEY } from './constants.js';
import { normalizeCampaignRules } from './domain/campaignRules.js';
import { normalizeGlobalTracker } from './domain/globalTracker.js';
import { clone, colors, newTracker, symbols, uid } from './logic.js';

export const defaultTemplateCategories = ['PJ', 'PNJ', 'Créature', 'Horloge', 'Autre'];
const TEMPLATE_STORE_VERSION = 3;

function pvTemplate(id, current, max = current) {
  const mid = Math.ceil(max / 2);
  const low = Math.ceil(max / 4);
  return {
    id,
    type: 'bar',
    name: 'PV',
    visible: true,
    current,
    initial: max,
    min: 0,
    max,
    step: Math.max(1, Math.ceil(max / 6)),
    direction: 'countdown',
    minAbsolute: true,
    maxAbsolute: false,
    thresholds: [
      { value: mid, label: 'blesse', color: 'amber', operator: 'lte' },
      { value: low, label: 'critique', color: 'red', operator: 'lte' },
      { value: 0, label: 'hors combat', color: 'red', operator: 'lte' },
    ],
  };
}

export const defaultTemplates = [
  {
    id: 'tpl-demo-eclaireur',
    name: 'Éclaireur prudent',
    category: 'PJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Éclaireur prudent',
      kind: 'PJ',
      symbol: '●',
      color: 'emerald',
      initiative: 12,
      departage: 2,
      description: 'Profil rapide et lisible pour tester un PJ mobile.',
      stats: ['Mobile', 'Observation'],
      statuses: [],
      trackers: [
        { id: 'tpl-eclaireur-pv', type: 'bar', name: 'PV', visible: true, current: 14, min: 0, max: 20, step: 5, minAbsolute: true, maxAbsolute: false },
        { id: 'tpl-eclaireur-focus', type: 'dots', name: 'Focus', visible: true, current: 2, max: 5 },
      ],
    },
  },
  {
    id: 'tpl-demo-garde',
    name: 'Garde nerveux',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Garde nerveux',
      kind: 'Opposant',
      symbol: '●',
      color: 'red',
      initiative: 8,
      departage: 1,
      description: 'Opposant simple, utile pour remplir vite une scène.',
      stats: ['Défense 1'],
      statuses: [],
      trackers: [
        { id: 'tpl-garde-pv', type: 'bar', name: 'PV', visible: true, current: 12, min: 0, max: 18, step: 3, minAbsolute: true, maxAbsolute: false },
      ],
    },
  },
  {
    id: 'tpl-demo-brute',
    name: 'Brute intimidante',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Brute intimidante',
      kind: 'Opposant',
      symbol: '●',
      color: 'orange',
      initiative: 6,
      departage: 3,
      description: 'Adversaire lent mais solide, volontairement très générique.',
      stats: ['Solide', 'Impressionnant'],
      statuses: [],
      trackers: [
        { id: 'tpl-brute-pv', type: 'bar', name: 'PV', visible: true, current: 28, min: 0, max: 35, step: 5, minAbsolute: true, maxAbsolute: false },
        { id: 'tpl-brute-rage', type: 'dots', name: 'Rage', visible: true, current: 1, max: 4 },
      ],
    },
  },
  {
    id: 'tpl-demo-allie',
    name: 'Allié fragile',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Allié fragile',
      kind: 'Allié',
      symbol: '●',
      color: 'pink',
      initiative: 7,
      departage: '',
      description: 'Allié à protéger ou à faire intervenir ponctuellement.',
      stats: ['Fragile'],
      statuses: [],
      trackers: [
        { id: 'tpl-allie-panique', type: 'dots', name: 'Panique', visible: true, current: 0, max: 4 },
      ],
    },
  },
  {
    id: 'tpl-demo-horloge',
    name: 'Danger imminent',
    category: 'Horloge',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Danger imminent',
      kind: 'Environnement',
      symbol: '●',
      color: 'amber',
      initiative: 0,
      departage: '',
      description: 'Horloge environnementale prête à rejoindre une scène.',
      stats: [],
      statuses: [],
      trackers: [
        { id: 'tpl-danger-clock', type: 'clock', name: 'Compte à rebours', visible: true, current: 0, max: 6, auto: true, frozen: false },
      ],
    },
  },
  {
    id: 'tpl-demo-meute',
    name: 'Petite créature vive',
    category: 'Créature',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Petite créature vive',
      kind: 'Opposant',
      symbol: '●',
      color: 'violet',
      initiative: 13,
      departage: 1,
      description: 'Créature rapide, légère, facile à multiplier.',
      stats: ['Rapide'],
      statuses: [],
      trackers: [
        { id: 'tpl-creature-pv', type: 'bar', name: 'PV', visible: true, current: 8, min: 0, max: 12, step: 2, minAbsolute: true, maxAbsolute: false },
      ],
    },
  },
];

const genericDefaultTemplates = [
  {
    id: 'tpl-generic-pj',
    name: 'PJ standard',
    category: 'PJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'PJ standard',
      kind: 'PJ',
      symbol: '●',
      color: 'emerald',
      initiative: 12,
      departage: '',
      description: '',
      stats: ['Défense 12', 'Perception 10'],
      statuses: [],
      trackers: [
        pvTemplate('tpl-pj-pv', 20),
        { id: 'tpl-pj-focus', type: 'points', name: 'Focus', visible: true, current: 2, initial: 2, min: 0, max: 5, step: 1, direction: 'progression', limitMode: 'clamp', thresholds: [{ value: 4, label: 'prêt', color: 'green', operator: 'gte' }] },
      ],
    },
  },
  {
    id: 'tpl-generic-pnj',
    name: 'PNJ armé',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'PNJ armé',
      kind: 'Opposant',
      symbol: '●',
      color: 'red',
      initiative: 10,
      departage: '',
      description: '',
      stats: ['Défense 11', 'Attaque +3'],
      statuses: [],
      trackers: [
        pvTemplate('tpl-pnj-pv', 16),
        { id: 'tpl-pnj-moral', type: 'points', name: 'Moral', visible: true, current: 3, initial: 3, min: 0, max: 5, step: 1, direction: 'countdown', limitMode: 'clamp', thresholds: [{ value: 1, label: 'fragile', color: 'amber', operator: 'lte' }] },
      ],
    },
  },
  {
    id: 'tpl-generic-elite',
    name: 'Adversaire robuste',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Adversaire robuste',
      kind: 'Opposant',
      symbol: '●',
      color: 'orange',
      initiative: 6,
      departage: '',
      description: '',
      stats: ['Armure', 'Impact'],
      statuses: [],
      trackers: [
        pvTemplate('tpl-elite-pv', 32),
        { id: 'tpl-elite-garde', type: 'points', name: 'Garde', visible: true, current: 2, initial: 2, min: 0, max: 4, step: 1, direction: 'countdown', limitMode: 'clamp' },
      ],
    },
  },
  {
    id: 'tpl-generic-allie',
    name: 'Allié utile',
    category: 'PNJ',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Allié utile',
      kind: 'Allié',
      symbol: '●',
      color: 'blue',
      initiative: 9,
      departage: '',
      description: '',
      stats: ['Soutien', 'Compétent'],
      statuses: [],
      trackers: [
        pvTemplate('tpl-allie-pv', 12),
        { id: 'tpl-allie-aide', type: 'points', name: 'Aide', visible: true, current: 1, initial: 1, min: 0, max: 3, step: 1, direction: 'progression', limitMode: 'clamp' },
      ],
    },
  },
  {
    id: 'tpl-generic-creature',
    name: 'Créature vive',
    category: 'Créature',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Créature vive',
      kind: 'Opposant',
      symbol: '●',
      color: 'violet',
      initiative: 14,
      departage: '',
      description: '',
      stats: ['Rapide', 'Instinct'],
      statuses: [],
      trackers: [
        pvTemplate('tpl-creature-pv', 14),
        { id: 'tpl-creature-instinct', type: 'points', name: 'Instinct', visible: true, current: 2, initial: 2, min: 0, max: 4, step: 1, direction: 'progression', limitMode: 'clamp' },
      ],
    },
  },
  {
    id: 'tpl-generic-clock',
    name: 'Danger simple',
    category: 'Horloge',
    createdAt: 'demo',
    participant: {
      id: 'template-participant',
      name: 'Danger simple',
      kind: 'Environnement',
      symbol: '●',
      color: 'amber',
      initiative: 0,
      departage: '',
      description: '',
      stats: ['Scène'],
      statuses: [],
      trackers: [
        { id: 'tpl-danger-clock', type: 'clock', name: 'Danger', visible: true, current: 0, initial: 0, min: 0, max: 6, step: 1, direction: 'progression', limitMode: 'manual', auto: true, frozen: false, currentThresholds: [{ value: 3, label: 'pression', color: 'amber', operator: 'gte' }, { value: 6, label: 'déclenche', color: 'red', operator: 'gte' }] },
      ],
    },
  },
];

export const defaultTrackerTemplates = [
  { id: 'tracker-template-pv', name: 'PV simple', createdAt: 'demo', tracker: { ...newTracker('bar'), id: 'template-tracker', name: 'PV' } },
  { id: 'tracker-template-horloge', name: 'Horloge 6 segments', createdAt: 'demo', tracker: { ...newTracker('clock'), id: 'template-tracker', name: 'Horloge', max: 6 } },
  { id: 'tracker-template-puces', name: 'Réserve à puces', createdAt: 'demo', tracker: { ...newTracker('points'), id: 'template-tracker', name: 'Réserve', max: 5 } },
  { id: 'tracker-template-puces-loop', name: 'Puces bouclantes', createdAt: 'demo', tracker: { ...newTracker('points'), id: 'template-tracker', name: 'Charges', max: 5, limitMode: 'loop', cycles: 0, cyclesInitial: 0, currentThresholds: [{ value: 5, label: 'plein', color: 'green', operator: 'gte' }], totalThresholds: [{ value: 1, label: 'cycle 1', color: 'blue', operator: 'gte' }] } },
  { id: 'tracker-template-cases', name: 'Cases structurées', createdAt: 'demo', tracker: { ...newTracker('boxes'), id: 'template-tracker', name: 'Blessures', fillLevels: 3, levelLabels: ['Léger', 'Sérieux', 'Critique'] } },
  { id: 'tracker-template-compteur', name: 'Compteur simple', createdAt: 'demo', tracker: { ...newTracker('number'), id: 'template-tracker', name: 'Ressources', current: 0, initial: 0, max: 9, thresholds: [{ value: 5, label: 'prêt', color: 'green', operator: 'gte' }] } },
];

export const defaultStatusTemplates = [
  { id: 'status-template-surpris', name: 'Surpris', createdAt: 'demo', status: { id: 'template-status', name: 'Surpris', duration: 1, remaining: 1, loop: false, inactive: false, limited: true, advanceOn: 'activation', expired: false } },
  { id: 'status-template-blesse', name: 'Blessé', createdAt: 'demo', status: { id: 'template-status', name: 'Blessé', duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'activation', expired: false } },
  { id: 'status-template-sonne', name: 'Sonné 1 activation', createdAt: 'demo', status: { id: 'template-status', name: 'Sonné', duration: 1, remaining: 1, loop: false, inactive: true, advanceOn: 'activation', expired: false } },
  { id: 'status-template-enflamme', name: 'Enflammé', createdAt: 'demo', status: { id: 'template-status', name: 'Enflammé', duration: 3, remaining: 3, loop: false, inactive: false, advanceOn: 'round', expired: false } },
];

export const defaultSceneStatusTemplates = [
  { id: 'scene-status-template-brouillard', name: 'Brouillard', createdAt: 'demo', status: { id: 'template-status', name: 'Brouillard', duration: 3, remaining: 3, loop: false, inactive: false, advanceOn: 'round', expired: false } },
  { id: 'scene-status-template-zone-dangereuse', name: 'Zone dangereuse', createdAt: 'demo', status: { id: 'template-status', name: 'Zone dangereuse', duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'round', expired: false } },
];

export const defaultSceneCounterTemplates = [
  { id: 'scene-counter-template-alerte', name: 'Alerte - compteur', createdAt: 'demo', counter: { enabled: true, name: 'Alerte', mode: 'counter', current: 0, max: 6, trigger: 'manual', limitMode: 'clamp', total: 0, loops: 0, thresholds: [{ value: 2, label: 'Méfiance', color: 'amber', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 4, label: 'Alarme', color: 'red', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 6, label: 'Renforts', color: 'violet', operator: 'gte', basis: 'fixed', scope: 'current' }] } },
  { id: 'scene-counter-template-rituel-loop', name: 'Rituel - horloge bouclante', createdAt: 'demo', counter: { enabled: true, name: 'Rituel', mode: 'clock', current: 0, max: 6, direction: 'progression', trigger: 'round', limitMode: 'loop', total: 0, loops: 0, auto: true, thresholds: [{ value: 6, label: 'Cycle complet', color: 'amber', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 2, label: 'Renforts', color: 'red', operator: 'gte', basis: 'fixed', scope: 'loops' }] } },
  { id: 'scene-counter-template-etapes', name: 'Piste d’étapes', createdAt: 'demo', counter: { enabled: true, name: 'Rituel', mode: 'clock', current: 0, max: 1, direction: 'progression', trigger: 'manual', limitMode: 'overflow', total: 0, loops: 0, thresholds: [{ value: 1, label: 'Invocation ouverte', color: 'blue', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 3, label: 'Verrouillage', color: 'red', operator: 'gte', basis: 'fixed', scope: 'current' }] } },
  { id: 'scene-counter-template-minuteur', name: 'Minuteur 3 min 05', createdAt: 'demo', counter: { enabled: true, name: 'Minuteur', mode: 'timer', current: 0, max: 185, direction: 'countdown', trigger: 'realtime', limitMode: 'overflow', total: 0, loops: 0, running: false, startedAt: null, elapsedMs: 0, soundOnComplete: true, completeSoundId: 'chime', completeSoundUrl: '', thresholds: [{ value: 60, label: 'Pression forte', color: 'amber', operator: 'lte', basis: 'fixed', scope: 'current', sound: true, soundId: 'beep' }, { value: 25, label: 'Urgence', color: 'red', operator: 'lte', basis: 'percent', scope: 'current', sound: true, soundId: 'alarm' }] } },
  { id: 'scene-counter-template-chrono', name: 'Chronomètre simple', createdAt: 'demo', counter: { enabled: true, name: 'Chrono', mode: 'stopwatch', current: 0, max: 600, direction: 'progression', trigger: 'realtime', limitMode: 'overflow', running: false, startedAt: null, elapsedMs: 0, thresholds: [{ value: 120, label: 'Deux minutes', color: 'blue', operator: 'gte', basis: 'fixed', scope: 'current', sound: true, soundId: 'chime' }, { value: 300, label: 'Long', color: 'violet', operator: 'gte', basis: 'fixed', scope: 'current', sound: true, soundId: 'alarm' }] } },
];

export const defaultRuleTemplates = [];

function ajouterTemplateSurprisSiAncien(statusTemplates, version) {
  if (Number(version || 0) >= TEMPLATE_STORE_VERSION) return statusTemplates;
  const contientSurpris = statusTemplates.some((template) => template.id === 'status-template-surpris' || template.status?.name?.toLocaleLowerCase() === 'surpris');
  const surpris = defaultStatusTemplates.find((template) => template.id === 'status-template-surpris');
  return contientSurpris || !surpris ? statusTemplates : [...statusTemplates, normalizeStatusTemplate(surpris)];
}

export function createBlankParticipant() {
  const symbol = symbols[Math.floor(Math.random() * symbols.length)] || '●';
  const color = colors[Math.floor(Math.random() * colors.length)] || 'red';
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Opposant',
    symbol,
    color,
    initiative: 1,
    actionSlots: [{ id: 'slot-1', initiative: 1, order: 0 }],
    description: '',
    stats: [],
    statuses: [],
    trackers: [],
  };
}

function normalizeCategoryName(value) {
  return value?.trim();
}

function normalizeTemplateName(value, fallback = 'Modèle sans nom') {
  return normalizeCategoryName(value) || fallback;
}

function normalizeTemplate(template) {
  if (!template?.participant?.name) return null;
  return {
    id: template.id || uid('tpl'),
    name: normalizeCategoryName(template.name) || template.participant.name,
    category: normalizeCategoryName(template.category) || 'PNJ',
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    participant: {
      ...clone(template.participant),
      id: 'template-participant',
    },
  };
}

function normalizeTrackerTemplate(template) {
  if (!template?.tracker?.type) return null;
  const tracker = clone(template.tracker);
  return {
    id: template.id || uid('ttpl'),
    name: normalizeTemplateName(template.name, tracker.name || 'Indicateur'),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    tracker: { ...tracker, id: 'template-tracker' },
  };
}

function normalizeStatusTemplate(template) {
  const source = template?.status || template;
  const name = normalizeTemplateName(template?.name || source?.name, '');
  if (!name) return null;
  const duration = source.duration == null ? null : Math.max(1, Number(source.duration) || 1);
  return {
    id: template.id || uid('stpl'),
    name,
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    status: {
      id: 'template-status',
      name: source.name || name,
      duration,
      remaining: duration,
      loop: duration !== null && !!source.loop,
      inactive: !!source.inactive,
      limited: !source.inactive && !!source.limited,
      advanceOn: source.advanceOn === 'round' ? 'round' : 'activation',
      expired: false,
    },
  };
}

function normalizeSceneStatusTemplate(template) {
  const normalized = normalizeStatusTemplate(template);
  if (!normalized) return null;
  return {
    ...normalized,
    id: template.id || uid('sstpl'),
    status: {
      ...normalized.status,
      inactive: false,
      limited: false,
      advanceOn: 'round',
    },
  };
}

function normalizeSceneCounterTemplate(template) {
  const source = template?.counter || template?.globalTracker || template;
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const counter = normalizeGlobalTracker(source);
  return {
    id: template.id || uid('sctpl'),
    name: normalizeTemplateName(template.name, counter.name || 'Indicateur de scène'),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    counter: { ...counter, running: false, startedAt: null, elapsedMs: 0 },
  };
}

function normalizeRuleTemplate(template) {
  if (!template || typeof template !== 'object' || Array.isArray(template)) return null;
  const rules = normalizeCampaignRules(template.rules || template);
  return {
    id: template.id || uid('rtpl'),
    name: normalizeTemplateName(template.name, 'Règles'),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    rules,
  };
}

export function normalizeTemplateStore(value) {
  if (Array.isArray(value)) {
    const templates = value.map(normalizeTemplate).filter(Boolean);
    return {
      version: TEMPLATE_STORE_VERSION,
      categories: defaultTemplateCategories,
      templates,
      trackerTemplates: defaultTrackerTemplates.map(normalizeTrackerTemplate).filter(Boolean),
      statusTemplates: defaultStatusTemplates.map(normalizeStatusTemplate).filter(Boolean),
      sceneStatusTemplates: defaultSceneStatusTemplates.map(normalizeSceneStatusTemplate).filter(Boolean),
      sceneCounterTemplates: defaultSceneCounterTemplates.map(normalizeSceneCounterTemplate).filter(Boolean),
      ruleTemplates: defaultRuleTemplates.map(normalizeRuleTemplate).filter(Boolean),
    };
  }

  const sourceTemplates = Array.isArray(value?.templates) ? value.templates : genericDefaultTemplates;
  const templates = sourceTemplates.map(normalizeTemplate).filter(Boolean);
  const categories = Array.isArray(value?.categories) && value.categories.length ? value.categories : defaultTemplateCategories;
  const sourceTrackerTemplates = Array.isArray(value?.trackerTemplates) ? value.trackerTemplates : defaultTrackerTemplates;
  const trackerTemplates = sourceTrackerTemplates.map(normalizeTrackerTemplate).filter(Boolean);
  const sourceStatusTemplates = Array.isArray(value?.statusTemplates) ? value.statusTemplates : defaultStatusTemplates;
  const statusTemplates = ajouterTemplateSurprisSiAncien(sourceStatusTemplates.map(normalizeStatusTemplate).filter(Boolean), value?.version);
  const sourceSceneStatusTemplates = Array.isArray(value?.sceneStatusTemplates) ? value.sceneStatusTemplates : defaultSceneStatusTemplates;
  const sceneStatusTemplates = sourceSceneStatusTemplates.map(normalizeSceneStatusTemplate).filter(Boolean);
  const sourceSceneCounterTemplates = Array.isArray(value?.sceneCounterTemplates) ? value.sceneCounterTemplates : defaultSceneCounterTemplates;
  const sceneCounterTemplates = sourceSceneCounterTemplates.map(normalizeSceneCounterTemplate).filter(Boolean);
  const sourceRuleTemplates = Array.isArray(value?.ruleTemplates) ? value.ruleTemplates : defaultRuleTemplates;
  const ruleTemplates = sourceRuleTemplates.map(normalizeRuleTemplate).filter(Boolean);

  return {
    version: TEMPLATE_STORE_VERSION,
    categories: Array.from(new Set([...categories.map(normalizeCategoryName).filter(Boolean), ...templates.map((template) => template.category)])),
    templates,
    trackerTemplates,
    statusTemplates,
    sceneStatusTemplates,
    sceneCounterTemplates,
    ruleTemplates,
  };
}

export function loadTemplateStore() {
  try {
    return normalizeTemplateStore(JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY)));
  } catch (error) {
    console.warn('Impossible de charger les modèles Cadence.', error);
    return normalizeTemplateStore(null);
  }
}

export function saveTemplateStore(store) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(normalizeTemplateStore(store)));
}

export function isTemplateStoreLike(value) {
  return value == null || Array.isArray(value) || (typeof value === 'object' && !Array.isArray(value));
}

export function mergeTemplateStores(currentStore, incomingStore) {
  const current = normalizeTemplateStore(currentStore);
  const incoming = normalizeTemplateStore(incomingStore);
  const existingKeys = new Set(current.templates.map((template) => `${template.category.toLocaleLowerCase()}::${template.name.toLocaleLowerCase()}`));
  const added = [];
  const addedParticipants = [];
  const skipped = [];

  for (const template of incoming.templates) {
    const key = `${template.category.toLocaleLowerCase()}::${template.name.toLocaleLowerCase()}`;
    if (existingKeys.has(key)) {
      skipped.push(template);
      continue;
    }
    existingKeys.add(key);
    const imported = { ...clone(template), id: uid('tpl'), importedAt: new Date().toISOString() };
    added.push({ ...imported, type: 'participant' });
    addedParticipants.push(imported);
  }

  const mergeSimple = (currentItems, incomingItems, prefix, type) => {
    const keys = new Set(currentItems.map((template) => template.name.toLocaleLowerCase()));
    const next = [];
    for (const template of incomingItems) {
      const key = template.name.toLocaleLowerCase();
      if (keys.has(key)) {
        skipped.push({ ...template, type });
        continue;
      }
      keys.add(key);
      const imported = { ...clone(template), id: uid(prefix), importedAt: new Date().toISOString() };
      added.push({ ...imported, type });
      next.push(imported);
    }
    return [...currentItems, ...next];
  };

  return {
    store: normalizeTemplateStore({
      version: TEMPLATE_STORE_VERSION,
      categories: [...current.categories, ...incoming.categories],
      templates: [...current.templates, ...addedParticipants],
      trackerTemplates: mergeSimple(current.trackerTemplates, incoming.trackerTemplates, 'ttpl', 'tracker'),
      statusTemplates: mergeSimple(current.statusTemplates, incoming.statusTemplates, 'stpl', 'status'),
      sceneStatusTemplates: mergeSimple(current.sceneStatusTemplates, incoming.sceneStatusTemplates, 'sstpl', 'scene-status'),
      sceneCounterTemplates: mergeSimple(current.sceneCounterTemplates, incoming.sceneCounterTemplates, 'sctpl', 'scene-counter'),
      ruleTemplates: mergeSimple(current.ruleTemplates, incoming.ruleTemplates, 'rtpl', 'rules'),
    }),
    added,
    skipped,
  };
}

function resetTrackerIds(trackers = []) {
  return trackers.map((tracker) => {
    if (tracker.type === 'boxes') {
      return {
        ...clone(tracker),
        id: uid('t'),
        blocks: (tracker.blocks || []).map((block) => ({
          ...clone(block),
          id: uid('block'),
          lines: (block.lines || []).map((line) => ({
            ...clone(line),
            id: uid('line'),
            boxes: (line.boxes || []).map((box) => ({ ...clone(box), id: uid('box') })),
          })),
        })),
      };
    }
    return { ...clone(tracker), id: uid('t') };
  });
}

export function instantiateTrackerTemplate(template) {
  if (!template?.tracker) return null;
  return resetTrackerIds([template.tracker])[0] || null;
}

export function instantiateStatusTemplate(template) {
  const source = template?.status;
  if (!source?.name) return null;
  const duration = source.duration == null ? null : Math.max(1, Number(source.duration) || 1);
  return {
    ...clone(source),
    id: uid('s'),
    duration,
    remaining: duration,
    expired: false,
  };
}

export function instantiateSceneStatusTemplate(template) {
  const status = instantiateStatusTemplate(template);
  return status ? { ...status, inactive: false, limited: false, advanceOn: 'round' } : null;
}

export function instantiateSceneCounterTemplate(template) {
  if (!template?.counter) return null;
  return normalizeGlobalTracker({ ...clone(template.counter), running: false, startedAt: null, elapsedMs: 0 });
}

export function categoryExists(categories, category) {
  const name = normalizeCategoryName(category);
  return !!name && categories.some((item) => item.toLocaleLowerCase() === name.toLocaleLowerCase());
}

export function templateNameExists(templates, category, name) {
  const cleanName = normalizeCategoryName(name);
  const cleanCategory = normalizeCategoryName(category);
  return !!cleanName && !!cleanCategory && templates.some((template) => template.category === cleanCategory && template.name.toLocaleLowerCase() === cleanName.toLocaleLowerCase());
}

export function makeTemplateFromParticipant(participant, { name, category }) {
  const cleanName = normalizeCategoryName(name) || participant.name || 'Modèle sans nom';
  const cleanCategory = normalizeCategoryName(category) || 'PNJ';

  return {
    id: uid('tpl'),
    name: cleanName,
    category: cleanCategory,
    createdAt: new Date().toISOString(),
    participant: {
      ...clone(participant),
      id: 'template-participant',
    },
  };
}

export function makeTrackerTemplateFromTracker(tracker, { name }) {
  return normalizeTrackerTemplate({
    id: uid('ttpl'),
    name: normalizeTemplateName(name, tracker?.name || 'Indicateur'),
    createdAt: new Date().toISOString(),
    tracker: { ...clone(tracker), id: 'template-tracker' },
  });
}

export function makeStatusTemplateFromStatus(status, { name }) {
  return normalizeStatusTemplate({
    id: uid('stpl'),
    name: normalizeTemplateName(name, status?.name || 'État'),
    createdAt: new Date().toISOString(),
    status: { ...clone(status), id: 'template-status' },
  });
}

export function makeSceneStatusTemplateFromStatus(status, { name }) {
  return normalizeSceneStatusTemplate({
    id: uid('sstpl'),
    name: normalizeTemplateName(name, status?.name || 'État de scène'),
    createdAt: new Date().toISOString(),
    status: { ...clone(status), id: 'template-status', inactive: false, advanceOn: 'round' },
  });
}

export function makeSceneCounterTemplateFromCounter(counter, { name }) {
  return normalizeSceneCounterTemplate({
    id: uid('sctpl'),
    name: normalizeTemplateName(name, counter?.name || 'Indicateur de scène'),
    createdAt: new Date().toISOString(),
    counter,
  });
}

export function makeRuleTemplateFromRules(rules, { name }) {
  return normalizeRuleTemplate({
    id: uid('rtpl'),
    name: normalizeTemplateName(name, 'Règles'),
    createdAt: new Date().toISOString(),
    rules,
  });
}

/**
 * Creates a fresh scene participant from a saved template.
 * Statuses are intentionally removed: templates describe the base sheet, not transient conditions.
 */
export function instantiateTemplate(template) {
  const source = template?.participant;
  if (!source) return null;

  return {
    ...clone(source),
    id: uid('p'),
    name: source.name || template.name || 'Nouveau personnage',
    statuses: [],
    trackers: resetTrackerIds(source.trackers || []),
  };
}
