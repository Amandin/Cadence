import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { activeDefinitions } from '../../random-system/definitionAccess.js';
import { randomSourceKinds } from '../../random-system/engine.js';
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

export function QuickRollResult({ result }) {
  if (!result) return null;
  const aggregate = result.primaryAggregate;
  const dice = resultDice(result);
  return (
    <section className="quick-roll-result" aria-live="polite">
      <div className="quick-roll-total">
        <span>{aggregate?.label || t('random.result.title')}</span>
        <strong>{aggregateValue(aggregate?.value)}</strong>
      </div>
      {(aggregate?.adjustments || []).length > 0 && (
        <div className="quick-roll-adjustments">
          {aggregate.adjustments.map((adjustment, index) => (
            <span key={`${adjustment.type || adjustment.label}-${index}`}>
              {adjustment.label} <strong>{signedValue(adjustment.value)}</strong>
            </span>
          ))}
        </div>
      )}
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
              <div className={`quick-roll-die ${stateClass}`} aria-label={stateLabel || undefined} title={stateLabel} key={die.id}>
                {die.values.map((value, index) => <strong key={`${die.id}-${index}`}>{String(value ?? '-')}</strong>)}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function FenetreLancerDes({ randomSystem, onFermer }) {
  const definitions = useMemo(
    () => activeDefinitions(randomSystem?.state?.definitions || []),
    [randomSystem?.state?.definitions],
  );
  const sources = useMemo(
    () => (randomSystem?.state?.sources || []).filter((source) => source.kind !== randomSourceKinds.CARDS),
    [randomSystem?.state?.sources],
  );
  const [selectedId, setSelectedId] = useState(definitions[0]?.id || '');
  const [result, setResult] = useState(null);
  const selected = definitions.find((definition) => definition.id === selectedId) || definitions[0] || null;
  const chooseDefinition = (definitionId) => {
    setSelectedId(definitionId);
    setResult(null);
  };
  const run = (definitionId, parameters, options) => {
    const next = randomSystem?.actions?.runDefinitionTransient?.(definitionId, parameters, options);
    setResult(next);
    return next;
  };

  return (
    <Fenetre title={t('random.quick.title')} onClose={onFermer} className="quick-roll-dialog">
      <div className="quick-roll-content">
        {definitions.length > 0 ? (
          <>
            <label className="field quick-roll-type">
              {t('random.quick.type')}
              <select value={selected?.id || ''} onChange={(event) => chooseDefinition(event.target.value)}>
                {definitions.map((definition) => <option value={definition.id} key={definition.id}>{definition.name}</option>)}
              </select>
            </label>
            {selected && (
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
