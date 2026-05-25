import { phaseActionModes, TEMPLATE_STORAGE_KEY, temporalityModes } from './constants.js';
import { normalizeCampaignRules } from './domain/campaignRules.js';
import { normalizeGlobalTracker } from './domain/globalTracker.js';
import { clone, newTracker, uid } from './logic.js';

export const defaultTemplateCategories = ['PJ', 'PNJ', 'Créature', 'Horloge', 'Autre'];

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
      symbol: '🏹',
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
      symbol: '⚔',
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
      symbol: '🪓',
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
      symbol: '🕯',
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
      symbol: '⏳',
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
      symbol: '🐺',
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

export const defaultTrackerTemplates = [
  { id: 'tracker-template-pv', name: 'PV simple', createdAt: 'demo', tracker: { ...newTracker('bar'), id: 'template-tracker', name: 'PV' } },
  { id: 'tracker-template-horloge', name: 'Horloge 6 segments', createdAt: 'demo', tracker: { ...newTracker('clock'), id: 'template-tracker', name: 'Horloge', max: 6 } },
  { id: 'tracker-template-puces', name: 'Reserve a puces', createdAt: 'demo', tracker: { ...newTracker('points'), id: 'template-tracker', name: 'Reserve', max: 5 } },
  { id: 'tracker-template-puces-loop', name: 'Puces bouclantes', createdAt: 'demo', tracker: { ...newTracker('points'), id: 'template-tracker', name: 'Charges', max: 5, limitMode: 'loop', cycles: 0, cyclesInitial: 0, currentThresholds: [{ value: 5, label: 'plein', color: 'green', operator: 'gte' }], totalThresholds: [{ value: 1, label: 'cycle 1', color: 'blue', operator: 'gte' }] } },
  { id: 'tracker-template-cases', name: 'Cases structurees', createdAt: 'demo', tracker: { ...newTracker('boxes'), id: 'template-tracker', name: 'Blessures', fillLevels: 3, levelLabels: ['Leger', 'Serieux', 'Critique'] } },
  { id: 'tracker-template-compteur', name: 'Compteur simple', createdAt: 'demo', tracker: { ...newTracker('number'), id: 'template-tracker', name: 'Ressources', current: 0, initial: 0, max: 9, thresholds: [{ value: 5, label: 'pret', color: 'green', operator: 'gte' }] } },
];

export const defaultStatusTemplates = [
  { id: 'status-template-blesse', name: 'Blesse', createdAt: 'demo', status: { id: 'template-status', name: 'Blesse', duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'activation', expired: false } },
  { id: 'status-template-sonne', name: 'Sonne 1 tour', createdAt: 'demo', status: { id: 'template-status', name: 'Sonne', duration: 1, remaining: 1, loop: false, inactive: true, advanceOn: 'activation', expired: false } },
  { id: 'status-template-enflamme', name: 'Enflamme', createdAt: 'demo', status: { id: 'template-status', name: 'Enflamme', duration: 3, remaining: 3, loop: false, inactive: false, advanceOn: 'round', expired: false } },
];

export const defaultSceneStatusTemplates = [
  { id: 'scene-status-template-brouillard', name: 'Brouillard', createdAt: 'demo', status: { id: 'template-status', name: 'Brouillard', duration: 3, remaining: 3, loop: false, inactive: false, advanceOn: 'round', expired: false } },
  { id: 'scene-status-template-zone-dangereuse', name: 'Zone dangereuse', createdAt: 'demo', status: { id: 'template-status', name: 'Zone dangereuse', duration: null, remaining: null, loop: false, inactive: false, advanceOn: 'round', expired: false } },
];

