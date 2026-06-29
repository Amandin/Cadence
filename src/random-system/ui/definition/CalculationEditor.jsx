import { t } from '../../../i18n/index.js';
import { builderResultModes } from '../../definitionBuilder.js';
import { AdvancedTreatments } from './AdvancedTreatments.jsx';
import { CalculationFields } from './CalculationFields.jsx';

export function CalculationEditor({ draft, rulePool, setDraft, sources = [] }) {
  const patch = (next) => setDraft((current) => ({ ...current, ...next }));
  const patchTreatment = (key, next) => setDraft((current) => ({
    ...current,
    [key]: { ...current[key], ...next },
  }));
  const numericResult = draft.resultMode !== builderResultModes.VALUES;

  return (
    <div className="rs-calculation-editor">
      <h3>{t('random.definition.overallCalculation')}</h3>
      <CalculationFields calculation={draft} onChange={patch} rulePool={rulePool} />
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
                onChange={(event) => patch({
                  linkedTable: { ...draft.linkedTable, sourceId: event.target.value },
                })}
              >
                {sources.map((source) => (
                  <option value={source.id} key={source.id}>{source.name}</option>
                ))}
              </select>
            </label>
            <label className="field">
              {t('random.definition.linkedTableLabel')}
              <input
                type="text"
                value={draft.linkedTable.label || ''}
                onChange={(event) => patch({
                  linkedTable: { ...draft.linkedTable, label: event.target.value },
                })}
              />
            </label>
          </div>
        )}
      </div>

      <AdvancedTreatments
        draft={draft}
        numericResult={numericResult}
        rulePool={rulePool}
        patchTreatment={patchTreatment}
      />
    </div>
  );
}
