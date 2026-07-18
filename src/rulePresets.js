import { normalizeCampaignRules } from './domain/campaignRules.js';

const presetModules = import.meta.glob('./presets/rules/**/*.cadence-rules', { eager: true, query: '?raw', import: 'default' });
export const rulePresetFamilies = {
  GENERIC: 'generic',
  SYSTEM: 'system',
  PERSONAL: 'personal',
};

function categoryFromPath(path) {
  const parts = path.replace('./presets/rules/', '').split('/');
  return parts.length > 1 ? parts.slice(0, -1).join(' / ') : 'General';
}

function idFromPath(path) {
  return path
    .replace('./presets/rules/', '')
    .replace(/\.cadence-rules$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '/');
}

function parseRulePresetModule(module, path) {
  if (typeof module !== 'string') return module || {};
  try {
    return JSON.parse(module);
  } catch (error) {
    console.warn(`Preset de regles illisible : ${path}`, error);
    return {};
  }
}

function familyFromSource(source = {}, path = '') {
  if (source.family === rulePresetFamilies.SYSTEM) return rulePresetFamilies.SYSTEM;
  if (source.family === rulePresetFamilies.PERSONAL) return rulePresetFamilies.PERSONAL;
  if (path.includes('/systemes/') || path.includes('/systems/')) return rulePresetFamilies.SYSTEM;
  return rulePresetFamilies.GENERIC;
}

function systemFromSource(source = {}, family = rulePresetFamilies.GENERIC) {
  if (family !== rulePresetFamilies.SYSTEM) return '';
  return String(source.system || source.game || source.category || '').trim();
}

function profileSelectionFromSource(source = {}) {
  const randomQuickRollProfileIds = Array.isArray(source.randomQuickRollProfileIds)
    ? [...new Set(source.randomQuickRollProfileIds.map((profileId) => String(profileId || '').trim()).filter(Boolean))]
    : [];
  return {
    systemProfileId: String(source.systemProfileId || '').trim(),
    editionId: String(source.editionId || '').trim(),
    initiativeProfileId: String(source.initiativeProfileId || '').trim(),
    randomQuickRollProfileIds,
  };
}

function sortPresets(left, right) {
  const familyOrder = {
    [rulePresetFamilies.GENERIC]: 0,
    [rulePresetFamilies.SYSTEM]: 1,
    [rulePresetFamilies.PERSONAL]: 2,
  };
  const familyDelta = (familyOrder[left.family] ?? 99) - (familyOrder[right.family] ?? 99);
  if (familyDelta !== 0) return familyDelta;
  const groupLeft = (left.system || left.category || '').toLocaleLowerCase();
  const groupRight = (right.system || right.category || '').toLocaleLowerCase();
  if (groupLeft !== groupRight) return groupLeft.localeCompare(groupRight);
  return left.name.localeCompare(right.name);
}

export function sameCampaignRules(left, right) {
  return JSON.stringify(normalizeCampaignRules(left || {})) === JSON.stringify(normalizeCampaignRules(right || {}));
}

export function normalizeRulePreset(source = {}, path = '') {
  const id = String(source.id || idFromPath(path) || 'rule-preset').trim();
  const name = String(source.name || source.label || id).trim();
  const category = String(source.category || categoryFromPath(path)).trim();
  const family = familyFromSource(source, path);
  const system = systemFromSource(source, family);
  return {
    id: `catalog:${id}`,
    catalogId: id,
    name,
    category,
    family,
    system,
    description: String(source.description || '').trim(),
    path,
    readOnly: true,
    source: 'catalog',
    rules: normalizeCampaignRules(source.rules || source),
  };
}

export const rulePresetCatalog = Object.entries(presetModules)
  .map(([path, module]) => normalizeRulePreset(parseRulePresetModule(module, path), path))
  .sort(sortPresets);

export function normalizeRulePresetSnapshot(source = {}, activeRules = null) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null;
  const rules = normalizeCampaignRules(source.rules || activeRules || {});
  const snapshot = {
    presetId: String(source.presetId || source.id || '').trim() || '',
    catalogId: String(source.catalogId || '').trim(),
    name: String(source.name || 'Règles personnalisées').trim() || 'Règles personnalisées',
    category: String(source.category || '').trim(),
    family: familyFromSource(source),
    system: String(source.system || '').trim(),
    description: String(source.description || '').trim(),
    source: String(source.source || '').trim() || 'snapshot',
    readOnly: !!source.readOnly,
    rules,
    ...profileSelectionFromSource(source),
    modified: activeRules == null ? !!source.modified : !sameCampaignRules(rules, activeRules),
  };
  return snapshot;
}

export function createRulePresetSnapshot(preset, activeRules = null, profileSelection = {}) {
  if (!preset) return null;
  return normalizeRulePresetSnapshot({
    presetId: preset.id || '',
    catalogId: preset.catalogId || '',
    name: preset.name,
    category: preset.category,
    family: preset.family,
    system: preset.system,
    description: preset.description,
    source: preset.source || 'catalog',
    readOnly: !!preset.readOnly,
    rules: preset.rules,
    modified: false,
    ...profileSelectionFromSource(profileSelection),
  }, activeRules ?? preset.rules);
}

export function syncRulePresetSnapshot(snapshot, activeRules) {
  if (!snapshot) return null;
  return {
    ...normalizeRulePresetSnapshot(snapshot, activeRules),
    modified: !sameCampaignRules(snapshot.rules || {}, activeRules || {}),
  };
}

export function mergeRulePresetCatalog(customPresets = []) {
  const custom = Array.isArray(customPresets)
    ? customPresets.map((preset) => ({
      ...preset,
      source: preset.source || 'local',
      family: rulePresetFamilies.PERSONAL,
      system: preset.system || '',
      readOnly: !!preset.readOnly,
    }))
    : [];
  return custom.sort(sortPresets);
}
