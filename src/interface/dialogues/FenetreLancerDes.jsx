import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import {
  activeDefinitions,
  exposedTokenContainers,
  quickDefinitions,
  quickTokenContainers,
  tokenContainerIdFromResourceId,
  tokenContainerResourceId,
} from '../../random-system/definitionAccess.js';
import { compileRollCode } from '../../random-system/rollCode.js';
import { definitionToRollCode } from '../../random-system/definitionRollCode.js';
import { DefinitionVisual } from '../../random-system/ui/DefinitionVisual.jsx';
import { DefinitionForm } from '../../random-system/ui/UsePanel.jsx';
import { TokenContainerForm } from '../../random-system/ui/TokenContainerForm.jsx';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import '../../random-system/styles/choice-controls.css';
import '../../random-system/styles/tokens.css';
import './FenetreLancerDes.css';

const QUICK_ROLL_MEMORY_KEY = 'cadence:quick-roll:last:v1';

function readQuickRollMemory() {
  try {
    const value = JSON.parse(window.localStorage.getItem(QUICK_ROLL_MEMORY_KEY) || 'null');
    return value && typeof value === 'object' ? value : null;
  } catch {
    return null;
  }
}

function writeQuickRollMemory(value) {
  try {
    window.localStorage.setItem(QUICK_ROLL_MEMORY_KEY, JSON.stringify(value));
  } catch {
    // La mémorisation du lanceur est optionnelle si le stockage est indisponible.
  }
}

function modifierParameterIds(definition = {}) {
  return ((definition || {}).parameters || [])
    .filter((parameter) => parameter.id === 'modifier' || /modificateur/i.test(parameter.label || ''))
    .map((parameter) => parameter.id);
}

function quickParameterRank(parameter = {}) {
  const description = `${parameter.id || ''} ${parameter.label || ''}`.toLocaleLowerCase('fr');
  if (/keep.*count|count.*keep|résultats? gardés?|dés? gardés?/.test(description)) return 3;
  if (parameter.id === 'modifier' || /modificateur/.test(description)) return 4;
  if (parameter.type === 'source') return 2;
  if (/count|quantité|nombre|dés? lancés?/.test(description)) return 1;
  return 3;
}

function quickParameterComparator(left, right) {
  return quickParameterRank(left) - quickParameterRank(right);
}

function drawValue(draw = {}) {
  return draw.outcome?.symbol || draw.outcome?.label || draw.calculatedValue;
}

function resultDice(result = {}) {
  const groups = Array.isArray(result.groups) ? result.groups : [];
  if (!result.combined && groups.length > 1) {
    return groups.map((group) => ({
      id: `group-${group.index}`,
      kept: !!group.selected,
      values: (group.draws || []).filter((draw) => !draw.rerolled).map(drawValue),
    }));
  }
  const draws = (result.draws || groups[0]?.draws || []).filter((draw) => !draw.rerolled);
  const hasDiscarded = draws.some((draw) => draw.kept === false);
  return draws.map((draw) => ({
    id: draw.id,
    kept: hasDiscarded ? draw.kept !== false : null,
    values: [drawValue(draw)],
  }));
}

function signedValue(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? `+${number}` : String(value ?? '');
}

function aggregateValue(value) {
  if (!Array.isArray(value)) return String(value ?? '-');
  return value.map((item) => item?.label || item?.symbol || item?.value || item).join(', ');
}

function fallbackResultValue(result = {}) {
  const draws = (result.draws || result.groups?.[result.selectedGroupIndex]?.draws || result.groups?.[0]?.draws || [])
    .filter((draw) => !draw.rerolled && draw.kept !== false);
  const values = draws.map(drawValue);
  return values.length === 1 ? values[0] : values;
}

function DeResultatAnime({ values, delay = 0, className = '' }) {
  const [rolling, setRolling] = useState(true);
  const [displayed, setDisplayed] = useState(() => values.map(() => '·'));
  useEffect(() => {
    const interval = window.setInterval(() => setDisplayed(values.map((value) => {
      const maximum = Math.max(2, Number(value) || 20);
      return String(1 + Math.floor(Math.random() * maximum));
    })), 65);
    const timeout = window.setTimeout(() => {
      window.clearInterval(interval);
      setDisplayed(values);
      setRolling(false);
    }, 700 + delay);
    return () => { window.clearInterval(interval); window.clearTimeout(timeout); };
  }, [delay, values]);
  return <div className={`quick-roll-die ${className} ${rolling ? 'is-rolling' : ''}`}>{displayed.map((value, index) => <strong key={index}>{String(value)}</strong>)}</div>;
}

