import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SourceManager } from './SourceManager.jsx';
import { CardSourceForm } from './UsePanel.jsx';

describe('RandomSystem source notes UI', () => {
  it('shows source notes in place of the type label and displays weight ratios', () => {
    const html = renderToStaticMarkup(
      <SourceManager
        sources={[{
          id: 'weather-table',
          name: 'Meteo',
          note: 'Table de voyage',
          kind: 'weighted',
          outcomes: [
            { id: 'sun', label: 'Soleil', weight: 2, value: 1 },
            { id: 'rain', label: 'Pluie', weight: 3, value: 2 },
          ],
        }]}
        definitions={[]}
        actions={{ deleteSource: () => {}, saveSource: (source) => source }}
      />,
    );

    expect(html).toContain('Table de voyage');
    expect(html).toContain('Total actuel : 5');
    expect(html).toContain('Poids 2/5');
  });

  it('shows a card source note in use', () => {
    const html = renderToStaticMarkup(
      <CardSourceForm
        source={{
          id: 'omens',
          name: 'Presages',
          note: 'Tirage de presage',
          cards: [{ id: 'sun', label: 'Soleil', value: 'sun', symbol: '', image: '', comment: '', markers: [] }],
        }}
        sourceState={{ drawPile: ['sun'], discardPile: [] }}
        actions={{ drawCards: () => {}, resetCardSource: () => {}, returnCards: () => {} }}
      />,
    );

    expect(html).toContain('Tirage de presage');
  });
});
