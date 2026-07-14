export const PROFILE_HIERARCHY_STORAGE_KEY = 'cadence:profile-hierarchy:v1';

function nodeId(prefix = 'node') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createProfileHierarchy({ systems = [], initiatives = [], quickRolls = [] } = {}) {
  const initiativeById = new Map(initiatives.map((profile) => [profile.id, profile]));
  const quickById = new Map(quickRolls.map((profile) => [profile.id, profile]));
  const quickNode = (id) => ({ id: nodeId('quick'), type: 'quickRoll', label: quickById.get(id)?.label || id, refId: id, data: {}, children: [] });
  const initiativeNode = (id, quickRollIds = []) => ({
    id: nodeId('initiative'),
    type: 'initiative',
    label: initiativeById.get(id)?.label || id,
    refId: id,
    data: {},
    children: quickRollIds.map(quickNode),
  });
  return {
    id: 'profile-root',
    type: 'root',
    label: 'Parcours d’accueil',
    children: systems.map((system) => ({
      id: nodeId('system'),
      type: 'system',
      label: system.name,
      refId: system.id,
      data: { description: system.description || '', family: system.family || '', examples: system.examples || '' },
      children: [
        ...(system.editions || []).map((edition) => ({
          id: nodeId('edition'),
          type: 'edition',
          label: edition.label,
          refId: edition.id,
          data: {},
          children: (edition.initiativeProfileIds || []).map((initiativeId) => initiativeNode(initiativeId, system.randomQuickRollProfileIds || [])),
        })),
        ...(system.initiativeProfileIds || []).map((initiativeId) => initiativeNode(initiativeId, system.randomQuickRollProfileIds || [])),
      ],
    })),
  };
}

function normalizeNode(node, fallbackType = 'group') {
  if (!node || typeof node !== 'object') return null;
  return {
    id: String(node.id || nodeId(fallbackType)),
    type: String(node.type || fallbackType),
    label: String(node.label || 'Nouveau niveau'),
    refId: String(node.refId || ''),
    data: node.data && typeof node.data === 'object' ? { ...node.data } : {},
    children: (Array.isArray(node.children) ? node.children : []).map((child) => normalizeNode(child)).filter(Boolean),
  };
}

function cloneQuickRollLink(node) {
  return { ...node, id: nodeId('quick'), data: { ...node.data }, children: [] };
}

function addQuickRollLinksToInitiatives(node, quickRolls, scope) {
  if (node.type === 'initiative') return { ...node, children: [...node.children, ...quickRolls.map(cloneQuickRollLink)] };
  if (node.type === 'system' && node.id !== scope?.id) return node;
  return { ...node, children: node.children.map((child) => addQuickRollLinksToInitiatives(child, quickRolls, scope)) };
}

export function migrateQuickRollsBelowInitiatives(node, isRoot = true) {
  const children = node.children.map((child) => migrateQuickRollsBelowInitiatives(child, false));
  if (node.type === 'initiative' || node.type === 'quickRoll') return { ...node, children };
  const directQuickRolls = children.filter((child) => child.type === 'quickRoll');
  if (!directQuickRolls.length) return { ...node, children };
  const withoutDirectQuickRolls = { ...node, children: children.filter((child) => child.type !== 'quickRoll') };
  const hasInitiative = descendants(withoutDirectQuickRolls, new Set(['system'])).some((child) => child.type === 'initiative');
  if (!hasInitiative) return { ...node, children };
  return addQuickRollLinksToInitiatives(withoutDirectQuickRolls, directQuickRolls, isRoot ? null : node);
}

export function loadProfileHierarchy(fallback) {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_HIERARCHY_STORAGE_KEY) || 'null');
    return stored ? migrateQuickRollsBelowInitiatives(normalizeNode(stored, 'root')) : fallback;
  } catch {
    return fallback;
  }
}

