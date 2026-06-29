import { t } from '../../../i18n/index.js';
import { builderModes } from '../../definitionBuilder.js';

const comparatorOptions = [
  ['eq', '='],
  ['neq', '≠'],
  ['lt', '<'],
  ['lte', '≤'],
  ['gt', '>'],
  ['gte', '≥'],
];

export function ModeValueField({ mode, value, onModeChange, onValueChange, requestLabel, min, max }) {
  return (
    <div className="rs-mode-value">
      <select value={mode} onChange={(event) => onModeChange(event.target.value)}>
        <option value={builderModes.FIXED}>{t('random.definition.fixed')}</option>
        <option value={builderModes.REQUEST}>{requestLabel || t('random.definition.requested')}</option>
      </select>
      {mode === builderModes.FIXED && (
        <input type="number" min={min} max={max} value={value} onChange={(event) => onValueChange(event.target.value)} />
      )}
    </div>
  );
}

export function ConditionFields({ value, onChange, includeIterations = false }) {
  return (
    <div className="rs-condition-fields">
      <select value={value.operator} onChange={(event) => onChange({ operator: event.target.value })}>
        {comparatorOptions.map(([operator, label]) => <option value={operator} key={operator}>{label}</option>)}
      </select>
      <input type="number" value={value.value} onChange={(event) => onChange({ value: event.target.value })} />
      {includeIterations && (
        <label>
          {t('random.definition.maxTimes')}
          <input type="number" min="1" max="100" value={value.maxIterations} onChange={(event) => onChange({ maxIterations: event.target.value })} />
        </label>
      )}
    </div>
  );
}

export function ToggleTreatment({ checked, label, onChange, children }) {
  return (
    <div className={`rs-treatment ${checked ? 'active' : ''}`}>
      <label className="global-switch">
        <span>{label}</span>
        <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      </label>
      {checked && children}
    </div>
  );
}
