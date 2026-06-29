import { t } from '../../../i18n/index.js';
import { builderResultModes } from '../../definitionBuilder.js';
import { randomKeepOrders } from '../../engine.js';
import { isRandomRuleEnabled, randomRuleIds } from '../../rulePool.js';
import { ModeValueField } from './SharedFields.jsx';

export function CalculationFields({
  calculation,
  onChange,
  rulePool,
}) {
  const numericResult = calculation.resultMode !== builderResultModes.VALUES;
  const ruleEnabled = (ruleId) => isRandomRuleEnabled(rulePool, ruleId);
  const showSuccesses = ruleEnabled(randomRuleIds.SUCCESS_THRESHOLDS)
    || calculation.resultMode === builderResultModes.SUCCESSES;
  const showKeep = ruleEnabled(randomRuleIds.KEEPS) || calculation.keepMode !== 'none';
  const showModifier = ruleEnabled(randomRuleIds.MODIFIERS) || calculation.modifierEnabled;

  return (
    <div className="rs-editor-grid rs-calculation-fields">
      <label className="field">
        {t('random.definition.resultMode')}
        <select value={calculation.resultMode} onChange={(event) => onChange({ resultMode: event.target.value })}>
          <option value={builderResultModes.VALUES}>{t('random.definition.resultValues')}</option>
          <option value={builderResultModes.SUM}>{t('random.definition.resultSum')}</option>
          <option value={builderResultModes.SUBTRACT}>{t('random.definition.resultSubtract')}</option>
          {showSuccesses && <option value={builderResultModes.SUCCESSES}>{t('random.definition.resultSuccesses')}</option>}
        </select>
      </label>
      {calculation.resultMode === builderResultModes.SUCCESSES && (
        <label className="field">
          {t('random.definition.threshold')}
          <ModeValueField
            mode={calculation.thresholdMode}
            value={calculation.threshold}
            onModeChange={(thresholdMode) => onChange({ thresholdMode })}
            onValueChange={(threshold) => onChange({ threshold })}
          />
        </label>
      )}
      {showKeep && (
        <label className="field">
          {t('random.definition.keep')}
          <select value={calculation.keepMode} onChange={(event) => onChange({ keepMode: event.target.value })}>
            <option value="none">{t('random.definition.keepAll')}</option>
            <option value={randomKeepOrders.HIGHEST}>{t('random.definition.keepHighest')}</option>
            <option value={randomKeepOrders.LOWEST}>{t('random.definition.keepLowest')}</option>
          </select>
        </label>
      )}
      {showKeep && calculation.keepMode !== 'none' && (
        <label className="field">
          {t('random.definition.keepCount')}
          <ModeValueField
            mode={calculation.keepCountMode}
            value={calculation.keepCount}
            min="1"
            max="1000"
            onModeChange={(keepCountMode) => onChange({ keepCountMode })}
            onValueChange={(keepCount) => onChange({ keepCount })}
          />
        </label>
      )}
      {numericResult && showModifier && (
        <label className={`global-switch rs-calculation-toggle ${calculation.modifierEnabled ? 'active' : ''}`}>
          <span>{t('random.definition.requestModifier')}</span>
          <input
            type="checkbox"
            checked={calculation.modifierEnabled}
            onChange={(event) => onChange({ modifierEnabled: event.target.checked })}
          />
        </label>
      )}
    </div>
  );
}
