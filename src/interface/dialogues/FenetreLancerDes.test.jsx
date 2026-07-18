import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FenetreLancerDes, QuickRollResult } from './FenetreLancerDes.jsx';

function comparisonResult() {
  const group = (index, value, selected) => ({
    index,
    selected,
    draws: [{
      id: `draw-${index}`,
      outcome: { label: String(value), value },
      calculatedValue: value,
      markers: [],
      kept: true,
      rerolled: false,
    }],
    aggregates: [{ id: 'total', label: 'Total', value }],
  });
  return {
    id: 'quick-d20',
    kind: 'random-roll',
    definitionName: 'Jet d20',
    combined: false,
    selectedGroupIndex: 1,
    groups: [group(0, 2, false), group(1, 16, true)],
    draws: [group(1, 16, true).draws[0]],
    primaryAggregate: {
      id: 'total',
      label: 'Total',
      value: 16,
      adjustments: [{ type: 'modifier', label: 'Modificateur', value: 0 }],
    },
  };
}

describe('QuickRollResult', () => {
  it('shows a compact total, modifier and both compared dice', () => {
    const html = renderToStaticMarkup(<QuickRollResult result={comparisonResult()} />);

    expect(html).toContain('<span>Résultat</span><strong>16</strong>');
    expect(html).toContain('Modificateur <strong>+0</strong>');
    expect(html).toContain('quick-roll-die is-discarded');
    expect(html).toContain('quick-roll-die is-kept');
    expect(html).toContain('is-rolling');
    expect(html).toContain('<strong>16</strong>');
    expect(html).not.toContain('SÃ©rie');
  });

  it('renders nothing before the first roll', () => {
    expect(renderToStaticMarkup(<QuickRollResult result={null} />)).toBe('');
  });

  it('shows card draws in the same compact result area', () => {
    const html = renderToStaticMarkup(<QuickRollResult result={{
      id: 'cards-1',
      kind: 'card-draw',
      sourceName: 'Tarot',
      remaining: 21,
      cards: [{ id: 'sun', label: 'Le Soleil', symbol: '☀', comment: 'Succès éclatant' }],
    }} />);

    expect(html).toContain('Tarot');
    expect(html).toContain('21 cartes restantes');
    expect(html).toContain('Le Soleil');
    expect(html).toContain('Succès éclatant');
  });
});

describe('FenetreLancerDes', () => {
  it('propose les tirages actifs sous forme de boutons', () => {
    const definitions = [
      { id: 'd20', name: 'Jet d20', active: true, exposed: true, parameters: [], options: [], components: [], pipeline: [] },
      { id: 'd100', name: 'Jet percentile', active: true, exposed: true, parameters: [], options: [], components: [], pipeline: [] },
    ];
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: { definitions, sources: [] },
          actions: { runDefinition: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).toContain('class="quick-roll-type-options" role="group"');
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('visual-dice compact');
    expect(html).toContain('<span>Jet d20</span>');
    expect(html).toContain('<span>Jet percentile</span>');
    expect(html).toContain('<span>Syntaxe experte</span>');
    expect(html).not.toContain('<select');
  });

  it('offers direct card draws when a deck is available', () => {
    const deck = { id: 'tarot', name: 'Tarot', kind: 'cards', cards: [{ id: 'sun', label: 'Le Soleil' }] };
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: { definitions: [], sources: [deck] },
          actions: { drawCards: () => null, runAdHocDefinition: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).toContain('<span>Tarot</span>');
    expect(html).toContain('Nombre de cartes');
    expect(html).toContain('Sans remise');
    expect(html).toContain('Avec remise');
  });

  it('keeps a free expert expression accessible without saving a definition', () => {
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: { definitions: [], sources: [] },
          actions: { runAdHocDefinition: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).toContain('Expression');
    expect(html).toContain('>1d20</textarea>');
    expect(html).toContain('Exécute une expression ponctuelle sans créer de nouveau type de tirage.');
  });
});
