import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  buildRandomDefinition,
  builderExplosionModes,
  createDefinitionDraft,
} from '../../definitionBuilder.js';
import { randomRuleIds } from '../../rulePool.js';
import { createDefaultRandomSystemState } from '../../state.js';
import { fixedValue, randomAggregateOperations, randomPipelineStepTypes } from '../../engine.js';
import { ensureRandomKitInState } from '../../rulePresetKits.js';
import { createNoCodeExampleDraft } from '../../noCodeExamples.js';
import { compileRollCode } from '../../rollCode.js';
import { CalculationEditor } from '.././definition/CalculationEditor.jsx';
import { CalculationFields } from '.././definition/CalculationFields.jsx';
import { ComponentEditor } from '.././definition/ComponentEditor.jsx';
import { DefinitionEditor } from '.././DefinitionEditor.jsx';
import { RulePoolManager } from '.././RulePoolManager.jsx';
import { RandomKitManager } from '.././RandomKitManager.jsx';
import { ResultView } from '.././ResultView.jsx';
import { SourceManager } from '.././SourceManager.jsx';
import { CardSourceForm, UsePanel } from '.././UsePanel.jsx';

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
  it('shows controls for a recursively repeatable coded roll', () => {
    const baseState = createDefaultRandomSystemState();
    const definition = compileRollCode('number mod=0; 1d6+[mod]++', {
      id: 'recursive-damage',
      name: 'Dégâts',
      sources: baseState.sources,
    });
    const state = { ...baseState, definitions: [definition] };
    const html = renderToStaticMarkup(<UsePanel state={state} actions={actions} />);

    expect(html).toContain('Jet 1');
    expect(html).toContain('Ajouter un jet');
    expect(html).toContain('mod');
  });

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

  it('offers a genuinely essential no-code view before the complete toolbox', () => {
    const state = createDefaultRandomSystemState();
    const essentialHtml = renderToStaticMarkup(
      <DefinitionEditor
        definitions={[]}
        sources={state.sources.filter((source) => source.kind !== 'cards')}
        rulePool={state.rulePool}
        actions={actions}
        noCodeOnly
      />,
    );
    const fullHtml = renderToStaticMarkup(
      <DefinitionEditor
        definitions={[]}
        sources={state.sources.filter((source) => source.kind !== 'cards')}
        rulePool={state.rulePool}
        actions={actions}
        noCodeOnly
        initialNoCodeView="full"
      />,
    );

    expect(essentialHtml).toContain('Essentiel');
    expect(essentialHtml).toContain('Toutes les options');
    expect(essentialHtml).toContain('Partir d’un exemple');
    expect(essentialHtml).toContain('Daggerheart');
    expect(essentialHtml).toContain('PbtA · 2d6 + modificateur');
    expect(essentialHtml).not.toContain('<optgroup');
    expect(essentialHtml).not.toContain('Syntaxe experte');
    expect(essentialHtml).not.toContain('Compteurs de résultats');
    expect(essentialHtml).not.toContain('Options avancées');
    expect(essentialHtml).not.toContain('Image du lancer');
    expect(fullHtml).toContain('Compteurs de résultats');
    expect(fullHtml).toContain('Options avancées');
    expect(fullHtml).toContain('Image du lancer');
  });

  it('exposes no-code choices that can condition groups explosions and rerolls', () => {
    const state = createDefaultRandomSystemState();
    const draft = createDefinitionDraft(state.sources);
    draft.rollOptions = [{
      id: 'mode',
      label: 'Mode du jet',
      control: 'slider',
      defaultValue: 'standard',
      choices: [
        { value: 'standard', label: 'Standard' },
        { value: 'explosion', label: 'Explosion' },
        { value: 'reroll', label: 'Relance' },
      ],
    }];
    draft.components[0].enabledWhen = [{ optionId: 'mode', equals: 'standard' }];
    draft.components[0].explosionMode = builderExplosionModes.ALWAYS;
    draft.components[0].explosionEnabledWhen = [{ optionId: 'mode', equals: 'explosion' }];
    draft.components[0].reroll = {
      enabled: true,
      operator: 'eq',
      value: 1,
      maxIterations: 1,
      enabledWhen: [{ optionId: 'mode', equals: 'reroll' }],
    };
    const html = renderToStaticMarkup(
      <DefinitionEditor
        definitions={[buildRandomDefinition(draft)]}
        sources={state.sources.filter((source) => source.kind !== 'cards')}
        rulePool={state.rulePool}
        actions={actions}
        noCodeOnly
        initialNoCodeView="full"
      />,
    );

    expect(html).toContain('Choix proposés au lancer');
    expect(html).toContain('Mode du jet');
    expect(html).toContain('Utiliser ce groupe');
    expect(html).toContain('Activer l’explosion');
    expect(html).toContain('Activer la relance');
    expect(html).toContain('Dupliquer');
    expect(html).not.toContain('Syntaxe experte');
  });

  it('keeps Daggerheart subtraction editable after prefill', () => {
    const state = createDefaultRandomSystemState();
    const daggerheart = buildRandomDefinition(createNoCodeExampleDraft('daggerheart', state.sources));
    const html = renderToStaticMarkup(
      <DefinitionEditor
        definitions={[daggerheart]}
        sources={state.sources.filter((source) => source.kind !== 'cards')}
        rulePool={state.rulePool}
        actions={actions}
        noCodeOnly
        initialNoCodeView="full"
      />,
    );

    expect(html).toContain('Contribution au total');
    expect(html).toContain('Soustraire les résultats');
    expect(html).toContain('Dé de désavantage');
    expect(html).toContain('Dé d’Espoir');
    expect(html).toContain('Dé de Peur');
    expect(html).toContain('value="#2f8f83"');
    expect(html).toContain('value="#8b5cf6"');
  });

  it('keeps level 3 treatments out of no-code and exposes a level 2 section', () => {
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

    expect(html).toContain('Options avancées');
    expect(html).toContain('Relier le résultat à une table');
    expect(html).not.toContain('Bonus d’occurrence');
    expect(html).not.toContain('Valeur personnalisée');
  });

  it('shows proposed defaults for requested values and keeps the source itself hidden', () => {
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
    expect(html).toContain('Demander avec cette valeur proposée');
    expect(html).toContain('type="number"');
    expect(html).toContain('Relance');
    expect(html).toContain('rs-draw-treatment-toggles');
  });

  it('configures fixed, proposed or empty modifiers without code', () => {
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

    expect(html).toContain('Modificateur');
    expect(html).toContain('value="fixed"');
    expect(html).toContain('Demander sans valeur proposée');
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

});
