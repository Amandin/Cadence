import { describe, expect, it } from 'vitest';
import { drawRandomSource } from './engine.js';
import { parseRandomSourceCsv } from './csv.js';

describe('RandomSystem CSV import', () => {
  it('imports inclusive ranges as weights', () => {
    const parsed = parseRandomSourceCsv([
      'range,label',
      '1-2,Soleil',
      '3,Nuage',
      '4-6,"Pluie, forte"',
    ].join('\n'), { id: 'weather', name: 'Météo' });

    expect(parsed.ok).toBe(true);
    expect(parsed.source.outcomes).toMatchObject([
      { label: 'Soleil', weight: 2 },
      { label: 'Nuage', weight: 1 },
      { label: 'Pluie, forte', weight: 3 },
    ]);
    expect(drawRandomSource(parsed.source, () => 0.1).label).toBe('Soleil');
    expect(drawRandomSource(parsed.source, () => 0.9).label).toBe('Pluie, forte');
  });

  it('imports explicit weights, values, symbols and detailed text', () => {
    const parsed = parseRandomSourceCsv([
      'label,weight,value,symbol,text',
      'Vide,2,0,,',
      'Étoile,1,3,★,"Une lumière révèle un secret."',
    ].join('\n'));

    expect(parsed.ok).toBe(true);
    expect(parsed.source.outcomes[1]).toMatchObject({
      label: 'Étoile',
      weight: 1,
      value: 3,
      symbol: '★',
      text: 'Une lumière révèle un secret.',
    });
  });

  it('rejects malformed tables with a precise row', () => {
    const parsed = parseRandomSourceCsv('label,weight\nSoleil,0');
    expect(parsed).toEqual({ ok: false, error: 'Poids ou plage invalide à la ligne 2.' });
  });
  it('accepts localized French headers', () => {
    const parsed = parseRandomSourceCsv([
      'nom,poids,valeur,symbole,texte',
      'Pluie,2,6,🌧️,"Averses éparses"',
    ].join('\n'));

    expect(parsed.ok).toBe(true);
    expect(parsed.source.outcomes).toMatchObject([
      {
        label: 'Pluie',
        weight: 2,
        value: 6,
        symbol: '🌧️',
        text: 'Averses éparses',
      },
    ]);
  });
});
