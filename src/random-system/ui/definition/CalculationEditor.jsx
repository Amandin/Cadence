import { t } from '../../../i18n/index.js';
import { builderResultModes } from '../../definitionBuilder.js';
import { CalculationFields } from './CalculationFields.jsx';
import { advancedComparatorOptions } from './SharedFields.jsx';

export function CalculationEditor({ draft, setDraft, sources = [], essential = false }) {
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  const numericResult = draft.resultMode !== builderResultModes.VALUES;
  const counters = draft.counters || [];
  const patchCounter = (id, next) => patch({
    counters: counters.map((counter) => (counter.id === id ? { ...counter, ...next } : counter)),
  });

  return (
    <div className="rs-calculation-editor">
      <div>
        <h3>{t('random.definition.overallCalculation')}</h3>
        <p className="muted compact-help">{t('random.definition.overallCalculationHelp')}</p>
      </div>
      <CalculationFields calculation={draft} onChange={patch} essential={essential} />

      {!essential && <details className="rs-no-code-advanced">
        <summary>
          <span>{t('random.definition.noCodeAdvanced')}</span>
          <small>{t('random.definition.noCodeAdvancedResultHelp')}</small>
        </summary>
        <div className="rs-no-code-advanced-body">
          {draft.resultMode === builderResultModes.SUCCESSES && (
            <label className="field">
              {t('random.definition.advancedSuccessComparison')}
              <select value={draft.thresholdOperator || 'gte'} onChange={(event) => patch({ thresholdOperator: event.target.value })}>
                {advancedComparatorOptions.map(([operator, label]) => <option value={operator} key={operator}>{label}</option>)}
              </select>
            </label>
          )}
          {counters.length > 0 && (
            <section className="rs-advanced-counter-comparisons">
              <h4>{t('random.definition.advancedCounterComparisons')}</h4>
              {counters.map((counter) => (
                <label className="field" key={counter.id}>
                  {counter.label || t('random.definition.newCounter')}
                  <select value={counter.operator} onChange={(event) => patchCounter(counter.id, { operator: event.target.value })}>
                    {advancedComparatorOptions.map(([operator, label]) => <option value={operator} key={operator}>{label}</option>)}
                  </select>
                </label>
              ))}
            </section>
          )}
          <div className="rs-linked-table-editor">
            <label className={`global-switch rs-calculation-toggle ${draft.linkedTable?.enabled ? 'active' : ''}`}>
              <span>{t('random.definition.linkedTable')}</span>
              <input
                type="checkbox"
                checked={!!draft.linkedTable?.enabled}
                onChange={(event) => patch({
                  linkedTable: {
                    ...draft.linkedTable,
                    enabled: event.target.checked,
                    sourceId: draft.linkedTable?.sourceId || sources[0]?.id || '',
                  },
                })}
              />
            </label>
            {draft.linkedTable?.enabled && (
              <div className="rs-editor-grid">
                <label className="field">
                  {t('random.definition.linkedTableSource')}
                  <select
                    value={draft.linkedTable.sourceId || ''}
                    onChange={(event) => patch({ linkedTable: { ...draft.linkedTable, sourceId: event.target.value } })}
                  >
                    {sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  {t('random.definition.linkedTableLabel')}
                  <input
                    type="text"
                    value={draft.linkedTable.label || ''}
                    onChange={(event) => patch({ linkedTable: { ...draft.linkedTable, label: event.target.value } })}
                  />
                </label>
              </div>
            )}
          </div>
          {!numericResult && draft.linkedTable?.enabled && <p className="rule-warning">{t('random.definition.linkedTableNumericWarning')}</p>}
        </div>
      </details>}
    </div>
  );
}
