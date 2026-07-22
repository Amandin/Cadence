import { memo, useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import {
  combinationTargetDefinition,
  definitionCombination,
} from '../combinations.js';
import { activeDefinitions, exposedTokenContainers } from '../definitionAccess.js';
import { randomOptionTypes, randomParameterTypes, randomSourceKinds } from '../engine.js';
import {
  defaultQuickModifiers,
  newDrawAnimationIds,
  quickParameterComparator,
  readQuickRollMemory,
  settleOptionalDecisions,
  writeQuickRollMemory,
} from '../quickRollSupport.js';
import { ChoiceOptionControl } from './ChoiceOptionControl.jsx';
import { DefinitionVisual } from './DefinitionVisual.jsx';
import { HistoryPanel } from './HistoryPanel.jsx';
import { RandomIcon } from './RandomIcons.jsx';
import { ResultView } from './ResultView.jsx';
import { TokenContainerForm } from './TokenContainerForm.jsx';
import { QuickRollResult, SupplementalDiceRoller } from '../../interface/dialogues/FenetreLancerDes.jsx';
import '../styles/base.css';
import '../styles/choice-controls.css';
import '../styles/results.css';
import '../styles/tokens.css';

const resourceKindMeta = {
  definitions: { icon: 'roll', labelKey: 'random.resource.rolls' },
  cards: { icon: 'cards', labelKey: 'random.resource.cards' },
  tokens: { icon: 'roll', labelKey: 'random.tokens.containers' },
};
const emptyInputs = Object.freeze({});

function isCardDefinition(definition, cardSourceIds) {
  if (cardSourceIds.has(definition.sourceId)) return true;
  const components = definition.components || [];
  return components.length > 0 && components.every((component) => (
    component.sourceKind === 'cards'
    || (component.source?.kind === 'fixed' && cardSourceIds.has(component.source.value))
  ));
}

function ResourceList({ resources, resourceKind, selectedId, onSelect }) {
  const categories = [
    {
      id: 'available',
      title: t('random.use.categoryAvailable'),
      resources: resources.filter((resource) => resource.available !== false),
    },
    {
      id: 'inactive',
      title: t('random.use.categoryInactive'),
      resources: resources.filter((resource) => resource.available === false),
    },
  ].filter((category) => category.resources.length > 0);

  if (!categories.length) return <p className="muted">{t('random.use.noResource')}</p>;

  return categories.map((category) => (
    <section className="rs-resource-category" key={category.id}>
      <h4>{category.title}<small>{category.resources.length}</small></h4>
      {category.resources.map((resource) => (
        <button
          type="button"
          className={resource.id === selectedId ? 'selected' : ''}
          onClick={() => onSelect(resource.id)}
          disabled={resource.available === false}
          key={resource.id}
        >
          <span className="rs-resource-title">
            {resourceKind === 'definitions'
              ? <DefinitionVisual visualId={resource.visualId} className="compact" decorative />
              : <span aria-hidden="true"><RandomIcon name={resourceKindMeta[resourceKind].icon} /></span>}
            <span>{resource.name}</span>
          </span>
          {resource.note && <small>{resource.note}</small>}
        </button>
      ))}
    </section>
  ));
}

function initialInputs(definition, { parameters = {}, options = {} } = {}) {
  return {
    parameters: Object.fromEntries((definition?.parameters || []).map((parameter) => [parameter.id, parameters[parameter.id] ?? parameter.defaultValue])),
    options: Object.fromEntries((definition?.options || []).map((option) => [option.id, options[option.id] ?? option.defaultValue])),
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
  initialParameters = emptyInputs,
  initialOptions = emptyInputs,
  onInputsChange,
  onResult,
  hideRun = false,
  runAccessory = null,
  parameterComparator,
}) {
  const [inputs, setInputs] = useState(() => initialInputs(definition, { parameters: initialParameters, options: initialOptions }));
  const [additionalInputs, setAdditionalInputs] = useState([]);
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
    setInputs(initialInputs(definition, { parameters: initialParameters, options: initialOptions }));
    setAdditionalInputs([]);
    setError('');
  }, [definition, initialOptions, initialParameters]);
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

  const setParameter = (instanceIndex, id, value) => {
    const update = (current) => ({
      ...current,
      parameters: { ...current.parameters, [id]: value },
    });
    if (instanceIndex === 0) {
      setInputs((current) => {
        const next = update(current);
        onInputsChange?.(next);
        return next;
      });
      return;
    }
    setAdditionalInputs((current) => current.map((item, index) => (
      index === instanceIndex - 1 ? update(item) : item
    )));
  };
  const setOption = (instanceIndex, id, value) => {
    const update = (current) => ({
      ...current,
      options: { ...current.options, [id]: value },
    });
    if (instanceIndex === 0) {
      setInputs((current) => {
        const next = update(current);
        onInputsChange?.(next);
        return next;
      });
      return;
    }
    setAdditionalInputs((current) => current.map((item, index) => (
      index === instanceIndex - 1 ? update(item) : item
    )));
  };
  const inputInstances = definition.recursive ? [inputs, ...additionalInputs] : [inputs];
  const visibleParameters = useMemo(() => (
    parameterComparator
      ? [...targetDefinition.parameters].sort(parameterComparator)
      : targetDefinition.parameters
  ), [parameterComparator, targetDefinition.parameters]);
  const run = () => {
    try {
      setError('');
      const result = onRun(
        definition.id,
        inputs.parameters,
        inputs.options,
        definition.recursive ? inputInstances : undefined,
      );
      onResult?.(result);
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
            <DefinitionVisual visualId={definition.visualId} decorative />
            <h3>{definition.name}</h3>
          </div>
          {definition.note && <span>{definition.note}</span>}
        </div>
      </div>}
      <div className={definition.recursive ? 'rs-recursive-inputs' : ''}>
        {inputInstances.map((instanceInputs, instanceIndex) => (
          <section className={definition.recursive ? 'rs-recursive-instance' : ''} key={instanceIndex}>
            {definition.recursive && (
              <div className="rs-recursive-instance-head">
                <strong>{t('random.use.recursive.instance', { index: instanceIndex + 1 })}</strong>
                {instanceIndex > 0 && (
                  <button
                    type="button"
                    className="small-btn"
                    onClick={() => setAdditionalInputs((current) => current.filter((_, index) => index !== instanceIndex - 1))}
                  >
                    {t('random.use.recursive.remove')}
                  </button>
                )}
              </div>
            )}
            <div className={`rs-input-grid rs-input-count-${Math.min(4, visibleParameters.length)}`}>
              {visibleParameters.map((parameter) => (
                <label className="field" key={parameter.id}>
                  {parameter.label}
                  {parameter.type === randomParameterTypes.SOURCE ? (
                    <select value={instanceInputs.parameters[parameter.id] ?? ''} onChange={(event) => setParameter(instanceIndex, parameter.id, event.target.value)}>
                      {sources
                        .filter((source) => {
                          if (parameter.choices?.length && !parameter.choices.includes(source.id)) return false;
                          const usages = targetDefinition.components.filter((component) => component.source?.parameterId === parameter.id);
                          if (!usages.length) return true;
                          const acceptsCards = usages.some((component) => component.sourceKind === 'cards');
                          const acceptsRandom = usages.some((component) => component.sourceKind !== 'cards');
                          return (source.kind === randomSourceKinds.CARDS && acceptsCards)
                            || (source.kind !== randomSourceKinds.CARDS && acceptsRandom);
                        })
                        .map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
                    </select>
                  ) : (
                    <input
                      type={parameter.type === randomParameterTypes.TEXT ? 'text' : 'number'}
                      min={parameter.min}
                      max={parameter.max}
                      value={instanceInputs.parameters[parameter.id] ?? ''}
                      onChange={(event) => setParameter(instanceIndex, parameter.id, event.target.value)}
                    />
                  )}
                </label>
              ))}
              {visibleOptions.map((option) => (
                option.type === randomOptionTypes.CHOICE ? (
                  <ChoiceOptionControl
                    option={option}
                    value={instanceInputs.options[option.id]}
                    onChange={(value) => setOption(instanceIndex, option.id, value)}
                    key={option.id}
                  />
                ) : (
                  <label className={`global-switch rs-option-toggle ${instanceInputs.options[option.id] ? 'active' : ''}`} key={option.id}>
                    <span>{option.label}</span>
                    <input type="checkbox" checked={!!instanceInputs.options[option.id]} onChange={(event) => setOption(instanceIndex, option.id, event.target.checked)} />
                  </label>
                )
              ))}
            </div>
          </section>
        ))}
      </div>
      {definition.recursive && additionalInputs.length < 19 && (
        <button
          type="button"
          className="small-btn rs-add-recursive-instance"
          onClick={() => setAdditionalInputs((current) => [...current, initialInputs(targetDefinition)])}
        >
          {t('random.use.recursive.add')}
        </button>
      )}
      {error && <p className="rs-error" role="alert">{error}</p>}
      {!hideRun && <div className="rs-run-actions"><button type="button" className="primary rs-run-button" onClick={run}>{runLabel}</button>{runAccessory}</div>}
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
            <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="cards" /></span>
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

export function UsePanel({ state, actions, resourcePickerAccessory = null }) {
  const cardSourceIds = useMemo(
    () => new Set((state.sources || []).filter((source) => source.kind === randomSourceKinds.CARDS).map((source) => source.id)),
    [state.sources],
  );
  const activeRollDefinitions = useMemo(() => {
    return activeDefinitions(state.definitions)
      .filter((definition) => !isCardDefinition(definition, cardSourceIds))
      .map((definition) => ({ ...definition, available: true }));
  }, [cardSourceIds, state.definitions]);
  const [pendingResult, setPendingResult] = useState(null);
  const [lastQuickRoll] = useState(readQuickRollMemory);
  const [selectedDefinitionId, setSelectedDefinitionId] = useState(activeRollDefinitions[0]?.id || '');
  const cardSources = useMemo(() => {
    return (state.sources || [])
      .filter((source) => source.kind === randomSourceKinds.CARDS)
      .map((source) => {
        const linkedDefinitions = state.definitions.filter((definition) => (
          definition.sourceId === source.id || isCardDefinition(definition, new Set([source.id]))
        ));
        return {
          ...source,
          available: !linkedDefinitions.length || linkedDefinitions.some((definition) => definition.active !== false),
        };
      })
      .filter((source) => source.available);
  }, [state.definitions, state.sources]);
  const [resourceKind, setResourceKind] = useState(() => (
    activeRollDefinitions.some((definition) => definition.available !== false)
      ? 'definitions'
      : cardSources.some((source) => source.available !== false) ? 'cards' : 'definitions'
  ));
  const [selectedCardSourceId, setSelectedCardSourceId] = useState(cardSources[0]?.id || '');
  const tokenContainers = exposedTokenContainers(state.tokenContainers);
  const [selectedTokenContainerId, setSelectedTokenContainerId] = useState(tokenContainers[0]?.id || '');
  const availableRollDefinitions = activeRollDefinitions.filter((definition) => definition.available !== false);
  const availableCardSources = cardSources.filter((source) => source.available !== false);
  const selectedDefinition = availableRollDefinitions.find((item) => item.id === selectedDefinitionId)
    || availableRollDefinitions[0];
  const selectedCardSource = availableCardSources.find((item) => item.id === selectedCardSourceId)
    || availableCardSources[0];
  const selectedTokenContainer = tokenContainers.find((item) => item.id === selectedTokenContainerId) || tokenContainers[0];
  const hubInitialInputs = useMemo(() => (
    lastQuickRoll && selectedDefinition?.id === lastQuickRoll.selectedId
      ? lastQuickRoll.inputs || { parameters: {}, options: {} }
      : { parameters: {}, options: {} }
  ), [lastQuickRoll, selectedDefinition?.id]);

  useEffect(() => {
    if (!selectedDefinition && availableRollDefinitions[0]) setSelectedDefinitionId(availableRollDefinitions[0].id);
  }, [availableRollDefinitions, selectedDefinition]);
  useEffect(() => {
    if (!selectedCardSource && availableCardSources[0]) setSelectedCardSourceId(availableCardSources[0].id);
  }, [availableCardSources, selectedCardSource]);
  useEffect(() => {
    if (resourceKind === 'definitions' && !availableRollDefinitions.length && availableCardSources.length) setResourceKind('cards');
    if (resourceKind === 'cards' && !availableCardSources.length && availableRollDefinitions.length) setResourceKind('definitions');
  }, [availableCardSources.length, availableRollDefinitions.length, resourceKind]);
  useEffect(() => {
    if (!selectedTokenContainer && tokenContainers[0]) setSelectedTokenContainerId(tokenContainers[0].id);
  }, [selectedTokenContainer, tokenContainers]);
  useEffect(() => {
    setPendingResult(null);
  }, [resourceKind, selectedDefinition?.id, selectedCardSource?.id, selectedTokenContainer?.id]);

  const resources = resourceKind === 'definitions' ? activeRollDefinitions : resourceKind === 'cards' ? cardSources : tokenContainers;
  const selectedId = resourceKind === 'definitions' ? selectedDefinition?.id : resourceKind === 'cards' ? selectedCardSource?.id : selectedTokenContainer?.id;
  const settleHubOptionalDecisions = (initialResult) => (
    settleOptionalDecisions(initialResult, actions.resolveDefinitionDecision)
  );
  const resolveDecision = (accepted) => {
    const result = actions.resolveDefinitionDecision?.(pendingResult, accepted);
    setPendingResult(result?.kind === 'random-decision' ? result : null);
  };
  const activateOptionalDecision = (decision) => {
    const next = settleHubOptionalDecisions(actions.resolveDefinitionDecision?.(decision, true));
    if (next?.kind !== 'random-roll') {
      setPendingResult(next || null);
      return;
    }
    setPendingResult({
      ...next,
      animationDrawIds: newDrawAnimationIds(next, pendingResult || state.lastResult),
    });
  };
  const displayedResult = pendingResult || state.lastResult;
  const runHubDefinition = (definitionId, parameters, options, instances) => {
    const definition = state.definitions.find((item) => item.id === definitionId);
    const normalizedParameters = defaultQuickModifiers(definition, parameters);
    writeQuickRollMemory({ selectedId: definitionId, inputs: { parameters: normalizedParameters, options } });
    return actions.runDefinition(definitionId, normalizedParameters, options, instances, { id: 'hub', label: 'Hub' });
  };
  const rememberHubInputs = (inputs) => {
    if (!selectedDefinition) return;
    writeQuickRollMemory({ selectedId: selectedDefinition.id, inputs });
  };

  return (
    <div className="rs-use-layout">
      <aside className="rs-resource-picker">
        <div className="rs-resource-picker-head">
          <div className="rs-segmented">
            <button type="button" className={resourceKind === 'definitions' ? 'selected' : ''} onClick={() => setResourceKind('definitions')}><span aria-hidden="true"><RandomIcon name={resourceKindMeta.definitions.icon} /></span><span>{t(resourceKindMeta.definitions.labelKey)}</span></button>
            {cardSources.length > 0 && <button type="button" className={resourceKind === 'cards' ? 'selected' : ''} onClick={() => setResourceKind('cards')}><span aria-hidden="true"><RandomIcon name={resourceKindMeta.cards.icon} /></span><span>{t(resourceKindMeta.cards.labelKey)}</span></button>}
            {tokenContainers.length > 0 && <button type="button" className={resourceKind === 'tokens' ? 'selected' : ''} onClick={() => setResourceKind('tokens')}><span aria-hidden="true"><RandomIcon name={resourceKindMeta.tokens.icon} /></span><span>{t(resourceKindMeta.tokens.labelKey)}</span></button>}
            {resourcePickerAccessory && <span className="rs-resource-picker-accessory">{resourcePickerAccessory}</span>}
          </div>
        </div>
        <div className="rs-resource-list">
          <ResourceList
            resources={resources}
            resourceKind={resourceKind}
            selectedId={selectedId}
            onSelect={(id) => {
              if (resourceKind === 'definitions') setSelectedDefinitionId(id);
              else if (resourceKind === 'cards') setSelectedCardSourceId(id);
              else setSelectedTokenContainerId(id);
            }}
          />
        </div>
      </aside>

      <div className="rs-use-main">
        {resourceKind === 'definitions' && selectedDefinition && (
          <DefinitionForm
            definition={selectedDefinition}
            definitions={state.definitions}
            sources={state.sources}
            onRun={runHubDefinition}
            initialParameters={hubInitialInputs.parameters}
            initialOptions={hubInitialInputs.options}
            onInputsChange={rememberHubInputs}
            parameterComparator={quickParameterComparator}
            onResult={(result) => setPendingResult(settleHubOptionalDecisions(result) || null)}
          />
        )}
        {resourceKind === 'cards' && selectedCardSource && (
          <CardSourceForm
            source={selectedCardSource}
            sourceState={state.sourceStates[selectedCardSource.id]}
            actions={actions}
          />
        )}
        {resourceKind === 'tokens' && selectedTokenContainer && <TokenContainerForm container={selectedTokenContainer} containers={tokenContainers} tokenTypes={state.tokenTypes || []} actions={actions} result={state.lastResult} />}
        {resourceKind !== 'tokens' && <ResultView
          result={displayedResult}
          onDecision={displayedResult?.kind === 'random-decision' ? resolveDecision : undefined}
          quickResult={displayedResult?.kind === 'random-roll' ? <QuickRollResult result={displayedResult} onOptionalDecision={activateOptionalDecision} /> : null}
        />}
        {resourceKind !== 'tokens' && displayedResult?.kind === 'random-roll' && <SupplementalDiceRoller
          sources={state.sources}
          preferredSourceId={displayedResult.draws?.[0]?.sourceId}
          resetKey={displayedResult.id}
          onRun={(definition) => actions.runAdHocDefinition?.(definition, {}, {}, undefined, { id: 'hub', label: 'Hub' })}
        />}
      </div>

      <HistoryPanel history={state.history} onSelect={actions.selectResult} onClear={actions.clearHistory} />
    </div>
  );
}
