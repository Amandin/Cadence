import { t } from '../../../i18n/index.js';
import {
  builderExplosionModes,
  builderExplosionTriggers,
  builderModes,
} from '../../definitionBuilder.js';
import { CalculationFields } from './CalculationFields.jsx';
import {
  ActivationConditionsField,
  ConditionFields,
  ModeValueField,
} from './SharedFields.jsx';

function SourceChoiceField({ component, sources, onChange }) {
  if (component.sourceMode !== builderModes.REQUEST) return null;
  const selected = new Set(component.sourceChoices || []);
  const toggle = (sourceId, enabled) => onChange({
    sourceChoices: enabled
      ? [...selected, sourceId]
      : [...selected].filter((id) => id !== sourceId),
  });
  return (
    <fieldset className="rs-source-choices">
      <legend>{t('random.definition.sourceChoices')}</legend>
      <p className="muted compact-help">{t('random.definition.sourceChoicesHelp')}</p>
      <div>
        {sources.map((source) => (
          <label key={source.id}>
            <input
              type="checkbox"
              checked={!selected.size || selected.has(source.id)}
              onChange={(event) => {
                if (!selected.size && !event.target.checked) {
                  onChange({ sourceChoices: sources.filter((item) => item.id !== source.id).map((item) => item.id) });
                  return;
                }
                toggle(source.id, event.target.checked);
              }}
            />
            <span>{source.name}</span>
          </label>
        ))}
      </div>
      {selected.size > 0 && (
        <button type="button" className="small-btn" onClick={() => onChange({ sourceChoices: [] })}>
          {t('random.definition.allSources')}
        </button>
      )}
    </fieldset>
  );
}

