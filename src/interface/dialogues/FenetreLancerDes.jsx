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
import { fixedValue, randomAggregateOperations, randomPipelineStepTypes, randomSourceKinds } from '../../random-system/engine.js';
import {
  defaultQuickModifiers as sharedDefaultQuickModifiers,
  modifierParameterIds as sharedModifierParameterIds,
  newDrawAnimationIds,
  quickParameterComparator as sharedQuickParameterComparator,
  readQuickRollMemory as sharedReadQuickRollMemory,
  settleOptionalDecisions as sharedSettleOptionalDecisions,
  writeQuickRollMemory as sharedWriteQuickRollMemory,
} from '../../random-system/quickRollSupport.js';
import { DefinitionVisual } from '../../random-system/ui/DefinitionVisual.jsx';
import { DefinitionForm } from '../../random-system/ui/UsePanel.jsx';
import { TokenContainerForm } from '../../random-system/ui/TokenContainerForm.jsx';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import '../../random-system/styles/choice-controls.css';
import '../../random-system/styles/tokens.css';
import './FenetreLancerDes.css';

function drawValue(draw = {}) {
  return draw.outcome?.symbol || draw.outcome?.label || draw.calculatedValue;
}

export function resultDice(result = {}) {
  const groups = Array.isArray(result.groups) ? result.groups : [];
  const animatedDrawIds = Array.isArray(result.animationDrawIds) ? new Set(result.animationDrawIds) : null;
  if (!result.combined && groups.length > 1) {
    return groups.map((group) => ({
      id: `group-${group.index}`,
      kept: !!group.selected,
      history: [(group.draws || []).filter((draw) => !draw.rerolled).map(drawValue)],
      delay: group.index * 60,
      animate: !animatedDrawIds || (group.draws || []).some((draw) => animatedDrawIds.has(draw.id)),
      animateFromStage: 0,
    }));
  }
  const draws = result.draws || groups[0]?.draws || [];
  const rerollChildren = new Map();
  draws.forEach((draw) => {
    if (!draw.rerollOf) return;
    const children = rerollChildren.get(draw.rerollOf) || [];
    children.push(draw);
    rerollChildren.set(draw.rerollOf, children);
  });
  const historyFor = (draw) => {
    const history = [draw];
    let current = draw;
    while (rerollChildren.get(current.id)?.length) {
      current = rerollChildren.get(current.id)[0];
      history.push(current);
    }
    return history;
  };
  const historyDuration = (history) => history.length * 280 + Math.max(0, history.length - 1) * 150;
  const dice = [];
  const diceByDrawId = new Map();
  const addDie = (draw, delay, deferAppearance = false) => {
    const history = historyFor(draw);
    const die = {
      id: draw.id,
      kept: history.at(-1)?.kept ?? null,
      history: history.map((item) => [drawValue(item)]),
      delay,
      animate: !animatedDrawIds || history.some((item) => animatedDrawIds.has(item.id)),
      animateFromStage: animatedDrawIds ? Math.max(0, history.findIndex((item) => animatedDrawIds.has(item.id))) : 0,
      explosionPendingAt: null,
      explosionPendingUntil: null,
      deferAppearance,
    };
    dice.push(die);
    history.forEach((item) => diceByDrawId.set(item.id, die));
  };
  draws.filter((draw) => !draw.rerollOf && !draw.explodedFrom)
    .forEach((draw, index) => addDie(draw, index * 60));
  const explosions = draws.filter((draw) => !draw.rerollOf && draw.explodedFrom);
  let pending = [...explosions];
  while (pending.length) {
    const unresolved = pending.filter((draw) => {
      const parent = diceByDrawId.get(draw.explodedFrom);
      if (!parent) return true;
      const pendingDuration = 150;
      const childDelay = parent.delay + (parent.animate ? historyDuration(parent.history) : 0) + pendingDuration;
      parent.explosionPendingAt = childDelay - pendingDuration;
      parent.explosionPendingUntil = childDelay;
      addDie(draw, childDelay, true);
      return false;
    });
    if (unresolved.length === pending.length) {
      unresolved.forEach((draw, index) => addDie(draw, (dice.length + index) * 90));
      break;
    }
    pending = unresolved;
  }
  const hasDiscarded = dice.some((die) => die.kept === false);
  return dice.map((die) => ({ ...die, kept: hasDiscarded ? die.kept !== false : null }));
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

function DeResultatAnime({ history, delay = 0, className = '', animate = true, animateFromStage = 0, deferAppearance = false, explosionPendingAt = null, explosionPendingUntil = null }) {
  const firstAnimatedStage = Math.min(Math.max(0, animateFromStage), Math.max(0, history.length - 1));
  const startsWithExistingValue = animate && firstAnimatedStage > 0;
  const [rolling, setRolling] = useState(animate && !startsWithExistingValue);
  const rollingRef = useRef(animate && !startsWithExistingValue);
  const [started, setStarted] = useState(() => !animate || !deferAppearance);
  const [revealedStage, setRevealedStage] = useState(() => animate ? firstAnimatedStage - 1 : history.length - 1);
  const [displayed, setDisplayed] = useState(() => {
    if (!animate) return history.at(-1) || [];
    if (startsWithExistingValue) return history[firstAnimatedStage - 1] || [];
    return (history[0] || []).map(() => '·');
  });
  const [explosionPending, setExplosionPending] = useState(false);
  useEffect(() => {
    if (!animate) {
      rollingRef.current = false;
      setStarted(true);
      setRevealedStage(history.length - 1);
      setRolling(false);
      setDisplayed(history.at(-1) || []);
      return undefined;
    }
    rollingRef.current = !startsWithExistingValue;
    setStarted(!deferAppearance);
    setRevealedStage(firstAnimatedStage - 1);
    setRolling(!startsWithExistingValue);
    setDisplayed(startsWithExistingValue ? history[firstAnimatedStage - 1] || [] : (history[0] || []).map(() => '·'));
    const setAnimationRolling = (value) => {
      rollingRef.current = value;
      setRolling(value);
    };
    const interval = window.setInterval(() => {
      if (!rollingRef.current) return;
      setDisplayed((history[0] || []).map((value) => {
      const maximum = Math.max(2, Number(value) || 20);
      return String(1 + Math.floor(Math.random() * maximum));
      }));
    }, 65);
    const timers = history.slice(firstAnimatedStage).flatMap((values, index) => {
      const stage = firstAnimatedStage + index;
      const start = delay + (firstAnimatedStage > 0 ? 150 : 0) + index * 430;
      return [
        window.setTimeout(() => {
          setStarted(true);
          setAnimationRolling(true);
        }, start),
        window.setTimeout(() => {
          setDisplayed(values);
          setRevealedStage(stage);
          setAnimationRolling(false);
          if (stage === history.length - 1) window.clearInterval(interval);
        }, start + 280),
      ];
    });
    return () => { window.clearInterval(interval); timers.forEach((timer) => window.clearTimeout(timer)); };
  }, [animate, deferAppearance, delay, firstAnimatedStage, history, startsWithExistingValue]);
  useEffect(() => {
    if (!Number.isFinite(explosionPendingAt) || !Number.isFinite(explosionPendingUntil)) {
      setExplosionPending(false);
      return undefined;
    }
    const start = window.setTimeout(() => setExplosionPending(true), explosionPendingAt);
    const stop = window.setTimeout(() => setExplosionPending(false), explosionPendingUntil);
    return () => { window.clearTimeout(start); window.clearTimeout(stop); };
  }, [explosionPendingAt, explosionPendingUntil]);
  if (!started) return null;
  const rerollPending = history.length > 1 && !rolling && revealedStage >= 0 && revealedStage < history.length - 1;
  const previousValues = history
    .slice(0, Math.max(0, revealedStage + (rolling ? 1 : 0)))
    .flat();
  return <div className={`quick-roll-die ${className} ${rolling ? 'is-rolling' : ''} ${rerollPending ? 'is-reroll-pending' : ''} ${explosionPending ? 'is-explosion-pending' : ''}`} data-roll-stages={history.length}>
    {previousValues.map((value, index) => <small className="quick-roll-die-previous" key={`previous-${index}`}>{String(value)}</small>)}
    {displayed.map((value, index) => <strong key={index}>{String(value)}</strong>)}
  </div>;
}

function TotalAnime({ aggregate, delay = 0 }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), delay + 180);
    return () => window.clearTimeout(timer);
  }, [delay]);
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

