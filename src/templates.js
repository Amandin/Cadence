import { TEMPLATE_STORAGE_KEY } from './constants.js';
import { clone, newTracker, uid } from './logic.js';

export const defaultTemplateCategories = ['PJ', 'PNJ', 'Créature', 'Horloge', 'Autre'];

export function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

function normalizeCategoryName(value) {
  return value?.trim();
}

function normalizeStore(value) {
  if (Array.isArray(value)) {
    return {
      version: 1,
      categories: defaultTemplateCategories,
      templates: value.filter((template) => template?.participant?.name),
    };
  }

  return {
    version: 1,
    categories: Array.isArray(value?.categories) && value.categories.length ? value.categories : defaultTemplateCategories,
    templates: Array.isArray(value?.templates) ? value.templates.filter((template) => template?.participant?.name) : [],
  };
}

export function loadTemplateStore() {
  try {
    return normalizeStore(JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY)));
  } catch (error) {
    console.warn('Impossible de charger les templates Cadence.', error);
    return normalizeStore(null);
  }
}

export function saveTemplateStore(store) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(normalizeStore(store)));
}

function resetTrackerIds(trackers = []) {
  return trackers.map((tracker) => {
    if (tracker.type === 'boxes') {
      return {
        ...clone(tracker),
        id: uid('t'),
        rows: (tracker.rows || []).map((row) => ({ ...clone(row), id: uid('r') })),
      };
    }
    return { ...clone(tracker), id: uid('t') };
  });
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
