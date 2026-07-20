import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FenetreLancerDes, QuickRollResult } from './FenetreLancerDes.jsx';
import { TokenContainerForm } from '../../random-system/ui/TokenContainerForm.jsx';

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

  it('shows selected token destinations in the compact result area', () => {
    const html = renderToStaticMarkup(<QuickRollResult result={{
      id: 'tokens-1',
      kind: 'token-draw',
      definitionName: 'Deux garder un',
      sourceName: 'Sac principal',
      tokens: [{ typeId: 'red', name: 'Rouge', kept: true, destinationName: 'Sac du joueur', appearance: { symbol: '◆', color: '#c94a4a' } }],
    }} />);

    expect(html).toContain('Deux garder un');
    expect(html).toContain('Rouge');
    expect(html).toContain('Sac du joueur');
    expect(html).toContain('◆');
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
    expect(html).toContain('Tous les tirages');
    expect(html).toContain('aria-label="Ajuster ponctuellement ce tirage"');
    expect(html).toContain('{ }');
    expect(html).not.toContain('<span>Syntaxe experte</span>');
    expect(html).not.toContain('<select');
  });

  it('does not expose raw card sources as standalone draws', () => {
    const deck = { id: 'tarot', name: 'Tarot', kind: 'cards', cards: [{ id: 'sun', label: 'Le Soleil' }] };
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: { definitions: [], sources: [deck] },
          actions: { runAdHocDefinition: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).not.toContain('<span>Tarot</span>');
    expect(html).not.toContain('Nombre de cartes');
  });

  it('hides catalogue-only resources from the quick launcher', () => {
    const html = renderToStaticMarkup(<FenetreLancerDes randomSystem={{
      state: {
        definitions: [{ id: 'catalogue', name: 'Jet catalogue', exposed: true, active: true, quickAccess: false, parameters: [], options: [], components: [], pipeline: [] }],
        sources: [],
        tokenContainers: [{ id: 'slow-bag', name: 'Sac catalogue', contents: {}, exposed: true, quickAccess: false }],
      },
      actions: { runDefinition: () => null },
    }} onFermer={() => {}} />);
    expect(html).not.toContain('Jet catalogue');
    expect(html).not.toContain('Sac catalogue');
    expect(html).toContain('Tous les tirages');
  });

  it('exposes token containers instead of predefined token draws', () => {
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: {
            definitions: [],
            sources: [],
            tokenTypes: [{ id: 'red', name: 'Rouge', appearance: {} }],
            tokenContainers: [{ id: 'bag', name: 'Sac principal', contents: { red: 1 } }],
          },
          actions: { runAdHocDefinition: () => null, runTokenContainerDraw: () => null, adjustTokenContents: () => null, moveTokenContents: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).toContain('<span>Sac principal</span>');
  });

  it('keeps the full roll catalogue accessible when no quick roll exists', () => {
    const html = renderToStaticMarkup(
      <FenetreLancerDes
        randomSystem={{
          state: { definitions: [], sources: [] },
          actions: { runAdHocDefinition: () => null },
        }}
        onFermer={() => {}}
      />,
    );

    expect(html).toContain('Tous les tirages');
    expect(html).not.toContain('>1d20</textarea>');
  });
});

describe('TokenContainerForm', () => {
  it('blocks zero-token draws with a clear message', () => {
    const container = { id: 'bag', name: 'Sac', contents: {} };
    const html = renderToStaticMarkup(<TokenContainerForm
      container={container}
      containers={[container]}
      tokenTypes={[]}
      actions={{ runTokenContainerDraw: () => null, adjustTokenContents: () => null, moveTokenContents: () => null }}
    />);

    expect(html).toContain('Le conteneur est vide.');
    expect(html).toContain('Tirer dans Sac');
  });
});
