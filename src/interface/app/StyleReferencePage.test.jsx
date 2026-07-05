import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { participantSymbols, uiGlyphs, uiSymbols } from '../../uiAssets.js';
import { StyleReferencePage, symbolReferences } from './StyleReferencePage.jsx';

describe('StyleReferencePage', () => {
  it('attribue une référence unique à chaque symbole inventorié', () => {
    const references = symbolReferences.map(({ ref }) => ref);
    expect(new Set(references).size).toBe(references.length);
    expect(references).not.toContain('SYM-LIT-02');
    expect(symbolReferences).toContainEqual(expect.objectContaining({
      ref: 'SYM-LIT-31',
      source: 'uiSymbols.confirm',
    }));
  });

  it('inventorie les symboles centralisés de Cadence', () => {
    const symbols = symbolReferences.map(({ symbol }) => symbol);
    for (const symbol of Object.values(uiGlyphs)) expect(symbols).toContain(symbol);
    for (const symbol of Object.values(uiSymbols)) expect(symbols).toContain(symbol);
    for (const symbol of participantSymbols) expect(symbols).toContain(symbol);
  });

  it('expose la variable de chaque symbole et ordonne monter avant descendre', () => {
    for (const [key, symbol] of Object.entries(uiSymbols)) {
      expect(symbolReferences).toContainEqual(expect.objectContaining({
        symbol,
        source: `uiSymbols.${key}`,
      }));
    }
    const moveUpIndex = symbolReferences.findIndex(({ source }) => source === 'uiSymbols.moveUp');
    const moveDownIndex = symbolReferences.findIndex(({ source }) => source === 'uiSymbols.moveDown');
    expect(moveUpIndex).toBeGreaterThanOrEqual(0);
    expect(moveDownIndex).toBe(moveUpIndex + 1);
  });

  it('rend les principales familles de styles et les symboles littéraux', () => {
    const html = renderToStaticMarkup(<StyleReferencePage onBack={() => {}} />);

    for (const reference of ['CAT-01', 'BTN-01', 'FORM-01', 'TRACK-01', 'RAND-01', 'COLOR-01', 'SYM-LIT-06', 'SYM-GRP-06', 'ICON-06', 'CAT-11', 'AUDIT-03', 'AUDIT-04']) {
      expect(html).toContain(reference);
    }
    for (const symbol of ['x', '✓', '↑', '↓', '×']) {
      expect(html).toContain(symbol);
    }
    for (const mark of ['mark-0', 'mark-1', 'mark-2', 'mark-3', 'mark-4', 'mark-5']) {
      expect(html).toContain(mark);
    }
  });
});
