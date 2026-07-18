import { t } from '../../../i18n/index.js';
import { builderModes } from '../../definitionBuilder.js';

export const directComparatorOptions = [
  ['eq', '='],
  ['lte', '≤'],
  ['gte', '≥'],
];

export const advancedComparatorOptions = [
  ...directComparatorOptions,
  ['neq', '≠'],
  ['lt', '<'],
  ['gt', '>'],
];

export function ModeValueField({ label, mode, value, onModeChange, onValueChange, requestLabel, min, max, allowPrompt = true }) {
  return (
    <div className="rs-mode-value">
      <select aria-label={t('random.definition.valueMode', { label })} value={mode} onChange={(event) => onModeChange(event.target.value)}>
        <option value={builderModes.FIXED}>{t('random.definition.fixed')}</option>
        <option value={builderModes.REQUEST}>{requestLabel || t('random.definition.requested')}</option>
        {allowPrompt && <option value={builderModes.PROMPT}>{t('random.definition.requestedNoDefault')}</option>}
      </select>
      {mode !== builderModes.PROMPT && (
        <input aria-label={t('random.definition.value', { label })} type="number" min={min} max={max} value={value} onChange={(event) => onValueChange(event.target.value)} />
      )}
    </div>
  );
}

export function ConditionFields({ value, onChange, includeIterations = false, advanced = true }) {
  const comparatorOptions = advanced ? advancedComparatorOptions : directComparatorOptions;
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

export function ActivationConditionsField({ label, value = [], options = [], onChange }) {
  const conditions = (Array.isArray(value) ? value : value ? [value] : [])
    .filter((condition) => condition?.optionId);
  if (!options.length) return null;
  const optionById = new Map(options.map((option) => [option.id, option]));
  const unusedOptions = options.filter((option) => (
    !conditions.some((condition) => condition.optionId === option.id)
  ));
  const addCondition = (optionId) => {
    if (!optionId) return;
    const option = optionById.get(optionId);
    onChange([...conditions, {
      optionId,
      equals: option?.choices?.[0]?.value ?? '',
    }]);
  };
  const patchCondition = (index, patch) => onChange(conditions.map((condition, currentIndex) => (
    currentIndex === index ? { ...condition, ...patch } : condition
  )));

  return (
    <div className="rs-activation-conditions">
      <span>{label}</span>
      {!conditions.length && (
        <select
          aria-label={label}
          value=""
          onChange={(event) => addCondition(event.target.value)}
        >
          <option value="">{t('random.definition.alwaysActive')}</option>
          {options.map((option) => <option value={option.id} key={option.id}>{option.label}</option>)}
        </select>
      )}
      {conditions.map((condition, index) => {
        const option = optionById.get(condition.optionId);
        return (
          <div className="rs-activation-condition" key={`${condition.optionId}-${index}`}>
            <select
              aria-label={t('random.definition.activationChoice')}
              value={condition.optionId}
              onChange={(event) => {
                const next = optionById.get(event.target.value);
                patchCondition(index, {
                  optionId: event.target.value,
                  equals: next?.choices?.[0]?.value ?? '',
                });
              }}
            >
              {options.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
            <select
              aria-label={t('random.definition.activationAnswer')}
              value={condition.equals}
              onChange={(event) => patchCondition(index, { equals: event.target.value })}
            >
              {(option?.choices || []).map((choice) => (
                <option value={choice.value} key={choice.value}>{choice.label}</option>
              ))}
            </select>
            <button
              type="button"
              className="small-btn subtle-danger"
              aria-label={t('common.delete')}
              onClick={() => onChange(conditions.filter((_, currentIndex) => currentIndex !== index))}
            >
              ×
            </button>
          </div>
        );
      })}
      {!!conditions.length && !!unusedOptions.length && (
        <button type="button" className="small-btn" onClick={() => addCondition(unusedOptions[0].id)}>
          {t('random.definition.addActivationCondition')}
        </button>
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
