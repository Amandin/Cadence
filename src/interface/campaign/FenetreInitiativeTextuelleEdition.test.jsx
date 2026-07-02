import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initiativeTextOrderPresetIds, presetInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { FenetreInitiativeTextuelleEdition } from './FenetreInitiativeTextuelleEdition.jsx';

const renderEditor = (cardSources = []) => renderToStaticMarkup(
  <FenetreInitiativeTextuelleEdition
    config={presetInitiativeTextOrder(initiativeTextOrderPresetIds.POSTURES)}
    cardSources={cardSources}
    onFermer={() => {}}
    onValider={() => {}}
    onEnregistrerPreset={() => ({ ok: true })}
  />,
);

describe('FenetreInitiativeTextuelleEdition', () => {
  it('disables the card preset when no card source can be linked', () => {
    const html = renderEditor();

    expect(html).toContain('<option value="cards" disabled="">Paquet de cartes</option>');
    expect(html).toContain('Enregistrer comme préréglage');
  });

  it('enables the card preset when a card source is available', () => {
    const html = renderEditor([{
      id: 'deck-1',
      name: 'Paquet standard',
      kind: 'cards',
      cards: [
        { id: 'as-pique', label: 'As de Pique', rank: 'As', suit: 'Pique', value: 14 },
        { id: 'roi-pique', label: 'Roi de Pique', rank: 'Roi', suit: 'Pique', value: 13 },
      ],
    }]);

    expect(html).toContain('<option value="cards">Paquet de cartes</option>');
    expect(html).not.toContain('<option value="cards" disabled="">');
  });
});
