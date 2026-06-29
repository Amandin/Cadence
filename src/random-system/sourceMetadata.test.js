import { describe, expect, it } from 'vitest';
import { createUniformSource, drawRandomSource } from './engine.js';
import { parseRandomSourceCsv } from './csv.js';
import { createGuidedWeightedSource } from './weightedSources.js';

describe('RandomSystem source metadata', () => {
  it('keeps per-face images and texts on uniform sources', () => {
    const source = createUniformSource({
      id: 'weather-d6',
      name: 'Meteo',
      min: 1,
      max: 6,
      labels: { 1: 'Pluie', 6: 'Soleil' },
      symbols: { 1: '☔', 6: '☀️' },
      images: { 6: 'https://example.com/sun.png' },
      texts: { 1: 'Un crachin s’installe.' },
    });

    expect(drawRandomSource(source, () => 0)).toMatchObject({
      value: 1,
      label: 'Pluie',
      symbol: '☔',
      text: 'Un crachin s’installe.',
    });
    expect(drawRandomSource(source, () => 0.999)).toMatchObject({
      value: 6,
      label: 'Soleil',
      symbol: '☀️',
      image: 'https://example.com/sun.png',
    });
  });

  it('keeps images on guided weighted outcomes', () => {
    const result = createGuidedWeightedSource([
      { label: 'Soleil', weight: 1, image: 'https://example.com/sun.png' },
      { label: 'Pluie', weight: 1, text: 'Temps humide.' },
    ]);

    expect(result.ok).toBe(true);
    expect(result.source.outcomes[0]).toMatchObject({
      label: 'Soleil',
      image: 'https://example.com/sun.png',
    });
  });

  it('imports images from csv sources', () => {
    const parsed = parseRandomSourceCsv([
      'label,weight,image,text',
      'Soleil,1,https://example.com/sun.png,Temps clair',
      'Pluie,1,,Temps humide',
    ].join('\n'));

    expect(parsed.ok).toBe(true);
    expect(parsed.source.outcomes[0]).toMatchObject({
      label: 'Soleil',
      image: 'https://example.com/sun.png',
      text: 'Temps clair',
    });
  });
});
