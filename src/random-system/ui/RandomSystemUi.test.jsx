import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { createDefinitionDraft } from '../definitionBuilder.js';
import { randomRuleIds } from '../rulePool.js';
import { createDefaultRandomSystemState } from '../state.js';
import { fixedValue, randomAggregateOperations, randomPipelineStepTypes } from '../engine.js';
import { ensureRandomKitInState } from '../rulePresetKits.js';
import { CalculationEditor } from './definition/CalculationEditor.jsx';
import { CalculationFields } from './definition/CalculationFields.jsx';
import { ComponentEditor } from './definition/ComponentEditor.jsx';
import { DefinitionEditor } from './DefinitionEditor.jsx';
import { RulePoolManager } from './RulePoolManager.jsx';
import { RandomKitManager } from './RandomKitManager.jsx';
import { ResultView } from './ResultView.jsx';
import { SourceManager } from './SourceManager.jsx';
import { CardSourceForm, UsePanel } from './UsePanel.jsx';

const actions = {
  clearHistory: () => {},
  deleteDefinition: () => true,
  resetCardSource: () => {},
  runDefinition: () => {},
  saveDefinition: (definition) => definition,
  deleteRandomKit: () => {},
  activateRandomKit: () => {},
  ensureRandomKit: () => {},
  loadRandomKit: () => {},
  saveRandomKit: (kit) => kit,
  selectResult: () => {},
  setDefinitionActive: () => {},
};

function combinationDefinitions() {
  const exposed = {
    id: 'combo-d20',
    name: 'Jet d20',
    kind: 'combination',
    exposed: true,
    active: true,
    components: [],
    options: [{
      id: 'combination',
      label: 'Mode',
      type: 'choice',
      defaultValue: 'normal',
      choices: [
        { value: 'normal', label: 'Normal' },
        { value: 'advantage', label: 'Avantage' },
      ],
    }],
    pipeline: [{
      id: 'combination',
      type: randomPipelineStepTypes.REPEAT_SELECT,
      optionId: 'combination',
      variants: {
        normal: { definitionId: 'combo-d20-normal' },
        advantage: { definitionId: 'combo-d20-advantage' },
      },
    }],
    primaryAggregateId: '',
  };
  const base = {
    id: 'combo-d20-normal',
    name: 'Base de Jet d20',
    kind: 'roll',
    exposed: false,
    active: false,
    components: [{ id: 'main', label: 'Jet', source: fixedValue('standard-d20'), count: fixedValue(1) }],
    pipeline: [{
      id: 'total',
      type: randomPipelineStepTypes.AGGREGATE,
      operation: randomAggregateOperations.SUM,
      outputId: 'total',
    }],
    primaryAggregateId: 'total',
  };
  const advantage = {
    ...base,
    id: 'combo-d20-advantage',
    name: 'Jet d20 - Avantage',
  };
  return [exposed, base, advantage];
}

