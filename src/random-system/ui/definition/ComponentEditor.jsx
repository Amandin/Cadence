import { t } from '../../../i18n/index.js';
import {
  builderExplosionModes,
  builderExplosionTriggers,
  builderModes,
} from '../../definitionBuilder.js';
import { CalculationFields } from './CalculationFields.jsx';
import { ConditionFields, ModeValueField } from './SharedFields.jsx';

export function ComponentEditor({
  component,
  index,
  sources,
  canDelete,
  explosionAvailable,
  rerollAvailable,
  rulePool,
  onChange,
  onDelete,
}) {
  return (
    <div className="rs-component-editor">
      <div className="rs-subhead">
        <h4>{t('random.definition.group', { index: index + 1 })}</h4>
        {canDelete && <button type="button" className="small-btn" onClick={onDelete}>{t('common.delete')}</button>}
      </div>
      <label className="field">
        {t('random.definition.groupName')}
        <input
          type="text"
          value={component.label}
          placeholder={t('random.definition.groupNameOptional')}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>
      <div className="field">
        <span>{t('random.definition.groupColor')}</span>
        <div className="rs-color-field">
          <label className={`global-switch rs-color-toggle ${component.color ? 'active' : ''}`}>
            <span>{t('random.definition.useGroupColor')}</span>
            <input
              type="checkbox"
              checked={!!component.color}
              onChange={(event) => onChange({
                color: event.target.checked ? '#2f8f83' : '',
              })}
            />
          </label>
          {component.color && (
            <input
              type="color"
              value={component.color}
              aria-label={t('random.definition.groupColor')}
              onChange={(event) => onChange({ color: event.target.value })}
            />
          )}
        </div>
      </div>
      <label className="field">
        {t('random.definition.source')}
        <div className="rs-mode-value">
          <select value={component.sourceMode} onChange={(event) => onChange({ sourceMode: event.target.value })}>
            <option value={builderModes.FIXED}>{t('random.definition.fixed')}</option>
            <option value={builderModes.REQUEST}>{t('random.definition.requestAtUse')}</option>
          </select>
          {component.sourceMode === builderModes.FIXED && (
            <select value={component.sourceId} onChange={(event) => onChange({ sourceId: event.target.value })}>
              {sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
            </select>
          )}
        </div>
      </label>
      <label className="field">
        {t('random.definition.count')}
        <ModeValueField
          mode={component.countMode}
          value={component.count}
          min="1"
          max="1000"
          onModeChange={(countMode) => onChange({ countMode })}
          onValueChange={(count) => onChange({ count })}
          requestLabel={t('random.definition.requestAtUse')}
        />
      </label>
      {(explosionAvailable || rerollAvailable) && (
        <div className="rs-draw-treatments">
          <div className="rs-draw-treatment-toggles">
            {explosionAvailable && (
              <label className={`global-switch rs-calculation-toggle ${component.explosionMode !== builderExplosionModes.NEVER ? 'active' : ''}`}>
                <span>{t('random.definition.explosion')}</span>
                <input
                  type="checkbox"
                  checked={component.explosionMode !== builderExplosionModes.NEVER}
                  onChange={(event) => onChange({
                    explosionMode: event.target.checked
                      ? builderExplosionModes.ALWAYS
                      : builderExplosionModes.NEVER,
                  })}
                />
              </label>
            )}
            {rerollAvailable && (
              <label className={`global-switch rs-calculation-toggle ${component.reroll.enabled ? 'active' : ''}`}>
                <span>{t('random.definition.reroll')}</span>
                <input
                  type="checkbox"
                  checked={component.reroll.enabled}
                  onChange={(event) => onChange({
                    reroll: { ...component.reroll, enabled: event.target.checked },
                  })}
                />
              </label>
            )}
          </div>
          {explosionAvailable && component.explosionMode !== builderExplosionModes.NEVER && (
            <div className="rs-explosion-settings">
              <label className="field">
                {t('random.definition.explosionMode')}
                <select value={component.explosionMode} onChange={(event) => onChange({ explosionMode: event.target.value })}>
                  <option value={builderExplosionModes.ALWAYS}>{t('random.definition.always')}</option>
                  <option value={builderExplosionModes.OPTION}>{t('random.definition.optionalAtUse')}</option>
                </select>
              </label>
              <label className="field">
                {t('random.definition.explosionTrigger')}
                <div className="rs-mode-value">
                  <select value={component.explosionTrigger} onChange={(event) => onChange({ explosionTrigger: event.target.value })}>
                    <option value={builderExplosionTriggers.MAXIMUM}>{t('random.definition.explosionMaximum')}</option>
                    <option value={builderExplosionTriggers.THRESHOLD}>{t('random.definition.explosionThreshold')}</option>
                  </select>
                  {component.explosionTrigger === builderExplosionTriggers.THRESHOLD && (
                    <input type="number" value={component.explosionThreshold} onChange={(event) => onChange({ explosionThreshold: event.target.value })} />
                  )}
                </div>
              </label>
            </div>
          )}
          {rerollAvailable && component.reroll.enabled && (
            <div className="rs-reroll-condition">
              <span>{t('random.definition.rerollCondition')}</span>
              <ConditionFields
                value={component.reroll}
                includeIterations
                onChange={(patch) => onChange({
                  reroll: { ...component.reroll, ...patch },
                })}
              />
            </div>
          )}
        </div>
      )}
      <div className="rs-group-calculation">
        <label className={`global-switch rs-calculation-toggle ${component.calculation.enabled ? 'active' : ''}`}>
          <span>{t('random.definition.groupCalculation')}</span>
          <input
            type="checkbox"
            checked={component.calculation.enabled}
            onChange={(event) => onChange({
              calculation: { ...component.calculation, enabled: event.target.checked },
            })}
          />
        </label>
        {component.calculation.enabled && (
          <CalculationFields
            calculation={component.calculation}
            rulePool={rulePool}
            onChange={(patch) => onChange({
              calculation: { ...component.calculation, ...patch },
            })}
          />
        )}
      </div>
    </div>
  );
}