export function ComponentEditor({
  component,
  index,
  sources,
  canDelete,
  rulePool,
  rollOptions = [],
  essential = false,
  onChange,
  onDelete,
  onDuplicate,
}) {
  const uniformSources = sources.filter((source) => source.kind === 'uniform');
  const directSources = uniformSources.some((source) => source.id === component.sourceId)
    ? uniformSources
    : [...uniformSources, ...sources.filter((source) => source.id === component.sourceId)];
  const advancedReroll = component.reroll.operator !== 'eq'
    || Number(component.reroll.maxIterations) !== 1;

  return (
    <div className="rs-component-editor">
      <div className="rs-subhead">
        <h4>{t('random.definition.group', { index: index + 1 })}</h4>
        <div className="rs-inline-actions">
          {!essential && onDuplicate && <button type="button" className="small-btn" onClick={onDuplicate}>{t('random.definition.duplicate')}</button>}
          {canDelete && <button type="button" className="small-btn" onClick={onDelete}>{t('common.delete')}</button>}
        </div>
      </div>
      {!essential && <label className="field">
        {t('random.definition.groupName')}
        <input
          type="text"
          value={component.label}
          placeholder={t('random.definition.groupNameOptional')}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </label>}
      {!essential && <div className="field">
        <span>{t('random.definition.groupColor')}</span>
        <div className="rs-color-field">
          <label className={`global-switch rs-color-toggle ${component.color ? 'active' : ''}`}>
            <span>{t('random.definition.useGroupColor')}</span>
            <input
              type="checkbox"
              checked={!!component.color}
              onChange={(event) => onChange({ color: event.target.checked ? '#2f8f83' : '' })}
            />
          </label>
          {component.color && (
            <input type="color" value={component.color} aria-label={t('random.definition.groupColor')} onChange={(event) => onChange({ color: event.target.value })} />
          )}
        </div>
      </div>}
      <label className="field">
        {t('random.definition.source')}
        <div className="rs-mode-value">
          <select value={component.sourceMode} onChange={(event) => onChange({ sourceMode: event.target.value })}>
            <option value={builderModes.FIXED}>{t('random.definition.fixed')}</option>
            <option value={builderModes.REQUEST}>{t('random.definition.requestAtUse')}</option>
          </select>
          {component.sourceMode === builderModes.FIXED && (
            <select value={component.sourceId} onChange={(event) => onChange({ sourceId: event.target.value })}>
              {directSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
            </select>
          )}
        </div>
      </label>
      <div className="field">
        <span>{t('random.definition.count')}</span>
        <ModeValueField
          label={t('random.definition.count')}
          mode={component.countMode}
          value={component.count}
          min="0"
          max="1000"
          onModeChange={(countMode) => onChange({ countMode })}
          onValueChange={(count) => onChange({ count })}
        />
      </div>
      {!essential && <ActivationConditionsField
        label={t('random.definition.groupAvailability')}
        value={component.enabledWhen}
        options={rollOptions}
        onChange={(enabledWhen) => onChange({ enabledWhen })}
      />}
      {!essential && <label className="field">
        {t('random.definition.groupContribution')}
        <select value={component.contribution || 'add'} onChange={(event) => onChange({ contribution: event.target.value })}>
          <option value="add">{t('random.definition.groupContributionAdd')}</option>
          <option value="subtract">{t('random.definition.groupContributionSubtract')}</option>
        </select>
      </label>}
      {!essential && <SourceChoiceField component={component} sources={uniformSources} onChange={onChange} />}

      {!essential && <div className="rs-draw-treatments rs-direct-treatments">
        <div className="rs-draw-treatment-toggles">
          <label className={`global-switch rs-calculation-toggle ${component.explosionMode !== builderExplosionModes.NEVER ? 'active' : ''}`}>
            <span>{t('random.definition.explosionMaximum')}</span>
            <input
              type="checkbox"
              checked={component.explosionMode !== builderExplosionModes.NEVER}
              onChange={(event) => onChange({
                explosionMode: event.target.checked ? builderExplosionModes.ALWAYS : builderExplosionModes.NEVER,
                explosionTrigger: event.target.checked ? builderExplosionTriggers.MAXIMUM : component.explosionTrigger,
              })}
            />
          </label>
          <label className={`global-switch rs-calculation-toggle ${component.reroll.enabled ? 'active' : ''}`}>
            <span>{t('random.definition.rerollOnce')}</span>
            <input
              type="checkbox"
              checked={component.reroll.enabled}
              onChange={(event) => onChange({ reroll: { ...component.reroll, enabled: event.target.checked } })}
            />
          </label>
        </div>
        <div className="rs-editor-grid">
          {component.explosionMode !== builderExplosionModes.NEVER && (
            <label className="field">
              {t('random.definition.explosionLimit')}
              <input type="number" min="1" max="100" value={component.explosionLimit ?? 100} onChange={(event) => onChange({ explosionLimit: event.target.value })} />
            </label>
          )}
          {component.reroll.enabled && (
            <label className="field">
              {advancedReroll ? t('random.definition.rerollAdvancedActive') : t('random.definition.rerollFace')}
              <input type="number" value={component.reroll.value} onChange={(event) => onChange({ reroll: { ...component.reroll, value: event.target.value } })} />
            </label>
          )}
        </div>
        {component.explosionMode !== builderExplosionModes.NEVER && <ActivationConditionsField
          label={t('random.definition.explosionAvailability')}
          value={component.explosionEnabledWhen}
          options={rollOptions}
          onChange={(explosionEnabledWhen) => onChange({ explosionEnabledWhen })}
        />}
        {component.reroll.enabled && <ActivationConditionsField
          label={t('random.definition.rerollAvailability')}
          value={component.reroll.enabledWhen}
          options={rollOptions}
          onChange={(enabledWhen) => onChange({ reroll: { ...component.reroll, enabledWhen } })}
        />}
      </div>}

      {!essential && <details className="rs-no-code-advanced">
        <summary>
          <span>{t('random.definition.noCodeAdvanced')}</span>
          <small>{t('random.definition.noCodeAdvancedGroupHelp')}</small>
        </summary>
        <div className="rs-no-code-advanced-body">
          {component.sourceMode === builderModes.FIXED && sources.length > uniformSources.length && (
            <label className="field">
              {t('random.definition.advancedSource')}
              <select value={component.sourceId} onChange={(event) => onChange({ sourceId: event.target.value })}>
                {sources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}
              </select>
            </label>
          )}
          {component.explosionMode !== builderExplosionModes.NEVER && (
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
          )}
          {component.reroll.enabled && (
            <div className="rs-reroll-condition">
              <span>{t('random.definition.rerollCondition')}</span>
              <ConditionFields
                value={component.reroll}
                includeIterations
                onChange={(patch) => onChange({ reroll: { ...component.reroll, ...patch } })}
              />
            </div>
          )}
          <div className="rs-group-calculation">
            <label className={`global-switch rs-calculation-toggle ${component.calculation.enabled ? 'active' : ''}`}>
              <span>{t('random.definition.groupCalculation')}</span>
              <input
                type="checkbox"
                checked={component.calculation.enabled}
                onChange={(event) => onChange({ calculation: { ...component.calculation, enabled: event.target.checked } })}
              />
            </label>
            {component.calculation.enabled && (
              <CalculationFields
                calculation={component.calculation}
                rulePool={rulePool}
                advanced
                onChange={(patch) => onChange({ calculation: { ...component.calculation, ...patch } })}
              />
            )}
          </div>
        </div>
      </details>}
    </div>
  );
}
