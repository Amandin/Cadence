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
