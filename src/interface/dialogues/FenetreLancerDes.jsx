import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { activeDefinitions } from '../../random-system/definitionAccess.js';
import { randomSourceKinds } from '../../random-system/engine.js';
import { compileRollCode } from '../../random-system/rollCode.js';
import { DefinitionVisual } from '../../random-system/ui/DefinitionVisual.jsx';
import { RandomSourceIcon } from '../../random-system/ui/RandomIcons.jsx';
import { DefinitionForm } from '../../random-system/ui/UsePanel.jsx';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import '../../random-system/styles/choice-controls.css';
import './FenetreLancerDes.css';

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
  return value.map((item) => item?.symbol || item?.label || item?.value || item).join(', ');
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
      <TotalAnime aggregate={aggregate} diceCount={dice.length} />
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
  const definitions = useMemo(
    () => activeDefinitions(randomSystem?.state?.definitions || []),
    [randomSystem?.state?.definitions],
  );
  const sources = useMemo(
    () => randomSystem?.state?.sources || [],
    [randomSystem?.state?.sources],
  );
  const cardSources = useMemo(
    () => sources.filter((source) => source.kind === randomSourceKinds.CARDS),
    [sources],
  );
  const [selectedId, setSelectedId] = useState(quickRollInfo?.quickRollDefinitionId || definitions[0]?.id || (cardSources[0] ? `card:${cardSources[0].id}` : '__expert__'));
  const [expertCode, setExpertCode] = useState('1d20');
  const [cardCount, setCardCount] = useState(1);
  const [cardDrawMode, setCardDrawMode] = useState('draw');
  const [result, setResult] = useState(null);
  const quickRollLaunchedRef = useRef(false);
  const selected = definitions.find((definition) => definition.id === selectedId) || null;
  const selectedCard = selectedId.startsWith('card:')
    ? cardSources.find((source) => source.id === selectedId.slice(5)) || null
    : null;
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
  const chooseDefinition = (definitionId) => {
    setSelectedId(definitionId);
    setResult(null);
  };
  const run = (definitionId, parameters, options) => {
    const next = randomSystem?.actions?.runDefinition?.(definitionId, parameters, options);
    setResult(next);
    return next;
  };
  const runExpert = (_definitionId, parameters, options, instances) => {
    if (!expertCompilation.definition) return null;
    const next = randomSystem?.actions?.runAdHocDefinition?.(expertCompilation.definition, parameters, options, instances);
    setResult(next);
    return next;
  };
  const drawCards = () => {
    if (!selectedCard) return null;
    const next = randomSystem?.actions?.drawCards?.(selectedCard.id, cardCount, cardDrawMode);
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

  return (
    <Fenetre title={quickRollInfo?.characterName ? `${quickRollInfo.characterName} — ${quickRollInfo.label}` : t('random.quick.title')} onClose={onFermer} className="quick-roll-dialog">
      <div className="quick-roll-content">
        {(definitions.length > 0 || cardSources.length > 0 || !quickRollInfo) ? (
          <>
            {!quickRollInfo && <div className="quick-roll-type">
              <span className="quick-roll-type-label">{t('random.quick.type')}</span>
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
                {cardSources.map((source) => {
                  const selectedSource = selectedId === `card:${source.id}`;
                  return <button type="button" className={selectedSource ? 'selected' : ''} aria-pressed={selectedSource} onClick={() => chooseDefinition(`card:${source.id}`)} key={`card:${source.id}`}>
                    <RandomSourceIcon kind={source.kind} />
                    <span>{source.name}</span>
                  </button>;
                })}
                <button type="button" className={expertMode ? 'selected' : ''} aria-pressed={expertMode} onClick={() => chooseDefinition('__expert__')}>
                  <span className="quick-roll-expert-mark" aria-hidden="true">{'{}'}</span>
                  <span>{t('random.quick.expert')}</span>
                </button>
              </div>
            </div>}
            {selected && !quickRollInfo && !selectedCard && !expertMode && (
              <DefinitionForm
                className="quick-roll-form"
                definition={selected}
                definitions={randomSystem.state.definitions}
                sources={sources}
                onRun={run}
                showHeader={false}
              />
            )}
            {selectedCard && !quickRollInfo && <section className="quick-card-form">
              <label className="field">{t('random.quick.cardCount')}<input type="number" min="1" max="1000" value={cardCount} onChange={(event) => setCardCount(Math.max(1, Number(event.target.value) || 1))} /></label>
              <label className="field">{t('random.quick.cardMode')}<select value={cardDrawMode} onChange={(event) => setCardDrawMode(event.target.value)}><option value="draw">{t('random.quick.cardWithoutReplacement')}</option><option value="replacement">{t('random.quick.cardWithReplacement')}</option></select></label>
              <button type="button" className="primary" onClick={drawCards}>{t('random.quick.cardDraw')}</button>
            </section>}
            {expertMode && !quickRollInfo && <section className="quick-expert-form">
              <label className="field">{t('random.quick.expertField')}<textarea rows="3" spellCheck="false" value={expertCode} onChange={(event) => setExpertCode(event.target.value)} /></label>
              <p className="muted compact-help">{t('random.quick.expertHelp')}</p>
              {expertCompilation.error && <p className="rs-error" role="alert">{expertCompilation.error}</p>}
              {expertCompilation.definition && <DefinitionForm className="quick-roll-form" definition={expertCompilation.definition} definitions={[expertCompilation.definition, ...randomSystem.state.definitions]} sources={sources} onRun={runExpert} showHeader={false} />}
            </section>}
            <QuickRollResult result={result} onDecision={result?.kind === 'random-decision' ? resolveDecision : undefined} />
          </>
        ) : <p className="muted">{t('random.quick.noRoll')}</p>}
      </div>
    </Fenetre>
  );
}