export const defaultSceneCounterTemplates = [
  { id: 'scene-counter-template-alerte', name: 'Alerte - compteur', createdAt: 'demo', counter: { enabled: true, name: 'Alerte', mode: 'counter', current: 0, max: 6, trigger: 'manual', limitMode: 'clamp', total: 0, loops: 0, thresholds: [{ value: 2, label: 'Mefiance', color: 'amber', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 4, label: 'Alarme', color: 'red', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 6, label: 'Renforts', color: 'violet', operator: 'gte', basis: 'fixed', scope: 'current' }] } },
  { id: 'scene-counter-template-rituel-loop', name: 'Rituel - horloge bouclante', createdAt: 'demo', counter: { enabled: true, name: 'Rituel', mode: 'clock', current: 0, max: 6, direction: 'progression', trigger: 'round', limitMode: 'loop', total: 0, loops: 0, auto: true, thresholds: [{ value: 6, label: 'Cycle complet', color: 'amber', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 2, label: 'Renforts', color: 'red', operator: 'gte', basis: 'fixed', scope: 'loops' }] } },
  { id: 'scene-counter-template-etapes', name: 'Piste d etapes', createdAt: 'demo', counter: { enabled: true, name: 'Rituel', mode: 'clock', current: 0, max: 1, direction: 'progression', trigger: 'manual', limitMode: 'overflow', total: 0, loops: 0, thresholds: [{ value: 1, label: 'Invocation ouverte', color: 'blue', operator: 'gte', basis: 'fixed', scope: 'current' }, { value: 3, label: 'Verrouillage', color: 'red', operator: 'gte', basis: 'fixed', scope: 'current' }] } },
  { id: 'scene-counter-template-minuteur', name: 'Minuteur 3 min 05', createdAt: 'demo', counter: { enabled: true, name: 'Minuteur', mode: 'timer', current: 0, max: 185, direction: 'countdown', trigger: 'realtime', limitMode: 'overflow', total: 0, loops: 0, running: false, startedAt: null, elapsedMs: 0, soundOnComplete: true, completeSoundId: 'chime', completeSoundUrl: '', thresholds: [{ value: 60, label: 'Pression forte', color: 'amber', operator: 'lte', basis: 'fixed', scope: 'current', sound: true, soundId: 'beep' }, { value: 25, label: 'Urgence', color: 'red', operator: 'lte', basis: 'percent', scope: 'current', sound: true, soundId: 'alarm' }] } },
  { id: 'scene-counter-template-chrono', name: 'Chronometre simple', createdAt: 'demo', counter: { enabled: true, name: 'Chrono', mode: 'stopwatch', current: 0, max: 600, direction: 'progression', trigger: 'realtime', limitMode: 'overflow', running: false, startedAt: null, elapsedMs: 0, thresholds: [{ value: 120, label: 'Deux minutes', color: 'blue', operator: 'gte', basis: 'fixed', scope: 'current', sound: true, soundId: 'chime' }, { value: 300, label: 'Long', color: 'violet', operator: 'gte', basis: 'fixed', scope: 'current', sound: true, soundId: 'alarm' }] } },
];

export const defaultRuleTemplates = [
  { id: 'rules-template-classique', name: 'Classique numerique', createdAt: 'demo', rules: { temporalite: temporalityModes.CLASSIC, startRound: 1, declarationMode: false, multipleActionSlots: false, phaseActionMode: phaseActionModes.AUTOMATIC } },
  { id: 'rules-template-phases-auto', name: 'Phases automatiques', createdAt: 'demo', rules: { temporalite: temporalityModes.PHASES, phaseActionMode: phaseActionModes.AUTOMATIC, phaseDecrement: 10, declarationMode: false, multipleActionSlots: false } },
  { id: 'rules-template-phases-cochees', name: 'Phases cochees', createdAt: 'demo', rules: { temporalite: temporalityModes.PHASES, phaseActionMode: phaseActionModes.CHECKED, phaseCount: 3, declarationMode: false, multipleActionSlots: false } },
  { id: 'rules-template-cartes', name: 'Initiative par cartes', createdAt: 'demo', rules: { temporalite: temporalityModes.CLASSIC, declarationMode: false, multipleActionSlots: false, initiativeTextOrder: { enabled: true, separator: ' de ', parts: [{ label: 'Valeur', values: ['As', 'Roi', 'Dame', 'Valet', '10', '9'] }, { label: 'Couleur', values: ['Pique', 'Coeur', 'Carreau', 'Trefle'] }] } } },
  { id: 'rules-template-declaration', name: 'Declaration puis resolution', createdAt: 'demo', rules: { temporalite: temporalityModes.CLASSIC, declarationMode: true, multipleActionSlots: true, phaseActionMode: phaseActionModes.AUTOMATIC } },
  { id: 'rules-template-souple', name: 'Ordre souple', createdAt: 'demo', rules: { temporalite: temporalityModes.FLEXIBLE, declarationMode: false, multipleActionSlots: false, phaseActionMode: phaseActionModes.AUTOMATIC } },
];

export function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    actionSlots: [{ id: 'slot-1', initiative: 1, order: 0 }],
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

function normalizeCategoryName(value) {
  return value?.trim();
}

