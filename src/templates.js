import { TEMPLATE_STORAGE_KEY } from './constants.js';
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

  const categories = Array.isArray(value?.categories) && value.categories.length ? value.categories : defaultTemplateCategories;
  const templates = Array.isArray(value?.templates) ? value.templates.filter((template) => template?.participant?.name) : defaultTemplates;

  return {
    version: 1,
    categories: Array.from(new Set([...categories, ...defaultTemplates.map((template) => template.category)])),
    templates,
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
