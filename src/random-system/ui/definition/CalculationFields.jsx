import { t } from '../../../i18n/index.js';
import { builderResultModes } from '../../definitionBuilder.js';
import { randomKeepOrders } from '../../engine.js';
import { createResourceId } from '../../resourceIds.js';
import {
  advancedComparatorOptions,
  directComparatorOptions,
  ModeValueField,
} from './SharedFields.jsx';

function ComparatorSelect({ value, onChange, advanced }) {
  const directOperators = new Set(directComparatorOptions.map(([operator]) => operator));
  const options = advanced || !directOperators.has(value)
    ? advancedComparatorOptions
    : directComparatorOptions;
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map(([operator, label]) => <option value={operator} key={operator}>{label}</option>)}
    </select>
  );
}

export function CalculationFields({ calculation, onChange, advanced = false, essential = false }) {
  const numericResult = calculation.resultMode !== builderResultModes.VALUES;
  const counters = calculation.counters || [];
  const patchCounter = (id, patch) => onChange({
    counters: counters.map((counter) => (counter.id === id ? { ...counter, ...patch } : counter)),
  });

  return (
    <div className="rs-editor-grid rs-calculation-fields">
      <label className="field">
        {t('random.definition.resultMode')}
        <select value={calculation.resultMode} onChange={(event) => onChange({ resultMode: event.target.value })}>
          <option value={builderResultModes.VALUES}>{t('random.definition.resultValues')}</option>
          <option value={builderResultModes.SUM}>{t('random.definition.resultSum')}</option>
          <option value={builderResultModes.SUBTRACT}>{t('random.definition.resultSubtract')}</option>
          <option value={builderResultModes.SUCCESSES}>{t('random.definition.resultSuccesses')}</option>
        </select>
      </label>
      {calculation.resultMode === builderResultModes.SUCCESSES && (
        <div className="field">
          <span>{t('random.definition.threshold')}</span>
          <div className="rs-condition-mode-value">
            <ComparatorSelect
              value={calculation.thresholdOperator || 'gte'}
              advanced={advanced}
              onChange={(thresholdOperator) => onChange({ thresholdOperator })}
            />
            <ModeValueField
              label={t('random.definition.threshold')}
              mode={calculation.thresholdMode}
              value={calculation.threshold}
              onModeChange={(thresholdMode) => onChange({ thresholdMode })}
              onValueChange={(threshold) => onChange({ threshold })}
            />
          </div>
        </div>
      )}
      {(!essential || calculation.keepMode !== 'none') && <label className="field">
        {t('random.definition.keep')}
        <select value={calculation.keepMode} onChange={(event) => onChange({ keepMode: event.target.value })}>
          <option value="none">{t('random.definition.keepAll')}</option>
          <option value={randomKeepOrders.HIGHEST}>{t('random.definition.keepHighest')}</option>
          <option value={randomKeepOrders.LOWEST}>{t('random.definition.keepLowest')}</option>
        </select>
      </label>}
      {calculation.keepMode !== 'none' && (
        <div className="field">
          <span>{t('random.definition.keepCount')}</span>
          <ModeValueField
            label={t('random.definition.keepCount')}
            mode={calculation.keepCountMode}
            value={calculation.keepCount}
            min="1"
            max="1000"
            onModeChange={(keepCountMode) => onChange({ keepCountMode })}
            onValueChange={(keepCount) => onChange({ keepCount })}
          />
        </div>
      )}
      {numericResult && (
        <div className="rs-calculation-modifier">
          <label className={`global-switch rs-calculation-toggle ${calculation.modifierEnabled ? 'active' : ''}`}>
            <span>{t('random.definition.modifier')}</span>
            <input
              type="checkbox"
              checked={calculation.modifierEnabled}
              onChange={(event) => onChange({ modifierEnabled: event.target.checked })}
            />
          </label>
          {calculation.modifierEnabled && (
            <ModeValueField
              label={t('random.definition.modifier')}
              mode={calculation.modifierMode || 'request'}
              value={calculation.modifier}
              onModeChange={(modifierMode) => onChange({ modifierMode })}
              onValueChange={(modifier) => onChange({ modifier })}
            />
          )}
        </div>
      )}

      {!essential && <section className="rs-result-counters">
        <div className="rs-subhead">
          <div>
            <h4>{t('random.definition.resultCounters')}</h4>
            <p className="muted compact-help">{t('random.definition.resultCountersHelp')}</p>
          </div>
          <button
            type="button"
            className="small-btn"
            onClick={() => onChange({
              counters: [...counters, {
                id: createResourceId('counter'),
                label: t('random.definition.newCounter'),
                operator: 'eq',
                value: 1,
              }],
            })}
          >
            {t('common.add')}
          </button>
        </div>
        {counters.map((counter) => (
          <div className="rs-result-counter" key={counter.id}>
            <input
              type="text"
              aria-label={t('common.name')}
              value={counter.label}
              onChange={(event) => patchCounter(counter.id, { label: event.target.value })}
            />
            <ComparatorSelect
              value={counter.operator}
              advanced={advanced}
              onChange={(operator) => patchCounter(counter.id, { operator })}
            />
            <input type="number" value={counter.value} onChange={(event) => patchCounter(counter.id, { value: event.target.value })} />
            <button
              type="button"
              className="small-btn"
              aria-label={t('common.delete')}
              onClick={() => onChange({ counters: counters.filter((item) => item.id !== counter.id) })}
            >
              ×
            </button>
          </div>
        ))}
      </section>}
    </div>
  );
}
