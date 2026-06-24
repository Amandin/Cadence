import { describe, expect, it } from 'vitest';
import { fermetureExterieureSurClic, fermetureExterieureSurDoubleClic } from './ComposantsCommuns.jsx';

describe('fermeture exterieure des fenetres', () => {
  it('requires a double click for mouse interactions in protected editors', () => {
    expect(fermetureExterieureSurClic('double-mouse', 'mouse')).toBe(false);
    expect(fermetureExterieureSurDoubleClic('double-mouse', 'mouse')).toBe(true);
  });

  it('keeps single-tap closing on touch and pen interfaces', () => {
    expect(fermetureExterieureSurClic('double-mouse', 'touch')).toBe(true);
    expect(fermetureExterieureSurClic('double-mouse', 'pen')).toBe(true);
    expect(fermetureExterieureSurDoubleClic('double-mouse', 'touch')).toBe(false);
  });

  it('keeps the default single-click behavior for other windows', () => {
    expect(fermetureExterieureSurClic('single', 'mouse')).toBe(true);
    expect(fermetureExterieureSurDoubleClic('single', 'mouse')).toBe(false);
  });
});