export function saveProfileHierarchy(tree) {
  const normalized = normalizeNode(tree, 'root');
  if (typeof localStorage !== 'undefined') localStorage.setItem(PROFILE_HIERARCHY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function createHierarchyNode(type = 'group', label = '') {
  const defaultLabels = { group: 'Nouveau niveau', system: 'Nouveau système', edition: 'Nouveau sous-système', initiative: 'Nouvelle initiative', quickRoll: 'Nouveau jet rapide' };
  return { id: nodeId(type), type, label: label || defaultLabels[type] || 'Nouvel élément', refId: '', data: {}, children: [] };
}

export function updateHierarchyNode(tree, id, updater) {
  if (tree.id === id) return updater(tree);
  return { ...tree, children: tree.children.map((child) => updateHierarchyNode(child, id, updater)) };
}

export function removeHierarchyNode(tree, id) {
  return { ...tree, children: tree.children.filter((child) => child.id !== id).map((child) => removeHierarchyNode(child, id)) };
}

export function findHierarchyNode(tree, id) {
  if (tree?.id === id) return tree;
  for (const child of tree?.children || []) {
    const found = findHierarchyNode(child, id);
    if (found) return found;
  }
  return null;
}

export function listHierarchyNodes(tree) {
  if (!tree) return [];
  return [tree, ...(tree.children || []).flatMap((child) => listHierarchyNodes(child))];
}

export function hierarchyNodeReferenceKey(node) {
  return String(node?.refId || node?.data?.id || '');
}

function descendants(node, blockedTypes = new Set()) {
  return (node.children || []).flatMap((child) => blockedTypes.has(child.type) ? [] : [child, ...descendants(child, blockedTypes)]);
}

function profileRichness(profile) {
  return Object.values(profile).filter((value) => value !== '' && value !== null && value !== undefined && (!Array.isArray(value) || value.length > 0)).length;
}

function dedupeProfiles(profiles) {
  const profilesById = new Map();
  profiles.forEach((profile) => {
    const current = profilesById.get(profile.id);
    if (!current || profileRichness(profile) > profileRichness(current)) profilesById.set(profile.id, profile);
  });
  return [...profilesById.values()];
}

function profileIdFromNode(node) {
  if (node.refId || node.data.id) return node.refId || node.data.id;
  return node.type === 'quickRoll' ? `quick-roll/custom-${node.id}` : `initiative/custom-${node.id}`;
}

function uniqueProfileIds(nodes) {
  return [...new Set(nodes.map(profileIdFromNode))];
}

export function compileProfileHierarchy(tree, { systems = [], initiatives = [], quickRolls = [] } = {}) {
  const baseSystems = new Map(systems.map((item) => [item.id, item]));
  const baseInitiatives = new Map(initiatives.map((item) => [item.id, item]));
  const baseQuickRolls = new Map(quickRolls.map((item) => [item.id, item]));
  const allNodes = [tree, ...descendants(tree)];
  const initiativeLinks = allNodes.filter((node) => node.type === 'initiative').map((node) => ({
    ...(baseInitiatives.get(node.refId) || {}), ...node.data,
    id: node.refId || node.data.id || `initiative/custom-${node.id}`,
    label: node.label,
    status: node.data.status || baseInitiatives.get(node.refId)?.status || 'available',
    supportLevel: node.data.supportLevel || baseInitiatives.get(node.refId)?.supportLevel || 'home',
  }));
  const quickRollLinks = allNodes.filter((node) => node.type === 'quickRoll').map((node) => ({
    ...(baseQuickRolls.get(node.refId) || {}), ...node.data,
    id: node.refId || node.data.id || `quick-roll/custom-${node.id}`,
    label: node.label,
    description: node.data.description || baseQuickRolls.get(node.refId)?.description || '',
  }));
  const compiledInitiatives = dedupeProfiles(initiativeLinks);
  const compiledQuickRolls = dedupeProfiles(quickRollLinks);
  const systemsCompiled = descendants(tree).filter((node) => node.type === 'system').map((node) => {
    const base = baseSystems.get(node.refId) || {};
    const nested = descendants(node, new Set(['system']));
    const editions = nested.filter((child) => child.type === 'edition').map((edition) => ({
      id: edition.refId || edition.data.id || `edition-${edition.id}`,
      label: edition.label,
      initiativeProfileIds: uniqueProfileIds(descendants(edition).filter((child) => child.type === 'initiative')),
    }));
    const editionNodeIds = new Set(nested.filter((child) => child.type === 'edition').flatMap((edition) => [edition.id, ...descendants(edition).map((item) => item.id)]));
    return {
      ...base, ...node.data,
      id: node.refId || node.data.id || `system/custom-${node.id}`,
      name: node.label,
      editions,
      initiativeProfileIds: uniqueProfileIds(nested.filter((child) => child.type === 'initiative' && !editionNodeIds.has(child.id))),
      randomQuickRollProfileIds: uniqueProfileIds(nested.filter((child) => child.type === 'quickRoll')),
    };
  });
  return { systems: systemsCompiled, initiatives: compiledInitiatives, quickRolls: compiledQuickRolls };
}