describe('RandomSystem definition UI', () => {
  it('uses a dedicated editor for combined definitions', () => {
    const state = {
      ...createDefaultRandomSystemState(),
      definitions: combinationDefinitions(),
    };
    const html = renderToStaticMarkup(
      <DefinitionEditor
        definitions={state.definitions}
        sources={state.sources}
        rulePool={state.rulePool}
        actions={actions}
        onOpenResultOptions={() => {}}
      />,
    );

    expect(html).toContain('Tirage combiné');
    expect(html).toContain('Lancer associé');
    expect(html).toContain('Affichage du choix');
    expect(html).toContain('Monter Normal');
    expect(html).toContain('Choix par défaut : Normal');
    expect(html).toContain('Toujours exposé comme candidat actif');
    expect(html).toContain('Options de résultat');
    expect(html).not.toContain('Règle de combinaison');
    expect(html).not.toContain('Combiner plusieurs lancers');
  });

  it('does not list internal definitions in direct use', () => {
    const state = {
      ...createDefaultRandomSystemState(),
      definitions: combinationDefinitions(),
    };
    const html = renderToStaticMarkup(<UsePanel state={state} actions={actions} />);

    expect(html).toContain('Jet d20');
    expect(html).not.toContain('Base de Jet d20');
    expect(html).toContain('Cartes');
  });

  it('does not list exposed inactive definitions in direct use', () => {
    const state = ensureRandomKitInState(createDefaultRandomSystemState(), 'kit-d6-pool');
    const html = renderToStaticMarkup(
      <UsePanel
        state={{
          ...state,
          definitions: state.definitions.map((definition) => (
            definition.id === 'kit-d6-pool-successes'
              ? { ...definition, active: false }
              : definition
          )),
        }}
        actions={actions}
      />,
    );

    expect(html).not.toContain('Pool de d6');
    expect(html).toContain('d6 cumulés');
  });

  it('saves active rolls as a compact kit snapshot', () => {
    const state = ensureRandomKitInState(createDefaultRandomSystemState(), 'kit-d20-generic');
    const html = renderToStaticMarkup(<RandomKitManager state={state} actions={actions} />);

    expect(html).toContain('class="rs-kit-save-panel"');
    expect(html).toContain('actuellement actif');
    expect(html).toContain('Enregistrer l’ensemble');
    expect(html).not.toContain('rs-kit-included-rolls');
    expect(html).not.toContain('Tirages inclus');
    expect(html).toContain('class="small-btn rs-kit-load-btn"');
    expect(html).toContain('class="small-btn rs-kit-activate-btn"');
    expect(html).toContain('src="/branding/button-cadence-light.svg"');
    expect(html).toContain('src="/branding/button-cadence-dark.svg"');
    expect(html).toContain('class="rs-kit-list-group rs-kit-catalog"');
    expect(html).toContain('Prêts à l’emploi');
    expect(html).not.toContain('class="rs-kit-list-group rs-kit-catalog" open');
    expect(html).not.toContain('Exporter .cadlib');
    expect(html).not.toContain('Importer .cadlib');
  });

  it('provides standard card decks in the shared source editor and exposes the discard pile', () => {
    const state = createDefaultRandomSystemState();
    const cardSources = state.sources.filter((source) => source.kind === 'cards');
    const source = cardSources[0];
    const cardId = source.cards[0].id;
    const managerHtml = renderToStaticMarkup(
      <SourceManager
        sources={cardSources}
        definitions={state.definitions}
        actions={{
          deleteSource: () => {},
          saveSource: (saved) => saved,
        }}
      />,
    );
    const useHtml = renderToStaticMarkup(
      <CardSourceForm
        source={source}
        sourceState={{
          ...state.sourceStates[source.id],
          drawPile: state.sourceStates[source.id].drawPile.filter((id) => id !== cardId),
          discardPile: [cardId],
        }}
        actions={{
          drawCards: () => {},
          resetCardSource: () => {},
          returnCards: () => {},
        }}
      />,
    );

    expect(managerHtml).toContain('Jeu de 54 cartes');
    expect(managerHtml).toContain('Tarot français');
    expect(managerHtml).toContain('Nouveau paquet');
    expect(managerHtml).toContain('Image (facultative)');
    expect(useHtml).toContain('Défausse');
    expect(useHtml).toContain('Remettre');
    expect(useHtml).not.toContain('Cartes tirées');
    expect(useHtml).toContain('<details class="rs-discard-pile">');
    expect(useHtml).toContain('Défausse · 1');
    expect(useHtml).toContain('Tirage avec remise');
  });

  it('offers unified details for weighted sources and uniform faces', () => {
    const state = createDefaultRandomSystemState();
    const weatherSource = state.sources.find((source) => source.id === 'example-weather-d10');
    const html = renderToStaticMarkup(
      <SourceManager
        sources={[weatherSource]}
        definitions={state.definitions}
        actions={{
          deleteSource: () => {},
          saveSource: (source) => source,
        }}
      />,
    );

    expect(html).toContain('Nouvelle table');
    expect(html).toContain('Importer un CSV');
    expect(html).toContain('Décrire les faces');
    expect(html).toContain('Détails d’une face');
    expect(html).toContain('d10 Météo');
  });

  it('renders card visuals and comments', () => {
    const html = renderToStaticMarkup(<ResultView result={{
      id: 'critical-card',
      kind: 'card-draw',
      sourceId: 'critical-cards',
      sourceName: 'Critiques',
      rolledAt: 1,
      remaining: 4,
      cards: [{
        id: 'critical-1',
        label: 'Blessure au bras',
        symbol: '🩸',
        image: '',
        comment: 'Le personnage lâche ce qu’il tient.',
        markers: [],
      }],
    }} />);

    expect(html).toContain('<span class="rs-card-symbol" aria-hidden="true">🩸</span>');
    expect(html).toContain('Le personnage lâche ce qu’il tient.');
  });

  it('separates exposed and internal definitions and warns about unused internals', () => {
    const state = {
      ...createDefaultRandomSystemState(),
      definitions: combinationDefinitions(),
    };
    const orphan = {
      ...state.definitions.find((definition) => definition.kind === 'roll'),
      id: 'unused-internal',
      name: 'Lancer sans usage',
      exposed: false,
    };
    const html = renderToStaticMarkup(
      <DefinitionEditor
        definitions={[...state.definitions, orphan]}
        sources={state.sources}
        rulePool={state.rulePool}
        actions={actions}
      />,
    );

    expect(html).toContain('Tirages proposés à l’utilisateur');
    expect(html).toContain('Tirages utilisés en interne');
    expect(html).toContain('Ni exposé ni utilisé dans un lancer combiné');
    expect(html.match(/rs-definition-warning/g)).toHaveLength(1);
  });

  it('shows rule-enabled treatments directly and keeps unavailable ones in reserve', () => {
    const state = createDefaultRandomSystemState();
    const draft = createDefinitionDraft(state.sources, state.definitions);
    const html = renderToStaticMarkup(
      <CalculationEditor
        draft={draft}
        rulePool={{
          enabledRuleIds: [
            randomRuleIds.MODIFIERS,
            randomRuleIds.REROLLS,
            randomRuleIds.MARKERS,
          ],
        }}
        setDraft={() => {}}
      />,
    );

    const reserveIndex = html.indexOf('Autres traitements');
    expect(reserveIndex).toBeGreaterThan(-1);
    expect(html.indexOf('Marqueur')).toBeLessThan(reserveIndex);
    expect(html.indexOf('Valeur personnalisée')).toBeGreaterThan(reserveIndex);
  });

  it('hides defaults for values requested when rolling', () => {
    const state = createDefaultRandomSystemState();
    const draft = createDefinitionDraft(state.sources, state.definitions);
    const component = {
      ...draft.components[0],
      sourceMode: 'request',
      countMode: 'request',
    };
    const html = renderToStaticMarkup(
      <ComponentEditor
        component={component}
        index={0}
        sources={state.sources}
        canDelete={false}
        explosionAvailable
        rerollAvailable
        rulePool={state.rulePool}
        onChange={() => {}}
        onDelete={() => {}}
      />,
    );

    expect(html).not.toContain('standard-d4');
    expect(html).not.toContain('type="number"');
    expect(html).toContain('Relance');
    expect(html).toContain('rs-draw-treatment-toggles');
  });

  it('configures modifiers with a switch and no fixed value', () => {
    const state = createDefaultRandomSystemState();
    const calculation = {
      ...createDefinitionDraft(state.sources, state.definitions),
      modifierEnabled: true,
    };
    const html = renderToStaticMarkup(
      <CalculationFields
        calculation={calculation}
        onChange={() => {}}
        rulePool={state.rulePool}
      />,
    );

    expect(html).toContain('Demander un modificateur au lancer');
    expect(html).not.toContain('value="fixed"');
  });

  it('hides unnamed group headings while retaining their color accent', () => {
    const draw = {
      id: 'draw-1',
      componentId: 'anonymous',
      componentLabel: '',
      componentColor: '#e11d48',
      sourceName: 'd6',
      outcome: { label: '4', value: 4, symbol: '' },
      calculatedValue: 4,
      markers: [],
      kept: true,
      rerolled: false,
      chainIndex: 0,
    };
    const result = {
      id: 'result-1',
      kind: 'random-roll',
      definitionName: 'Sans groupe visible',
      rolledAt: 1,
      combined: false,
      selectedGroupIndex: 0,
      groups: [{ index: 0, selected: true, draws: [draw], aggregates: [] }],
      draws: [draw],
      aggregates: [],
      primaryAggregate: null,
    };
    const html = renderToStaticMarkup(<ResultView result={result} />);

    expect(html).not.toContain('<h4>');
    expect(html).toContain('--rs-group-color:#e11d48');
  });

  it('promotes a named numeric outcome and shows its symbol on the draw', () => {
    const draw = {
      id: 'weather-draw',
      componentId: 'weather',
      componentLabel: '',
      componentColor: '',
      sourceName: 'd10 Météo',
      outcome: {
        label: 'Bruine',
        value: 5,
        symbol: '☔',
        text: 'Une pluie fine réduit légèrement la visibilité.',
      },
      calculatedValue: 5,
      markers: [],
      kept: true,
      rerolled: false,
      chainIndex: 0,
    };
    const result = {
      id: 'weather-result',
      kind: 'random-roll',
      definitionName: 'Météo',
      rolledAt: 1,
      combined: false,
      selectedGroupIndex: 0,
      groups: [{ index: 0, selected: true, draws: [draw], aggregates: [] }],
      draws: [draw],
      aggregates: [{ id: 'total', label: 'Résultat', value: 5 }],
      primaryAggregate: { id: 'total', label: 'Résultat', value: 5 },
    };
    const html = renderToStaticMarkup(<ResultView result={result} />);

    expect(html).toContain('<div class="rs-primary-result"><span>Résultat</span><strong>Bruine</strong>');
    expect(html).toContain('<span class="rs-draw-chip" title="d10 Météo · Bruine"><strong>☔</strong>');
    expect(html).toContain('Une pluie fine réduit légèrement la visibilité.');
    expect(html).toContain('<div><span>Résultat</span><strong>5</strong></div>');
  });

  it('renders outcome images inside random draw chips', () => {
    const result = {
      id: 'image-result',
      kind: 'random-roll',
      definitionName: 'Table illustrée',
      rolledAt: 1,
      combined: false,
      selectedGroupIndex: 0,
      groups: [{
        index: 0,
        selected: true,
        aggregates: [],
        draws: [{
          id: 'image-draw',
          componentId: 'table',
          componentLabel: '',
          componentColor: '',
          sourceName: 'Table',
          outcome: {
            id: 'sun',
            label: 'Soleil',
            value: 'sun',
            symbol: '',
            image: 'https://example.com/sun.png',
            text: 'Temps clair.',
          },
          calculatedValue: 'sun',
          markers: [],
          kept: true,
          rerolled: false,
          chainIndex: 0,
        }],
      }],
      draws: [],
      aggregates: [],
      primaryAggregate: null,
    };
    const html = renderToStaticMarkup(<ResultView result={result} />);

    expect(html).toContain('class="rs-draw-chip-image"');
    expect(html).toContain('https://example.com/sun.png');
  });

  it('renders explanatory notes for available rules', () => {
    const state = createDefaultRandomSystemState();
    const html = renderToStaticMarkup(
      <RulePoolManager
        rulePool={state.rulePool}
        actions={{
          enableAllRules: () => {},
          setRuleEnabled: () => {},
          useEssentialRules: () => {},
        }}
      />,
    );

    expect(html).toContain('Ajoute ou retire des points fixes');
    expect(html).toContain('Refait les resultats');
  });

  it('does not repeat the result options title inside its dialog content', () => {
    const state = createDefaultRandomSystemState();
    const html = renderToStaticMarkup(
      <RulePoolManager
        embedded
        rulePool={state.rulePool}
        actions={{
          enableAllRules: () => {},
          setRuleEnabled: () => {},
          useEssentialRules: () => {},
        }}
      />,
    );

    expect(html).toContain('Choisis les comportements');
    expect(html).not.toContain('<h2>Options de résultat</h2>');
  });
});
