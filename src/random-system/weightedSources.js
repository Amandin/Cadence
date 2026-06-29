import { createWeightedSource } from './engine.js';

function parsedValue(value, label) {
  const clean = String(value ?? '').trim();
  if (!clean) return label;
  const numeric = Number(clean);
  return Number.isFinite(numeric) ? numeric : clean;
}

export function createGuidedWeightedSource(rows, {
  id = 'weighted-source',
  name = 'Source pondérée',
  note = '',
} = {}) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  if (!sourceRows.length) {
    return { ok: false, error: 'Ajoute au moins un résultat.' };
  }
  const outcomes = [];
  for (let index = 0; index < sourceRows.length; index += 1) {
    const row = sourceRows[index] || {};
    const label = String(row.label || '').trim();
    const weight = Number(row.weight);
    if (!label) {
      return { ok: false, error: `Libellé manquant à la ligne ${index + 1}.` };
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      return { ok: false, error: `Poids invalide à la ligne ${index + 1}.` };
    }
    outcomes.push({
      id: String(row.id || `outcome-${index + 1}`),
      label,
      value: parsedValue(row.value, label),
      symbol: String(row.symbol || '').trim(),
      image: String(row.image || '').trim(),
      text: String(row.text || '').trim(),
      weight,
    });
  }
  return {
    ok: true,
    source: createWeightedSource({ id, name, note, outcomes }),
  };
}
