import { t } from '../../../i18n/index.js';
import { isRandomRuleEnabled, randomRuleIds } from '../../rulePool.js';
import { ConditionFields, ToggleTreatment } from './SharedFields.jsx';

export function AdvancedTreatments({
  draft,
  numericResult,
  rulePool,
  patchTreatment,
}) {
  const ruleEnabled = (ruleId) => isRandomRuleEnabled(rulePool, ruleId);
  const treatments = [
    {
      id: 'customValue',
      enabled: draft.customValue.enabled,
      available: ruleEnabled(randomRuleIds.CUSTOM_VALUES),
    },
    {
      id: 'marker',
      enabled: draft.marker.enabled,
      available: ruleEnabled(randomRuleIds.MARKERS),
    },
    {
      id: 'occurrenceBonus',
      enabled: draft.occurrenceBonus.enabled,
      available: numericResult && ruleEnabled(randomRuleIds.OCCURRENCE_BONUSES),
    },
  ];

  const renderTreatment = ({ id }) => {
    if (id === 'customValue') {
      return (
        <ToggleTreatment checked={draft.customValue.enabled} label={t('random.definition.customValue')} onChange={(enabled) => patchTreatment('customValue', { enabled })}>
          <ConditionFields value={draft.customValue} onChange={(next) => patchTreatment('customValue', next)} />
          <label className="field">
            {t('random.definition.mappedValue')}
            <input type="number" value={draft.customValue.mappedValue} onChange={(event) => patchTreatment('customValue', { mappedValue: event.target.value })} />
          </label>
        </ToggleTreatment>
      );
    }
    if (id === 'marker') {
      return (
        <ToggleTreatment checked={draft.marker.enabled} label={t('random.definition.marker')} onChange={(enabled) => patchTreatment('marker', { enabled })}>
          <ConditionFields value={draft.marker} onChange={(next) => patchTreatment('marker', next)} />
          <label className="field">
            {t('common.name')}
            <input type="text" value={draft.marker.label} onChange={(event) => patchTreatment('marker', { label: event.target.value })} />
          </label>
        </ToggleTreatment>
      );
    }
    return (
      <ToggleTreatment checked={draft.occurrenceBonus.enabled} label={t('random.definition.occurrenceBonus')} onChange={(enabled) => patchTreatment('occurrenceBonus', { enabled })}>
        <ConditionFields value={draft.occurrenceBonus} onChange={(next) => patchTreatment('occurrenceBonus', next)} />
        <div className="rs-inline-fields">
          <label className="field">{t('random.definition.every')}<input type="number" min="1" value={draft.occurrenceBonus.every} onChange={(event) => patchTreatment('occurrenceBonus', { every: event.target.value })} /></label>
          <label className="field">{t('random.definition.bonus')}<input type="number" value={draft.occurrenceBonus.amount} onChange={(event) => patchTreatment('occurrenceBonus', { amount: event.target.value })} /></label>
        </div>
      </ToggleTreatment>
    );
  };

  const visible = treatments.filter((treatment) => treatment.available || treatment.enabled);
  const unavailable = treatments.filter((treatment) => !treatment.available && !treatment.enabled);

  return (
    <>
      {visible.map((treatment) => <div key={treatment.id}>{renderTreatment(treatment)}</div>)}
      {unavailable.length > 0 && (
        <details className="rs-advanced-treatments">
          <summary>{t('random.definition.advanced')}</summary>
          {unavailable.map((treatment) => <div key={treatment.id}>{renderTreatment(treatment)}</div>)}
        </details>
      )}
    </>
  );
}
