import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initiativeTextOrderPresetIds, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { FenetreInitiativeTextuelleEdition } from './FenetreInitiativeTextuelleEdition.jsx';

const renderEditor = (cardSources = [], tableSources = []) => renderToStaticMarkup(
  <FenetreInitiativeTextuelleEdition
    config={presetInitiativeTextOrder(initiativeTextOrderPresetIds.POSTURES)}
    cardSources={cardSources}
    tableSources={tableSources}
    onFermer={() => {}}
    onValider={() => {}}
    onEnregistrerPreset={() => ({ ok: true })}
  />,
);

describe('FenetreInitiativeTextuelleEdition', () => {
  it('disables the linked random source option when no source can be linked', () => {
    const html = renderEditor();

    expect(html).toContain('<option value="source" disabled="">Paquet ou table d’aléa</option>');
    expect(html).toContain('Enregistrer comme préréglage');
  });

  it('enables the linked random source option when a card source is available', () => {
    const html = renderEditor([{
      id: 'deck-1',
      name: 'Paquet standard',
      kind: 'cards',
      cards: [
        { id: 'as-pique', label: 'As de Pique', rank: 'As', suit: 'Pique', value: 14 },
        { id: 'roi-pique', label: 'Roi de Pique', rank: 'Roi', suit: 'Pique', value: 13 },
      ],
    }]);

    expect(html).toContain('<option value="source">Paquet ou table d’aléa</option>');
    expect(html).not.toContain('<option value="source" disabled="">');
  });

  it('enables the linked random source option for a weighted table', () => {
    const html = renderEditor([], [{
      id: 'stances',
      name: 'Postures tirées',
      kind: 'weighted',
      outcomes: [{ id: 'fast', label: 'Rapide', value: 'Rapide', weight: 1 }],
    }]);

    expect(html).toContain('<option value="source">Paquet ou table d’aléa</option>');
  });
});