function TotalAnime({ aggregate, diceCount }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), 500 + Math.max(0, diceCount - 1) * 90);
    return () => window.clearTimeout(timer);
  }, [diceCount]);
  return <div className={`quick-roll-total ${visible ? 'is-revealed' : ''}`}>
    <span>{t('random.result.title')}</span>
    <strong>{aggregateValue(aggregate?.value)}</strong>
  </div>;
}

function ResultatDefilant() {
  const [values, setValues] = useState(() => [0, 0, 0]);
  useEffect(() => {
    const timer = window.setInterval(() => setValues(Array.from({ length: 3 }, () => Math.floor(Math.random() * 10))), 70);
    return () => window.clearInterval(timer);
  }, []);
  return <section className="quick-roll-result quick-roll-rolling" aria-live="polite"><span>{t('random.use.run')}</span><div className="quick-roll-slot-values">{values.map((value, index) => <strong key={index}>{value}</strong>)}</div></section>;
}

export function QuickRollResult({ result, rolling = false, onDecision }) {
  if (rolling) return <ResultatDefilant />;
  if (!result) return null;
  if (result.kind === 'card-draw') {
    return <section className="quick-roll-result quick-card-result" aria-live="polite">
      <div className="quick-card-result-head"><strong>{result.sourceName}</strong><span>{t('random.result.cardsRemaining', { count: result.remaining })}</span></div>
      <div className="quick-card-result-list">
        {(result.cards || []).map((card, index) => <article key={`${card.id}-${index}`}>
          {card.image ? <img src={card.image} alt="" /> : card.symbol ? <span aria-hidden="true">{card.symbol}</span> : null}
          <strong>{card.label}</strong>
          {card.comment && <small>{card.comment}</small>}
        </article>)}
        {!result.cards?.length && <p className="muted">{t('random.result.deckEmpty')}</p>}
      </div>
    </section>;
  }
  if (result.kind === 'token-draw') {
    return <section className="quick-roll-result quick-token-result" aria-live="polite">
      <div className="quick-card-result-head"><strong>{result.definitionName}</strong><span>{result.sourceName}</span></div>
      <div className="quick-token-result-list">
        {(result.tokens || []).map((token, index) => <article className={token.kept ? 'is-kept' : 'is-returned'} key={`${token.typeId}-${index}`}>
          <span className="quick-token-mark" style={token.appearance?.color ? { backgroundColor: token.appearance.color } : undefined} aria-hidden="true">
            {token.appearance?.image ? <img src={token.appearance.image} alt="" /> : token.appearance?.symbol}
          </span>
          <span><strong>{token.name}</strong><small>{token.destinationName}</small></span>
        </article>)}
      </div>
    </section>;
  }
  if (result.kind === 'random-decision') {
    const matching = new Set(result.pendingDecision?.matchingDrawIds || []);
    return <section className="quick-roll-result" aria-live="polite">
      <span>{t('random.decision.afterRoll')}</span>
      <strong>{result.pendingDecision?.label}</strong>
      <div className="quick-roll-dice">{result.draws.filter((draw) => matching.has(draw.id)).map((draw) => <div className="quick-roll-die" key={draw.id}><strong>{drawValue(draw)}</strong></div>)}</div>
      {onDecision && <div className="rs-decision-actions"><button type="button" className="primary" onClick={() => onDecision(true)}>{t('random.decision.accept')}</button><button type="button" className="small-btn" onClick={() => onDecision(false)}>{t('random.decision.decline')}</button></div>}
    </section>;
  }
  const aggregate = result.primaryAggregate;
  const dice = resultDice(result);
  return (
    <section className="quick-roll-result" aria-live="polite">
      {dice.length > 0 && (
        <div className="quick-roll-dice">
          {dice.map((die, index) => {
            const stateClass = die.kept === true ? 'is-kept' : die.kept === false ? 'is-discarded' : '';
            const stateLabel = die.kept === true
              ? t('random.quick.kept')
              : die.kept === false
                ? t('random.quick.discarded')
                : '';
            return (
              <DeResultatAnime key={die.id} values={die.values.map((value) => String(value ?? '-'))} delay={index * 90} className={stateClass} />
            );
          })}
        </div>
      )}
      <TotalAnime aggregate={aggregate || { value: fallbackResultValue(result) }} diceCount={dice.length} />
      {(aggregate?.adjustments || []).length > 0 && (
        <div className="quick-roll-adjustments">
          {aggregate.adjustments.map((adjustment, index) => (
            <span key={`${adjustment.type || adjustment.label}-${index}`}>
              {adjustment.label} <strong>{signedValue(adjustment.value)}</strong>
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export function FenetreLancerDes({ randomSystem, quickRollInfo = null, onFermer }) {
  const [showAllRolls, setShowAllRolls] = useState(false);
  const [lastQuickRoll] = useState(readQuickRollMemory);
  const allDefinitions = useMemo(
    () => activeDefinitions(randomSystem?.state?.definitions || []),
    [randomSystem?.state?.definitions],
  );
  const definitions = useMemo(
    () => (quickRollInfo || showAllRolls ? allDefinitions : quickDefinitions(allDefinitions)),
    [allDefinitions, quickRollInfo, showAllRolls],
  );
  const sources = useMemo(
    () => randomSystem?.state?.sources || [],
    [randomSystem?.state?.sources],
  );
  const allTokenContainers = useMemo(
    () => exposedTokenContainers(randomSystem?.state?.tokenContainers || []),
    [randomSystem?.state?.tokenContainers],
  );
  const tokenContainers = useMemo(
    () => (quickRollInfo || showAllRolls ? allTokenContainers : quickTokenContainers(allTokenContainers)),
    [allTokenContainers, quickRollInfo, showAllRolls],
  );
  const [selectedId, setSelectedId] = useState(quickRollInfo?.quickRollDefinitionId || lastQuickRoll?.selectedId || definitions[0]?.id || (tokenContainers[0] ? tokenContainerResourceId(tokenContainers[0].id) : '__expert__'));
  const [expertCode, setExpertCode] = useState(lastQuickRoll?.expertCode || '1d20');
  const [adjustmentCode, setAdjustmentCode] = useState('');
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [selectedInputs, setSelectedInputs] = useState(lastQuickRoll?.inputs || { parameters: {}, options: {} });
  const [result, setResult] = useState(null);
  const quickRollLaunchedRef = useRef(false);
  const rememberedRollAppliedRef = useRef(false);
  const selected = definitions.find((definition) => definition.id === selectedId) || null;
  const modifierIds = useMemo(() => modifierParameterIds(selected), [selected]);
  const formParameters = useMemo(() => {
    const parameters = { ...(selectedInputs.parameters || {}) };
    modifierIds.forEach((id) => {
      if (!Object.prototype.hasOwnProperty.call(parameters, id)) parameters[id] = '';
    });
    return parameters;
  }, [modifierIds, selectedInputs.parameters]);
  const selectedTokenContainer = tokenContainers.find((container) => container.id === tokenContainerIdFromResourceId(selectedId)) || null;
  const expertMode = selectedId === '__expert__';
  const expertCompilation = useMemo(() => {
    if (!expertMode || !expertCode.trim()) return { definition: null, error: '' };
    try {
      return {
        definition: compileRollCode(expertCode, {
          id: 'expert-free-roll',
          name: t('random.quick.expertName'),
          sources,
        }),
        error: '',
      };
    } catch (error) {
      return { definition: null, error: error?.message || t('random.error.generic') };
    }
  }, [expertCode, expertMode, sources]);
  const adjustmentCompilation = useMemo(() => {
    if (!adjustmentOpen || !adjustmentCode.trim()) return { definition: null, error: '' };
    try {
      return {
        definition: compileRollCode(adjustmentCode, {
          id: 'adjusted-free-roll',
          name: selected?.name || t('random.quick.expertName'),
          sources,
        }),
        error: '',
      };
    } catch (error) {
      return { definition: null, error: error?.message || t('random.error.generic') };
    }
  }, [adjustmentCode, adjustmentOpen, selected?.name, sources]);
  const chooseDefinition = (definitionId) => {
    setSelectedId(definitionId);
    setResult(null);
    setAdjustmentOpen(false);
    setSelectedInputs({ parameters: {}, options: {} });
  };
  const rememberQuickRoll = (next = {}) => {
    if (quickRollInfo) return;
    writeQuickRollMemory({ selectedId, inputs: selectedInputs, expertCode, ...next });
  };
  const openAdjustment = () => {
    if (!selected) return;
    setAdjustmentCode(definitionToRollCode(selected, selectedInputs));
    setAdjustmentOpen(true);
    setResult(null);
  };
  const run = (definitionId, parameters, options) => {
    const next = randomSystem?.actions?.runDefinition?.(definitionId, parameters, options);
    setResult(next);
    rememberQuickRoll({ selectedId: definitionId, inputs: { parameters, options } });
    return next;
  };
  const toggleRollScope = () => {
    const nextShowAll = !showAllRolls;
    setShowAllRolls(nextShowAll);
    const nextDefinitions = nextShowAll ? allDefinitions : quickDefinitions(allDefinitions);
    const nextContainers = nextShowAll ? allTokenContainers : quickTokenContainers(allTokenContainers);
    const selectedStillVisible = nextDefinitions.some((definition) => definition.id === selectedId)
      || nextContainers.some((container) => tokenContainerResourceId(container.id) === selectedId);
    if (!selectedStillVisible) setSelectedId(nextDefinitions[0]?.id || (nextContainers[0] ? tokenContainerResourceId(nextContainers[0].id) : '__expert__'));
    setResult(null);
  };
  const runExpert = (_definitionId, parameters, options, instances) => {
    if (!expertCompilation.definition) return null;
    const next = randomSystem?.actions?.runAdHocDefinition?.(expertCompilation.definition, parameters, options, instances);
    setResult(next);
    rememberQuickRoll({ selectedId: '__expert__', inputs: { parameters, options }, expertCode });
    return next;
  };
  const runAdjustment = (_definitionId, parameters, options, instances) => {
    if (!adjustmentCompilation.definition) return null;
    const next = randomSystem?.actions?.runAdHocDefinition?.(adjustmentCompilation.definition, parameters, options, instances);
    setResult(next);
    return next;
  };
  const resolveDecision = (accepted) => {
    const next = randomSystem?.actions?.resolveDefinitionDecision?.(result, accepted);
    setResult(next);
  };
  useEffect(() => {
    if (!quickRollInfo || quickRollLaunchedRef.current) return;
    const definitionId = quickRollInfo.quickRollDefinitionId;
    if (!definitions.some((definition) => definition.id === definitionId)) return;
    quickRollLaunchedRef.current = true;
    setSelectedId(definitionId);
    run(definitionId, quickRollInfo.quickRollParameters || {}, quickRollInfo.quickRollOptions || {});
    return undefined;
  }, [definitions, quickRollInfo]);

  useEffect(() => {
    if (quickRollInfo || rememberedRollAppliedRef.current || !lastQuickRoll?.selectedId) return;
    const knownDefinition = allDefinitions.some((definition) => definition.id === lastQuickRoll.selectedId);
    const knownContainer = allTokenContainers.some((container) => tokenContainerResourceId(container.id) === lastQuickRoll.selectedId);
    const known = knownDefinition
      || knownContainer
      || lastQuickRoll.selectedId === '__expert__';
    if (!known) return;
    rememberedRollAppliedRef.current = true;
    if (!definitions.some((definition) => definition.id === lastQuickRoll.selectedId) && knownDefinition) setShowAllRolls(true);
    if (!tokenContainers.some((container) => tokenContainerResourceId(container.id) === lastQuickRoll.selectedId) && knownContainer) setShowAllRolls(true);
    setSelectedId(lastQuickRoll.selectedId);
    setSelectedInputs(lastQuickRoll.inputs || { parameters: {}, options: {} });
  }, [allDefinitions, allTokenContainers, definitions, lastQuickRoll, quickRollInfo, tokenContainers]);

  return (
    <Fenetre title={quickRollInfo?.characterName ? `${quickRollInfo.characterName} — ${quickRollInfo.label}` : t('random.quick.title')} onClose={onFermer} className="quick-roll-dialog">
      <div className="quick-roll-content">
        {(definitions.length > 0 || tokenContainers.length > 0 || !quickRollInfo) ? (
          <>
            {!quickRollInfo && <div className="quick-roll-type">
              <div className="quick-roll-scope-head"><span className="quick-roll-type-label">{t('random.quick.type')}</span><button type="button" className="small-btn" onClick={toggleRollScope}>{t(showAllRolls ? 'random.quick.showQuick' : 'random.quick.showAll')}</button></div>
              <div className="quick-roll-type-options" role="group" aria-label={t('random.quick.type')}>
                {definitions.map((definition) => {
                  const selectedDefinition = definition.id === selected?.id;
                  return (
                    <button
                      type="button"
                      className={selectedDefinition ? 'selected' : ''}
                      aria-pressed={selectedDefinition}
                      onClick={() => chooseDefinition(definition.id)}
                      key={definition.id}
                    >
                      <DefinitionVisual visualId={definition.visualId} className="compact" decorative />
                      <span>{definition.name}</span>
                    </button>
                  );
                })}
                {tokenContainers.map((container) => {
                  const tokenId = tokenContainerResourceId(container.id);
                  const selectedContainer = tokenId === selectedId;
                  return <button type="button" className={selectedContainer ? 'selected' : ''} aria-pressed={selectedContainer} onClick={() => chooseDefinition(tokenId)} key={container.id}>
                    <span aria-hidden="true">◉</span>
                    <span>{container.name}</span>
                  </button>;
                })}
                {showAllRolls && <button type="button" className={expertMode ? 'selected' : ''} aria-pressed={expertMode} onClick={() => chooseDefinition('__expert__')}>
                  <span className="quick-roll-expert-mark" aria-hidden="true">{'{}'}</span>
                  <span>{t('random.quick.expert')}</span>
                </button>}
              </div>
            </div>}
            {selected && !quickRollInfo && !expertMode && (
              <DefinitionForm
                className="quick-roll-form"
                definition={selected}
                definitions={randomSystem.state.definitions}
                sources={sources}
                onRun={run}
                showHeader={false}
                onInputsChange={setSelectedInputs}
                initialParameters={formParameters}
                initialOptions={selectedInputs.options}
                parameterComparator={quickParameterComparator}
                runAccessory={<button type="button" className="small-btn quick-roll-adjust-button" onClick={openAdjustment} aria-label={t('random.quick.adjust')} title={t('random.quick.adjust')}>{'{ }'}</button>}
              />
            )}
            {selected && adjustmentOpen && !quickRollInfo && !expertMode && <section className="quick-adjustment-form">
              <label className="field">{t('random.quick.adjustField')}<textarea rows="3" spellCheck="false" value={adjustmentCode} onChange={(event) => setAdjustmentCode(event.target.value)} /></label>
              <p className="muted compact-help">{t('random.quick.adjustHelp')}</p>
              {adjustmentCompilation.error && <p className="rs-error" role="alert">{adjustmentCompilation.error}</p>}
              {adjustmentCompilation.definition && <DefinitionForm className="quick-roll-form" definition={adjustmentCompilation.definition} definitions={[adjustmentCompilation.definition, ...randomSystem.state.definitions]} sources={sources} onRun={runAdjustment} runLabel={t('random.quick.adjustRun')} showHeader={false} />}
            </section>}
            {selectedTokenContainer && (
              <TokenContainerForm
                container={selectedTokenContainer}
                containers={tokenContainers}
                tokenTypes={randomSystem.state.tokenTypes || []}
                actions={randomSystem.actions}
                onResult={setResult}
              />
            )}
            {showAllRolls && expertMode && !quickRollInfo && <section className="quick-expert-form">
              <label className="field">{t('random.quick.expertField')}<textarea rows="3" spellCheck="false" value={expertCode} onChange={(event) => setExpertCode(event.target.value)} /></label>
              <p className="muted compact-help">{t('random.quick.expertHelp')}</p>
              {expertCompilation.error && <p className="rs-error" role="alert">{expertCompilation.error}</p>}
              {expertCompilation.definition && <DefinitionForm className="quick-roll-form" definition={expertCompilation.definition} definitions={[expertCompilation.definition, ...randomSystem.state.definitions]} sources={sources} onRun={runExpert} showHeader={false} />}
            </section>}
            {!selectedTokenContainer && <QuickRollResult result={result} onDecision={result?.kind === 'random-decision' ? resolveDecision : undefined} />}
          </>
        ) : <p className="muted">{t('random.quick.noRoll')}</p>}
      </div>
    </Fenetre>
  );
}