function normalizeTemplateName(value, fallback = 'Template sans nom') {
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
    name: normalizeTemplateName(template.name, tracker.name || 'Suivi'),
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
    name: normalizeTemplateName(template.name, counter.name || 'Suivi global'),
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
    name: normalizeTemplateName(template.name, 'Regles'),
    createdAt: template.createdAt || new Date().toISOString(),
    updatedAt: template.updatedAt,
    rules,
  };
}

export function normalizeTemplateStore(value) {
  if (Array.isArray(value)) {
    const templates = value.map(normalizeTemplate).filter(Boolean);
    return {
      version: 2,
      categories: defaultTemplateCategories,
      templates,
      trackerTemplates: defaultTrackerTemplates.map(normalizeTrackerTemplate).filter(Boolean),
      statusTemplates: defaultStatusTemplates.map(normalizeStatusTemplate).filter(Boolean),
      sceneStatusTemplates: defaultSceneStatusTemplates.map(normalizeSceneStatusTemplate).filter(Boolean),
      sceneCounterTemplates: defaultSceneCounterTemplates.map(normalizeSceneCounterTemplate).filter(Boolean),
      ruleTemplates: defaultRuleTemplates.map(normalizeRuleTemplate).filter(Boolean),
    };
  }

  const sourceTemplates = Array.isArray(value?.templates) ? value.templates : defaultTemplates;
  const templates = sourceTemplates.map(normalizeTemplate).filter(Boolean);
  const categories = Array.isArray(value?.categories) && value.categories.length ? value.categories : defaultTemplateCategories;
  const sourceTrackerTemplates = Array.isArray(value?.trackerTemplates) ? value.trackerTemplates : defaultTrackerTemplates;
  const trackerTemplates = sourceTrackerTemplates.map(normalizeTrackerTemplate).filter(Boolean);
  const sourceStatusTemplates = Array.isArray(value?.statusTemplates) ? value.statusTemplates : defaultStatusTemplates;
  const statusTemplates = sourceStatusTemplates.map(normalizeStatusTemplate).filter(Boolean);
  const sourceSceneStatusTemplates = Array.isArray(value?.sceneStatusTemplates) ? value.sceneStatusTemplates : defaultSceneStatusTemplates;
  const sceneStatusTemplates = sourceSceneStatusTemplates.map(normalizeSceneStatusTemplate).filter(Boolean);
  const sourceSceneCounterTemplates = Array.isArray(value?.sceneCounterTemplates) ? value.sceneCounterTemplates : defaultSceneCounterTemplates;
  const sceneCounterTemplates = sourceSceneCounterTemplates.map(normalizeSceneCounterTemplate).filter(Boolean);
  const sourceRuleTemplates = Array.isArray(value?.ruleTemplates) ? value.ruleTemplates : defaultRuleTemplates;
  const ruleTemplates = sourceRuleTemplates.map(normalizeRuleTemplate).filter(Boolean);

  return {
    version: 2,
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
    console.warn('Impossible de charger les templates Cadence.', error);
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
      version: 1,
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
  return status ? { ...status, inactive: false, advanceOn: 'round' } : null;
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
  const cleanName = normalizeCategoryName(name) || participant.name || 'Template sans nom';
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
    name: normalizeTemplateName(name, tracker?.name || 'Suivi'),
    createdAt: new Date().toISOString(),
    tracker: { ...clone(tracker), id: 'template-tracker' },
  });
}

export function makeStatusTemplateFromStatus(status, { name }) {
  return normalizeStatusTemplate({
    id: uid('stpl'),
    name: normalizeTemplateName(name, status?.name || 'Etat'),
    createdAt: new Date().toISOString(),
    status: { ...clone(status), id: 'template-status' },
  });
}

export function makeSceneStatusTemplateFromStatus(status, { name }) {
  return normalizeSceneStatusTemplate({
    id: uid('sstpl'),
    name: normalizeTemplateName(name, status?.name || 'Etat de scene'),
    createdAt: new Date().toISOString(),
    status: { ...clone(status), id: 'template-status', inactive: false, advanceOn: 'round' },
  });
}

export function makeSceneCounterTemplateFromCounter(counter, { name }) {
  return normalizeSceneCounterTemplate({
    id: uid('sctpl'),
    name: normalizeTemplateName(name, counter?.name || 'Suivi global'),
    createdAt: new Date().toISOString(),
    counter,
  });
}

export function makeRuleTemplateFromRules(rules, { name }) {
  return normalizeRuleTemplate({
    id: uid('rtpl'),
    name: normalizeTemplateName(name, 'Regles'),
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