export function QuickRollResult({ result, rolling = false, onDecision, onOptionalDecision }) {
  const dice = useMemo(() => result?.kind === 'random-roll' ? resultDice(result) : [], [result]);
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
  // Les interrupteurs du formulaire restent modifiables après un jet. Garder
  // la même description des dés tant que le résultat ne change pas évite de
  // redémarrer leurs effets à chaque rendu du formulaire.
  const animationDuration = Math.max(0, ...dice.filter((die) => die.animate).map((die) => {
    const remainingStages = die.history.length - die.animateFromStage;
    return die.delay + (die.animateFromStage > 0 ? 150 : 0) + remainingStages * 280 + Math.max(0, remainingStages - 1) * 150;
  }));
  return (
    <section className="quick-roll-result" aria-live="polite">
      {dice.length > 0 && (
        <div className="quick-roll-dice">
          {dice.map((die) => {
            const stateClass = die.kept === true ? 'is-kept' : die.kept === false ? 'is-discarded' : '';
            const stateLabel = die.kept === true
              ? t('random.quick.kept')
              : die.kept === false
                ? t('random.quick.discarded')
                : '';
            return (
              <DeResultatAnime key={die.id} history={die.history} delay={die.delay} className={stateClass} animate={die.animate} animateFromStage={die.animateFromStage} deferAppearance={die.deferAppearance} explosionPendingAt={die.explosionPendingAt} explosionPendingUntil={die.explosionPendingUntil} />
            );
          })}
        </div>
      )}
      <TotalAnime aggregate={aggregate || { value: fallbackResultValue(result) }} delay={animationDuration} />
      {(aggregate?.adjustments || []).length > 0 && (
        <div className="quick-roll-adjustments">
          {aggregate.adjustments.map((adjustment, index) => (
            <span key={`${adjustment.type || adjustment.label}-${index}`}>
              {adjustment.label} <strong>{signedValue(adjustment.value)}</strong>
            </span>
          ))}
        </div>
      )}
      {(result.optionalDecisions || []).length > 0 && (
        <div className="quick-roll-optional-actions">
          <span>{t('random.decision.afterRoll')}</span>
          {(result.optionalDecisions || []).map((decision) => (
            <button type="button" className="small-btn" onClick={() => onOptionalDecision?.(decision)} key={decision.id}>
              {decision.pendingDecision?.label}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

export function SupplementalDiceRoller({ sources, preferredSourceId, onRun, resetKey }) {
  const diceSources = useMemo(() => (sources || []).filter((source) => (
    source.kind === randomSourceKinds.UNIFORM
    && Number(source.min) === 1
    && Number.isInteger(Number(source.max))
    && Number(source.max) >= 2
  )), [sources]);
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const [sourceId, setSourceId] = useState(preferredSourceId || diceSources[0]?.id || '');
  const [extraResult, setExtraResult] = useState(null);
  const selectedSource = diceSources.find((source) => source.id === sourceId) || diceSources[0] || null;
  useEffect(() => {
    setOpen(false);
    setExtraResult(null);
  }, [resetKey]);
  const run = () => {
    if (!selectedSource) return;
    const quantity = Math.max(1, Math.min(100, Math.trunc(Number(count) || 1)));
    const definition = {
      id: 'quick-supplemental-dice',
      name: t('random.quick.supplemental.name', { source: selectedSource.name }),
      components: [{
        id: 'supplemental-dice',
        label: selectedSource.name,
        source: fixedValue(selectedSource.id),
        count: fixedValue(quantity),
      }],
      pipeline: [{
        id: 'supplemental-total',
        type: randomPipelineStepTypes.AGGREGATE,
        operation: randomAggregateOperations.SUM,
        outputId: 'total',
        label: 'Résultat supplémentaire',
      }],
      primaryAggregateId: 'total',
    };
    setExtraResult(onRun?.(definition) || null);
  };
  if (!diceSources.length) return null;
  return <section className="quick-roll-supplemental">
    <button type="button" className="small-btn" aria-expanded={open} onClick={() => setOpen((value) => !value)}>{t('random.quick.supplemental.open')}</button>
    {open && <div className="quick-roll-supplemental-form">
      <label className="field">{t('random.quick.supplemental.count')}<input type="number" min="1" max="100" value={count} onChange={(event) => setCount(event.target.value)} /></label>
      <label className="field">{t('random.quick.supplemental.die')}<select value={selectedSource?.id || ''} onChange={(event) => setSourceId(event.target.value)}>{diceSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label>
      <button type="button" className="primary" onClick={run}>{t('random.use.run')}</button>
      <small>{t('random.quick.supplemental.help')}</small>
      {extraResult && <QuickRollResult result={extraResult} />}
    </div>}
  </section>;
}

export function FenetreLancerDes({ randomSystem, quickRollInfo = null, statisticsContext = null, onFermer }) {
  const [showAllRolls, setShowAllRolls] = useState(false);
  const [lastQuickRoll] = useState(sharedReadQuickRollMemory);
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
  const modifierIds = useMemo(() => sharedModifierParameterIds(selected), [selected]);
  const formParameters = useMemo(() => {
    const parameters = { ...(selectedInputs.parameters || {}) };
    modifierIds.forEach((id) => {
      if (parameters[id] === '' || parameters[id] === null || parameters[id] === undefined) parameters[id] = 0;
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
    sharedWriteQuickRollMemory({ selectedId, inputs: selectedInputs, expertCode, ...next });
  };
  const openAdjustment = () => {
    if (!selected) return;
    setAdjustmentCode(definitionToRollCode(selected, selectedInputs));
    setAdjustmentOpen(true);
    setResult(null);
  };
  const run = (definitionId, parameters, options) => {
    const definition = allDefinitions.find((item) => item.id === definitionId) || selected;
    const normalizedParameters = sharedDefaultQuickModifiers(definition, parameters);
    const next = settleOptionalDecisions(randomSystem?.actions?.runDefinition?.(definitionId, normalizedParameters, options, undefined, statisticsContext));
    setResult(next);
    rememberQuickRoll({ selectedId: definitionId, inputs: { parameters: normalizedParameters, options } });
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
    const next = settleOptionalDecisions(randomSystem?.actions?.runAdHocDefinition?.(expertCompilation.definition, parameters, options, instances, statisticsContext));
    setResult(next);
    rememberQuickRoll({ selectedId: '__expert__', inputs: { parameters, options }, expertCode });
    return next;
  };
  const runAdjustment = (_definitionId, parameters, options, instances) => {
    if (!adjustmentCompilation.definition) return null;
    const next = randomSystem?.actions?.runAdHocDefinition?.(adjustmentCompilation.definition, parameters, options, instances, statisticsContext);
    setResult(next);
    return next;
  };
  const settleOptionalDecisions = (initialResult) => {
    return sharedSettleOptionalDecisions(initialResult, randomSystem?.actions?.resolveDefinitionDecision);
  };
  const resolveDecision = (accepted) => {
    const next = randomSystem?.actions?.resolveDefinitionDecision?.(result, accepted);
    if (accepted && next?.kind === 'random-roll') {
      const animationDrawIds = newDrawAnimationIds(next, result);
      setResult({ ...next, animationDrawIds });
      return;
    }
    setResult(next);
  };
  const activateOptionalDecision = (decision) => {
    const next = randomSystem?.actions?.resolveDefinitionDecision?.(decision, true);
    const settled = settleOptionalDecisions(next);
    if (settled?.kind === 'random-roll') {
      const animationDrawIds = newDrawAnimationIds(settled, result);
      setResult({ ...settled, animationDrawIds });
      return;
    }
    setResult(settled);
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
                parameterComparator={sharedQuickParameterComparator}
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
            {!selectedTokenContainer && <QuickRollResult result={result} onDecision={result?.kind === 'random-decision' ? resolveDecision : undefined} onOptionalDecision={activateOptionalDecision} />}
            {!selectedTokenContainer && result?.kind === 'random-roll' && <SupplementalDiceRoller
              sources={sources}
              preferredSourceId={result.draws?.[0]?.sourceId}
              resetKey={result.id}
              onRun={(definition) => randomSystem?.actions?.runAdHocDefinition?.(definition, {}, {}, undefined, statisticsContext)}
            />}
          </>
        ) : <p className="muted">{t('random.quick.noRoll')}</p>}
      </div>
    </Fenetre>
  );
}
