import { memo, useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import {
  combinationTargetDefinition,
  definitionCombination,
} from '../combinations.js';
import { activeDefinitions } from '../definitionAccess.js';
import { randomOptionTypes, randomParameterTypes, randomSourceKinds } from '../engine.js';
import { ChoiceOptionControl } from './ChoiceOptionControl.jsx';
import { HistoryPanel } from './HistoryPanel.jsx';
import { ResultView } from './ResultView.jsx';

const resourceKindMeta = {
  definitions: { icon: '✦', labelKey: 'random.resource.rolls' },
  cards: { icon: '♢', labelKey: 'random.resource.cards' },
};

function initialInputs(definition) {
  return {
    parameters: Object.fromEntries((definition?.parameters || []).map((parameter) => [parameter.id, parameter.defaultValue])),
    options: Object.fromEntries((definition?.options || []).map((option) => [option.id, option.defaultValue])),
  };
}

export const DefinitionForm = memo(function DefinitionForm({
  definition,
  definitions,
  sources,
  onRun,
  className = '',
  showHeader = true,
  runLabel = t('random.use.run'),
}) {
  const [inputs, setInputs] = useState(() => initialInputs(definition));
  const [error, setError] = useState('');
  const combination = useMemo(() => definitionCombination(definition), [definition]);
  const combinationValue = combination
    ? inputs.options[combination.option.id] ?? combination.option.defaultValue
    : undefined;
  const {
    targetDefinition,
    targetOptions,
    visibleOptions,
  } = useMemo(() => {
    const target = combinationTargetDefinition(
      definition,
      definitions,
      combination ? { [combination.option.id]: combinationValue } : {},
    );
    const nestedCombination = definitionCombination(target);
    const options = target.options.filter((option) => option.id !== nestedCombination?.option.id);
    return {
      targetDefinition: target,
      targetOptions: options,
      visibleOptions: combination
      ? [
        combination.option,
        ...options.filter((option) => option.id !== combination.option.id),
      ]
      : options,
    };
  }, [combination, combinationValue, definition, definitions]);

  useEffect(() => {
    setInputs(initialInputs(definition));
    setError('');
  }, [definition]);
  useEffect(() => {
    setInputs((current) => ({
      parameters: {
        ...current.parameters,
        ...Object.fromEntries(targetDefinition.parameters
          .filter((parameter) => !Object.prototype.hasOwnProperty.call(current.parameters, parameter.id))
          .map((parameter) => [parameter.id, parameter.defaultValue])),
      },
      options: {
        ...current.options,
        ...Object.fromEntries(targetOptions
          .filter((option) => !Object.prototype.hasOwnProperty.call(current.options, option.id))
          .map((option) => [option.id, option.defaultValue])),
      },
    }));
  }, [targetDefinition, targetOptions]);

  const setParameter = (id, value) => {
    setInputs((current) => ({ ...current, parameters: { ...current.parameters, [id]: value } }));
  };
  const setOption = (id, value) => {
    setInputs((current) => ({ ...current, options: { ...current.options, [id]: value } }));
  };
  const run = () => {
    try {
      setError('');
      onRun(definition.id, inputs.parameters, inputs.options);
    } catch (nextError) {
      setError(nextError?.message || t('random.error.generic'));
    }
  };

  return (
    <section className={`rs-use-form ${className}`}>
      {showHeader && <div className="rs-section-head">
        <div>
          <span className="rs-section-kicker">{t('random.resource.rolls')}</span>
          <div className="rs-heading-with-mark">
            <span className="rs-heading-mark" aria-hidden="true">✦</span>
            <h3>{definition.name}</h3>
          </div>
          {definition.note && <span>{definition.note}</span>}
        </div>
      </div>}
      <div className="rs-input-grid">
        {targetDefinition.parameters.map((parameter) => (
          <label className="field" key={parameter.id}>
            {parameter.label}
            {parameter.type === randomParameterTypes.SOURCE ? (
              <select value={inputs.parameters[parameter.id] ?? ''} onChange={(event) => setParameter(parameter.id, event.target.value)}>
                {sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
              </select>
            ) : (
              <input
                type={parameter.type === randomParameterTypes.TEXT ? 'text' : 'number'}
                min={parameter.min}
                max={parameter.max}
                value={inputs.parameters[parameter.id] ?? ''}
                onChange={(event) => setParameter(parameter.id, event.target.value)}
              />
            )}
          </label>
        ))}
        {visibleOptions.map((option) => (
          option.type === randomOptionTypes.CHOICE ? (
            <ChoiceOptionControl
              option={option}
              value={inputs.options[option.id]}
              onChange={(value) => setOption(option.id, value)}
              key={option.id}
            />
          ) : (
            <label className={`global-switch rs-option-toggle ${inputs.options[option.id] ? 'active' : ''}`} key={option.id}>
              <span>{option.label}</span>
              <input type="checkbox" checked={!!inputs.options[option.id]} onChange={(event) => setOption(option.id, event.target.checked)} />
            </label>
          )
        ))}
      </div>
      {error && <p className="rs-error" role="alert">{error}</p>}
      <button type="button" className="primary rs-run-button" onClick={run}>{runLabel}</button>
    </section>
  );
});

export function CardSourceForm({ source, sourceState, actions }) {
  const [count, setCount] = useState(1);
  const [drawMode, setDrawMode] = useState('draw');
  const [error, setError] = useState('');
  const discardedCards = useMemo(() => {
    const cardMap = new Map(source.cards.map((card) => [card.id, card]));
    return (sourceState?.discardPile || []).map((id) => cardMap.get(id)).filter(Boolean);
  }, [source.cards, sourceState?.discardPile]);
  const runSafely = (operation) => {
    try {
      setError('');
      operation();
    } catch (nextError) {
      setError(nextError?.message || t('random.error.generic'));
    }
  };

  return (
    <section className="rs-use-form">
      <div className="rs-section-head">
        <div>
          <span className="rs-section-kicker">{t('random.resource.cards')}</span>
          <div className="rs-heading-with-mark">
            <span className="rs-heading-mark" aria-hidden="true">♢</span>
            <h3>{source.name}</h3>
          </div>
          {source.note && <span>{source.note}</span>}
          <small>{t('random.deck.remaining', { count: sourceState?.drawPile.length || 0 })}</small>
        </div>
        <button type="button" className="small-btn" onClick={() => runSafely(() => actions.resetCardSource(source.id))}>{t('random.deck.shuffle')}</button>
      </div>
      <div className="rs-segmented rs-card-draw-modes" aria-label={t('random.cards.drawMode')}>
        <button type="button" className={drawMode === 'draw' ? 'selected' : ''} onClick={() => setDrawMode('draw')}>{t('random.cards.draw')}</button>
        <button type="button" className={drawMode === 'replacement' ? 'selected' : ''} onClick={() => setDrawMode('replacement')}>{t('random.cards.replacement')}</button>
      </div>
      <label className="field rs-draw-count">
        {t('random.deck.drawCount')}
        <input type="number" min="1" max="100" value={count} onChange={(event) => setCount(event.target.value)} />
      </label>
      {error && <p className="rs-error" role="alert">{error}</p>}
      <button type="button" className="primary rs-run-button" onClick={() => runSafely(() => actions.drawCards(source.id, count, drawMode))}>
        {t('random.deck.draw')}
      </button>
      <details className="rs-discard-pile">
        <summary>{t('random.deck.discardSummary', { count: discardedCards.length })}</summary>
        {discardedCards.length > 0 && (
          <div className="rs-hand">
            {discardedCards.map((card) => (
              <div key={card.id}>
                <span>{card.symbol && <b aria-hidden="true">{card.symbol}</b>}{card.label}</span>
                <span>
                  <button type="button" className="small-btn" onClick={() => runSafely(() => actions.returnCards(source.id, [card.id]))}>{t('random.deck.return')}</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </details>
    </section>
  );
}

export function UsePanel({ state, actions }) {
  const activeRollDefinitions = useMemo(
    () => activeDefinitions(state.definitions),
    [state.definitions],
  );
  const [resourceKind, setResourceKind] = useState('definitions');
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(activeRollDefinitions[0]?.id || '');
  const cardSources = useMemo(
    () => state.sources.filter((source) => source.kind === randomSourceKinds.CARDS),
    [state.sources],
  );
  const randomSources = useMemo(
    () => state.sources.filter((source) => source.kind !== randomSourceKinds.CARDS),
    [state.sources],
  );
  const [selectedCardSourceId, setSelectedCardSourceId] = useState(cardSources[0]?.id || '');
  const selectedDefinition = activeRollDefinitions.find((item) => item.id === selectedDefinitionId)
    || activeRollDefinitions[0];
  const selectedCardSource = cardSources.find((item) => item.id === selectedCardSourceId)
    || cardSources[0];

  useEffect(() => {
    if (!selectedDefinition && activeRollDefinitions[0]) setSelectedDefinitionId(activeRollDefinitions[0].id);
  }, [activeRollDefinitions, selectedDefinition]);
  useEffect(() => {
    if (!selectedCardSource && cardSources[0]) setSelectedCardSourceId(cardSources[0].id);
  }, [cardSources, selectedCardSource]);

  const resources = resourceKind === 'definitions' ? activeRollDefinitions : cardSources;
  const selectedId = resourceKind === 'definitions' ? selectedDefinition?.id : selectedCardSource?.id;

  return (
    <div className="rs-use-layout">
      <aside className="rs-resource-picker">
        <div className="rs-segmented">
          <button type="button" className={resourceKind === 'definitions' ? 'selected' : ''} onClick={() => setResourceKind('definitions')}><span aria-hidden="true">{resourceKindMeta.definitions.icon}</span><span>{t(resourceKindMeta.definitions.labelKey)}</span></button>
          {cardSources.length > 0 && <button type="button" className={resourceKind === 'cards' ? 'selected' : ''} onClick={() => setResourceKind('cards')}><span aria-hidden="true">{resourceKindMeta.cards.icon}</span><span>{t(resourceKindMeta.cards.labelKey)}</span></button>}
        </div>
        <div className="rs-resource-list">
          {resources.map((resource) => (
            <button
              type="button"
              className={resource.id === selectedId ? 'selected' : ''}
              onClick={() => resourceKind === 'definitions' ? setSelectedDefinitionId(resource.id) : setSelectedCardSourceId(resource.id)}
              key={resource.id}
            >
              <span className="rs-resource-title">
                <span aria-hidden="true">{resourceKindMeta[resourceKind].icon}</span>
                <span>{resource.name}</span>
              </span>
              {resource.note && <small>{resource.note}</small>}
            </button>
          ))}
          {!resources.length && <p className="muted">{t('random.use.noResource')}</p>}
        </div>
      </aside>

      <div className="rs-use-main">
        {resourceKind === 'definitions' && selectedDefinition && (
          <DefinitionForm
            definition={selectedDefinition}
            definitions={state.definitions}
            sources={randomSources}
            onRun={actions.runDefinition}
          />
        )}
        {resourceKind === 'cards' && selectedCardSource && (
          <CardSourceForm
            source={selectedCardSource}
            sourceState={state.sourceStates[selectedCardSource.id]}
            actions={actions}
          />
        )}
        <ResultView result={state.lastResult} />
      </div>

      <HistoryPanel history={state.history} onSelect={actions.selectResult} onClear={actions.clearHistory} />
    </div>
  );
}
