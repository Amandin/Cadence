import { createWeightedSource } from './engine.js';

const HEADER_ALIASES = {
  range: ['range', 'plage'],
  label: ['label', 'libelle', 'libelle', 'name', 'nom'],
  weight: ['weight', 'poids'],
  value: ['value', 'valeur'],
  symbol: ['symbol', 'symbole'],
  image: ['image', 'illustration', 'url', 'image_url'],
  text: ['text', 'texte', 'description', 'comment', 'commentaire'],
};

function normalizeHeader(value) {
  return String(value || '').trim().toLowerCase();
}

function headerIndex(headers, name) {
  const aliases = HEADER_ALIASES[name];
  return headers.findIndex((header) => aliases.includes(normalizeHeader(header)));
}

function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      row.push(cell.trim());
      cell = '';
    } else if ((character === '\n' || character === '\r') && !quoted) {
      if (character === '\r' && source[index + 1] === '\n') index += 1;
      row.push(cell.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += character;
    }
  }
  row.push(cell.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function rangeWeight(value) {
  const clean = String(value || '').trim();
  if (/^-?\d+$/.test(clean)) return 1;
  const match = clean.match(/^(-?\d+)\s*-\s*(-?\d+)$/);
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (end < start) return null;
  return (end - start) + 1;
}

function inferredValue(value, label) {
  const clean = String(value ?? '').trim();
  if (!clean) return label;
  const numeric = Number(clean);
  return Number.isFinite(numeric) && clean !== '' ? numeric : clean;
}

export function parseRandomSourceCsv(text, {
  id = 'source-imported',
  name = 'Source importée',
  note = '',
} = {}) {
  const rows = parseCsvRows(text);
  if (rows.length < 2) {
    return { ok: false, error: 'Le CSV doit contenir un en-tête et au moins une ligne.' };
  }

  const headers = rows[0].map(normalizeHeader);
  const labelColumn = headerIndex(headers, 'label');
  const rangeColumn = headerIndex(headers, 'range');
  const weightColumn = headerIndex(headers, 'weight');
  const valueColumn = headerIndex(headers, 'value');
  const symbolColumn = headerIndex(headers, 'symbol');
  const imageColumn = headerIndex(headers, 'image');
  const textColumn = headerIndex(headers, 'text');
  if (labelColumn < 0 || (rangeColumn < 0 && weightColumn < 0)) {
    return { ok: false, error: 'Colonnes attendues : range,label ou label,weight.' };
  }

  const outcomes = [];
  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex];
    const label = String(row[labelColumn] || '').trim();
    if (!label) return { ok: false, error: `Libellé manquant à la ligne ${rowIndex + 1}.` };
    const weight = rangeColumn >= 0
      ? rangeWeight(row[rangeColumn])
      : Number(row[weightColumn]);
    if (!Number.isFinite(weight) || weight <= 0) {
      return { ok: false, error: `Poids ou plage invalide à la ligne ${rowIndex + 1}.` };
    }
    outcomes.push({
      id: `outcome-${rowIndex}`,
      label,
      value: inferredValue(valueColumn >= 0 ? row[valueColumn] : '', label),
      symbol: symbolColumn >= 0 ? String(row[symbolColumn] || '').trim() : '',
      image: imageColumn >= 0 ? String(row[imageColumn] || '').trim() : '',
      text: textColumn >= 0 ? String(row[textColumn] || '').trim() : '',
      weight,
    });
  }

  return {
    ok: true,
    source: createWeightedSource({ id, name, note, outcomes }),
  };
}
