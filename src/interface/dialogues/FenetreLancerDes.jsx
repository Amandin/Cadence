import { useEffect, useMemo, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { activeDefinitions } from '../../random-system/definitionAccess.js';
import { randomSourceKinds } from '../../random-system/engine.js';
import { DefinitionVisual } from '../../random-system/ui/DefinitionVisual.jsx';
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

export function QuickRollResult({ result, rolling = false }) {
  if (rolling) return <ResultatDefilant />;
  if (!result) return null;
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
    () => (randomSystem?.state?.sources || []).filter((source) => source.kind !== randomSourceKinds.CARDS),
    [randomSystem?.state?.sources],
  );
  const [selectedId, setSelectedId] = useState(quickRollInfo?.quickRollDefinitionId || definitions[0]?.id || '');
  const [result, setResult] = useState(null);
  const quickRollLaunchedRef = useRef(false);
  const selected = definitions.find((definition) => definition.id === selectedId) || definitions[0] || null;
  const chooseDefinition = (definitionId) => {
    setSelectedId(definitionId);
    setResult(null);
  };
  const run = (definitionId, parameters, options) => {
    const next = randomSystem?.actions?.runDefinition?.(definitionId, parameters, options);
    setResult(next);
    return next;
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
        {definitions.length > 0 ? (
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
              </div>
            </div>}
            {selected && !quickRollInfo && (
              <DefinitionForm
                className="quick-roll-form"
                definition={selected}
                definitions={randomSystem.state.definitions}
                sources={sources}
                onRun={run}
                showHeader={false}
              />
            )}
            <QuickRollResult result={result} />
          </>
        ) : <p className="muted">{t('random.quick.noRoll')}</p>}
      </div>
    </Fenetre>
  );
}
