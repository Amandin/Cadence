import { TEMPLATE_STORAGE_KEY } from './constants.js';
import { normalizeCampaignRules } from './domain/campaignRules.js';
import { normalizeGlobalTracker } from './domain/globalTracker.js';
import { clone, colors, newTracker, symbols, uid } from './logic.js';

export const defaultTemplateCategories = ['PJ', 'PNJ', 'Créature', 'Horloge', 'Autre'];
const TEMPLATE_STORE_VERSION = 3;

const genericDefaultTemplates = [];

export const defaultTrackerTemplates = [];

export const defaultStatusTemplates = [];

export const defaultSceneStatusTemplates = [];

export const defaultSceneCounterTemplates = [];

const legacySurprisedStatusTemplate = {
  id: 'status-template-surpris',
  name: 'Surpris',
  createdAt: 'demo',
  status: {
    id: 'template-status',
    name: 'Surpris',
    duration: 1,
    remaining: 1,
    loop: false,
    inactive: false,
    limited: true,
    advanceOn: 'activation',
    expired: false,
  },
};

export const defaultRuleTemplates = [];

function ajouterTemplateSurprisSiAncien(statusTemplates, version) {
  if (version == null) return statusTemplates;
  if (Number(version || 0) >= TEMPLATE_STORE_VERSION) return statusTemplates;
  const contientSurpris = statusTemplates.some((template) => template.id === 'status-template-surpris' || template.status?.name?.toLocaleLowerCase() === 'surpris');
  const surpris = normalizeStatusTemplate(legacySurprisedStatusTemplate);
  return contientSurpris || !surpris ? statusTemplates : [...statusTemplates, surpris];
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
