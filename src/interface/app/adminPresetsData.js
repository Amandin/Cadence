import { activationAdvancePolicies, equalityRules, initiativeOrders, initiativeValueTypes, multipleActionModes, manualMultipleActionScopes, phaseActionModes, surpriseImpacts, temporalityModes } from '../../constants.js';
import { rulePresetCatalog, rulePresetFamilies } from '../../rulePresets.js';
import { initiativeProfileCatalog, quickRollProfileCatalog, systemProfileCatalog } from '../../domain/systemProfiles.js';
import {
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
  randomKitIsLoaded,
  randomKitIsStrictlyActive,
  randomKitResources,
} from '../../random-system/rulePresetKits.js';

function downloadProfileHierarchyCsv(tree) {
  const blob = new Blob([profileHierarchyToCsv(tree)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = profileHierarchyCsvFilename();
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeList(values) {
  return Array.isArray(values) ? values.filter(Boolean) : [];
}

function cleanCatalogId(id) {
  return String(id || '').replace(/^catalog:/, '').trim();
}

function makeLocalId(sourceId, rows, prefix) {
  const base = `${prefix}-${cleanCatalogId(sourceId) || 'preset'}`.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || `${prefix}-preset`;
  const ids = new Set(rows.map((row) => row.id));
  if (!ids.has(base)) return base;
  let index = 2;
  while (ids.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

function familyLabel(family) {
  if (family === rulePresetFamilies.GENERIC) return 'Générique';
  if (family === rulePresetFamilies.SYSTEM) return 'Système';
  if (family === rulePresetFamilies.PERSONAL) return 'Local';
  return family || 'Autre';
}

function initiativeLabel(mode) {
  const labels = {
    [randomKitInitiativeModes.NUMERIC]: 'num.',
    [randomKitInitiativeModes.CARDS]: 'cartes',
    [randomKitInitiativeModes.LABEL_ORDER]: 'labels',
    [randomKitInitiativeModes.RANDOM_ORDER]: 'aléa',
    [randomKitInitiativeModes.MANUAL]: 'manuel',
    [randomKitInitiativeModes.NONE]: 'aucune',
  };
  return labels[mode] || mode || '—';
}

function policyLabel(policy) {
  const labels = {
    [randomKitApplicationPolicies.ASK]: 'demande',
    [randomKitApplicationPolicies.FILL_EMPTY]: 'complète',
    [randomKitApplicationPolicies.REPLACE_ALL]: 'remplace',
    [randomKitApplicationPolicies.MANUAL_ONLY]: 'manuel',
  };
  return labels[policy] || policy || '—';
}

function yesNo(value) {
  return value ? 'oui' : '—';
}

function listToText(values) {
  return safeList(values).join('\n');
}

function textToList(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function numbersToList(value) {
  return textToList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function participantTypesToText(value) {
  return safeList(value).map((type) => `${type.name || ''}:${type.behaviorType || type.baseType || ''}`).join('\n');
}

function textToParticipantTypes(value) {
  return String(value || '').split(/\r?\n/).map((line) => { const [name, behaviorType] = line.split(':').map((item) => item.trim()); return { name, behaviorType }; }).filter((type) => type.name && type.behaviorType);
}

function rulesBreakdown(rules = {}) {
  const textOrder = rules.initiativeTextOrder || {};
  const multipleActionMode = rules.multipleActionMode || multipleActionModes.NONE;
  return {
    temporalite: rules.temporalite || temporalityModes.CLASSIC,
    declaration: !!rules.declarationMode,
    initiative: rules.flexibleUseInitiative === false ? 'sans init.' : rules.initiativeValueType === initiativeValueTypes.LABEL ? 'labels' : 'num.',
    order: textOrder.enabled ? (textOrder.preset || 'texte') : rules.initiativeOrder === initiativeOrders.ASC ? 'asc.' : 'desc.',
    equality: rules.equalityRule || equalityRules.STRICT,
    actions: multipleActionMode === multipleActionModes.MANUAL && rules.manualMultipleActionScope === manualMultipleActionScopes.ELITE_ONLY ? 'manual · Élite' : multipleActionMode !== multipleActionModes.NONE ? multipleActionMode : rules.multipleActionSlots ? 'multi' : 'simple',
    phases: rules.temporalite === temporalityModes.PHASES ? `${rules.phaseActionMode || phaseActionModes.AUTOMATIC} · ${rules.phaseCount || 3}` : '—',
    surprise: rules.surpriseImpact || surpriseImpacts.LIMITED,
    declarationText: rules.declarationRequireText ? 'texte requis' : '—',
  };
}

function kitResourceSummary(kit, customKits) {
  const resources = randomKitResources(kit, customKits);
  const exposedDefinitions = resources.definitions.filter((definition) => definition.exposed !== false);
  return {
    sources: resources.sources.length,
    definitions: exposedDefinitions.length,
    internal: resources.definitions.length - exposedDefinitions.length,
    definitionNames: exposedDefinitions.map((definition) => definition.name).join(', '),
    sourceRows: resources.sources.map((source) => ({
      id: source.id,
      name: source.name || source.label || source.id,
      kind: source.kind,
      faces: safeList(source.faces).length || safeList(source.cards).length || '—',
    })),
    definitionRows: resources.definitions.map((definition) => ({
      id: definition.id,
      name: definition.name,
      active: definition.active !== false,
      exposed: definition.exposed !== false,
      components: safeList(definition.components).length,
      pipeline: safeList(definition.pipeline).length,
    })),
  };
}

function editablePresetPayload(preset) {
  return {
    id: preset.id,
    name: preset.name,
    category: preset.category,
    family: preset.family,
    system: preset.system,
    description: preset.description,
    rules: preset.rules || {},
  };
}

function editableKitPayload(kit) {
  return {
    id: kit.id,
    label: kit.label,
    description: kit.description,
    familyTags: safeList(kit.familyTags),
    presetIds: safeList(kit.presetIds),
    sourceIds: safeList(kit.sourceIds),
    sources: safeList(kit.sources),
    definitions: safeList(kit.definitions),
    initiative: kit.initiative || {},
    applicationPolicy: kit.applicationPolicy,
  };
}

function buildPresetRows(ruleTemplates, allKits) {
  const kitByPreset = new Map();
  allKits.forEach((kit) => {
    safeList(kit.presetIds).forEach((presetId) => {
      if (!kitByPreset.has(presetId)) kitByPreset.set(presetId, []);
      kitByPreset.get(presetId).push(kit.label || kit.id);
    });
  });

  const providedPresets = safeList(ruleTemplates);
  const providedKeys = new Set(providedPresets.map((preset) => preset.catalogId || cleanCatalogId(preset.id) || preset.name));
  const missingCatalogPresets = rulePresetCatalog.filter((preset) => !providedKeys.has(preset.catalogId));

  return [
    ...providedPresets.map((preset) => ({
      ...preset,
      id: preset.id || '',
      catalogId: preset.catalogId || '',
      family: preset.family || (preset.readOnly ? rulePresetFamilies.GENERIC : rulePresetFamilies.PERSONAL),
      category: preset.category || 'Local',
      adminOrigin: preset.source === 'catalog' || preset.readOnly ? 'Catalogue' : 'Local',
      readOnly: !!preset.readOnly,
    })),
    ...missingCatalogPresets.map((preset) => ({ ...preset, adminOrigin: 'Catalogue', readOnly: true })),
  ].map((preset) => {
    const key = preset.catalogId || cleanCatalogId(preset.id);
    return {
      ...preset,
      adminType: 'preset',
      adminKey: key || preset.id || preset.name,
      linkedKits: kitByPreset.get(key) || [],
      editablePayload: editablePresetPayload(preset),
    };
  });
}

function buildKitRows(randomState) {
  const customKits = safeList(randomState?.randomKits);
  const catalogRows = randomKitCatalog.map((kit) => ({ ...kit, adminOrigin: 'Catalogue', readOnly: true }));
  const localRows = customKits.map((kit) => ({ ...kit, adminOrigin: 'Local', readOnly: false }));
  return [...catalogRows, ...localRows].map((kit) => ({
    ...kit,
    adminType: 'kit',
    adminKey: kit.id,
    loaded: randomKitIsLoaded(randomState, kit),
    active: randomKitIsStrictlyActive(randomState, kit),
    resources: kitResourceSummary(kit, customKits),
    editablePayload: editableKitPayload(kit),
  }));
}

export { downloadProfileHierarchyCsv, safeList, cleanCatalogId, makeLocalId, familyLabel, initiativeLabel, policyLabel, yesNo, listToText, textToList, numbersToList, participantTypesToText, textToParticipantTypes, rulesBreakdown, kitResourceSummary, editablePresetPayload, editableKitPayload, buildPresetRows, buildKitRows };

