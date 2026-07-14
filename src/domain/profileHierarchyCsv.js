import { hierarchyNodeReferenceKey } from './profileHierarchy.js';

const CSV_COLUMNS = [
  'chemin',
  'profondeur',
  'id_etage',
  'id_parent',
  'type',
  'nom_affiche',
  'liaison_partagee',
  'id_personnalise',
  'description',
  'regles_appliquees',
  'kit_tirages',
  'definitions_tirages',
  'nombre_enfants',
  'donnees_avancees_json',
];

function csvCell(value) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function csvPath(parentPath, label, index) {
  const segment = `${index + 1}. ${label || 'Sans nom'}`;
  return parentPath ? `${parentPath} > ${segment}` : segment;
}

export function profileHierarchyToCsv(tree) {
  const rows = [CSV_COLUMNS];
  const walk = (node, parent = null, parentPath = '', depth = 0, index = 0) => {
    const path = csvPath(parentPath, node.label, index);
    const data = node.data || {};
    rows.push([
      path,
      depth,
      node.id,
      parent?.id || '',
      node.type,
      node.label,
      hierarchyNodeReferenceKey(node),
      data.id || '',
      data.description || '',
      data.rulePresetId || '',
      data.kitId || '',
      Array.isArray(data.definitionIds) ? data.definitionIds.join(', ') : '',
      (node.children || []).length,
      JSON.stringify(data),
    ]);
    (node.children || []).forEach((child, childIndex) => walk(child, node, path, depth + 1, childIndex));
  };
  walk(tree);
  return `\ufeff${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`;
}

export function profileHierarchyCsvFilename(date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  return `cadence-parcours-accueil-${stamp}.csv`;
}
