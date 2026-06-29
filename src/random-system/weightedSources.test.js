import { describe, expect, it } from 'vitest';
import { drawRandomSource } from './engine.js';
import { createGuidedWeightedSource } from './weightedSources.js';

describe('RandomSystem guided weighted sources', () => {
  it('builds a weighted source from guided rows', () => {
    const result = createGuidedWeightedSource([
      { label: 'Calme', weight: 3, value: 0 },
      { label: 'Tempête', weight: 1, value: 2, symbol: '!', text: 'La mer devient impraticable.' },
    ], { id: 'weather', name: 'Météo' });

    expect(result.ok).toBe(true);
    expect(result.source.outcomes).toMatchObject([
      { label: 'Calme', weight: 3, value: 0 },
      { label: 'Tempête', weight: 1, value: 2, symbol: '!', text: 'La mer devient impraticable.' },
    ]);
    expect(drawRandomSource(result.source, () => 0.9)).toMatchObject({
      label: 'Tempête',
      text: 'La mer devient impraticable.',
    });
  });

  it('reports the invalid guided row', () => {
    expect(createGuidedWeightedSource([{ label: '', weight: 1 }]))
      .toEqual({ ok: false, error: 'Libellé manquant à la ligne 1.' });
    expect(createGuidedWeightedSource([{ label: 'Vide', weight: 0 }]))
      .toEqual({ ok: false, error: 'Poids invalide à la ligne 1.' });
  });
});
