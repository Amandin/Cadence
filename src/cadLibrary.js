import { APP_VERSION } from './constants.js';
import { clone } from './logic.js';
import { saveRandomKitToState, normalizeRandomKits } from './random-system/rulePresetKits.js';
import { mergeTemplateStores, normalizeTemplateStore } from './templates.js';

export const CADENCE_LIBRARY_FORMAT = 'cadence-library';
export const CADENCE_LIBRARY_SCHEMA_VERSION = 1;

function cleanName(value) {
  return String(value || '').trim() || 'Bibliotheque Cadence';
}

function nowIso() {
  return new Date().toISOString();
}

function arrayOf(value) {
  return Array.isArray(value) ? value : [];
}

function uniqueByIdOrName(items = []) {
  const keys = new Set();
  const next = [];
  items.forEach((item) => {
    const key = String(item?.id || item?.name || JSON.stringify(item)).toLocaleLowerCase();
    if (keys.has(key)) return;
    keys.add(key);
    next.push(item);
  });
  return next;
}

function libraryId(name) {
  const slug = cleanName(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `cadlib-${slug || 'bibliotheque'}`;
}

function templateInputFromPayload(data = {}) {
  const templates = data.templates && typeof data.templates === 'object' && !Array.isArray(data.templates)
    ? data.templates
    : {};
  return {
    ...templates,
    ruleTemplates: uniqueByIdOrName([
      ...arrayOf(templates.ruleTemplates),
      ...arrayOf(data.ruleTemplates),
      ...arrayOf(data.rulePresets),
    ]),
    initiativeTextPresets: uniqueByIdOrName([
      ...arrayOf(templates.initiativeTextPresets),
      ...arrayOf(data.initiativeTextPresets),
    ]),
  };
}

export function normalizeCadenceLibraryPayload(data = {}) {
  const source = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  const name = cleanName(source.library?.name || source.name);
  const templates = normalizeTemplateStore(templateInputFromPayload(source));
  const randomKits = normalizeRandomKits(source.randomKits || source.kits || source.random?.kits || []);
  return {
    format: CADENCE_LIBRARY_FORMAT,
    schemaVersion: CADENCE_LIBRARY_SCHEMA_VERSION,
    appVersion: String(source.appVersion || source.version || APP_VERSION),
    savedAt: source.savedAt || nowIso(),
    library: {
      id: String(source.library?.id || source.id || libraryId(name)).trim() || libraryId(name),
      name,
      description: String(source.library?.description || source.description || '').trim(),
    },
    randomKits,
    templates,
    rulePresets: templates.ruleTemplates,
    initiativeTextPresets: templates.initiativeTextPresets,
  };
}

function hasTemplateContent(templates) {
  return Boolean(
    templates.templates.length
    || templates.trackerTemplates.length
    || templates.statusTemplates.length
    || templates.sceneStatusTemplates.length
    || templates.sceneCounterTemplates.length
    || templates.ruleTemplates.length
    || templates.initiativeTextPresets.length,
  );
}

export function isValidCadenceLibrary(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.format !== CADENCE_LIBRARY_FORMAT) return false;
  if (Number(data.schemaVersion) !== CADENCE_LIBRARY_SCHEMA_VERSION) return false;
  const normalized = normalizeCadenceLibraryPayload(data);
  return normalized.randomKits.length > 0 || hasTemplateContent(normalized.templates);
}

export function createCadenceLibraryPayload({
  name,
  description = '',
  randomKits = [],
  templates = {},
  rulePresets = [],
  initiativeTextPresets = [],
} = {}) {
  return normalizeCadenceLibraryPayload({
    format: CADENCE_LIBRARY_FORMAT,
    schemaVersion: CADENCE_LIBRARY_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    savedAt: nowIso(),
    library: { id: libraryId(name), name: cleanName(name), description },
    randomKits,
    templates,
    rulePresets,
    initiativeTextPresets,
  });
}

export function serializeCadenceLibrary(options = {}) {
  return JSON.stringify(createCadenceLibraryPayload(options), null, 2);
}

export function mergeCadenceLibraryTemplates(currentStore, libraryPayload) {
  const library = normalizeCadenceLibraryPayload(libraryPayload);
  return mergeTemplateStores(currentStore, library.templates);
}

export function importCadenceLibraryRandomKits(state, libraryPayload) {
  const library = normalizeCadenceLibraryPayload(libraryPayload);
  const existingIds = new Set(arrayOf(state?.randomKits).map((kit) => kit.id));
  let nextState = state;
  let added = 0;
  let updated = 0;

  library.randomKits.forEach((kit) => {
    nextState = saveRandomKitToState(nextState, clone(kit));
    if (existingIds.has(kit.id)) updated += 1;
    else {
      existingIds.add(kit.id);
      added += 1;
    }
  });

  return { state: nextState, added, updated, skipped: 0 };
}
