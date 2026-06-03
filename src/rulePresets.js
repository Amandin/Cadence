import { normalizeCampaignRules } from './domain/campaignRules.js';

const presetModules = import.meta.glob('./presets/rules/**/*.cadence-rules', { eager: true, query: '?raw', import: 'default' });

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

export function normalizeRulePreset(source = {}, path = '') {
  const id = String(source.id || idFromPath(path) || 'rule-preset').trim();
  const name = String(source.name || source.label || id).trim();
  const category = String(source.category || categoryFromPath(path)).trim();
  return {
    id: `catalog:${id}`,
    catalogId: id,
    name,
    category,
    description: String(source.description || '').trim(),
    path,
    readOnly: true,
    source: 'catalog',
    rules: normalizeCampaignRules(source.rules || source),
  };
}

export const rulePresetCatalog = Object.entries(presetModules)
  .map(([path, module]) => normalizeRulePreset(parseRulePresetModule(module, path), path))
  .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));

export function mergeRulePresetCatalog(customPresets = []) {
  const custom = Array.isArray(customPresets) ? customPresets.map((preset) => ({ ...preset, source: preset.source || 'campaign', readOnly: !!preset.readOnly })) : [];
  return [...rulePresetCatalog, ...custom];
}
