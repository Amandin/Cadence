import { TEMPLATE_STORAGE_KEY } from './constants.js';
import { clone, uid } from './logic.js';

export const templateCategories = ['PJ', 'PNJ', 'Créature', 'Horloge', 'Autre'];

function safeTemplates(value) {
  return Array.isArray(value) ? value.filter((template) => template?.participant?.name) : [];
}

export function loadTemplates() {
  try {
    return safeTemplates(JSON.parse(localStorage.getItem(TEMPLATE_STORAGE_KEY)));
  } catch (error) {
    console.warn('Impossible de charger les templates Cadence.', error);
    return [];
  }
}

export function saveTemplates(templates) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(safeTemplates(templates)));
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

export function makeTemplateFromParticipant(participant, category = 'PNJ') {
  return {
    id: uid('tpl'),
    name: participant.name || 'Template sans nom',
    category,
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
