import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import {
  buildRandomDefinition,
  builderDefinitionKinds,
  builderExplosionModes,
  createDefinitionDraft,
  definitionToDraft,
} from '../definitionBuilder.js';
import { definitionIsReferenced } from '../combinations.js';
import { createResourceId } from '../resourceIds.js';
import { isRandomRuleEnabled, randomRuleIds } from '../rulePool.js';
import { CalculationEditor } from './definition/CalculationEditor.jsx';
import { CombinationEditor } from './definition/CombinationEditor.jsx';
import { ComponentEditor } from './definition/ComponentEditor.jsx';

function DefinitionListGroup({
  definitions,
  label,
  selectedId,
  allDefinitions,
  onSelect,
}) {
  if (!definitions.length) return null;
  return (
    <section className="rs-definition-list-group">
      <h4>{label}</h4>
      {definitions.map((definition) => {
        const unusedInternal = definition.exposed === false
          && !definitionIsReferenced(allDefinitions, definition.id);
        return (
          <button
            type="button"
            className={definition.id === selectedId ? 'selected' : ''}
            onClick={() => onSelect(definition.id)}
            key={definition.id}
          >
            <span className="rs-definition-list-name">
              <span>{definition.name}</span>
              {unusedInternal && (
                <span
                  className="rs-definition-warning"
                  role="img"
                  aria-label={t('random.definition.unusedInternal')}
                  title={t('random.definition.unusedInternal')}
                >
                  !
                </span>
              )}
            </span>
            <small>
              {definition.kind === builderDefinitionKinds.COMBINATION
                ? t('random.definition.typeCombination')
                : t('random.definition.typeRoll')}
            </small>
          </button>
        );
      })}
    </section>
  );
}

export function DefinitionEditor({ definitions, sources, rulePool, actions, onOpenResultOptions }) {
  const [selectedId, setSelectedId] = useState(definitions[0]?.id || '');
  const selected = definitions.find((item) => item.id === selectedId) || null;
  const [draft, setDraft] = useState(() => definitionToDraft(selected, sources));
  useEffect(() => {
    if (selected) setDraft(definitionToDraft(selected, sources));
  }, [selected, sources]);

  const newDefinition = () => {
    setSelectedId('');
    setDraft(createDefinitionDraft(sources, definitions));
  };
  const duplicateDefinition = () => {
    const next = {
      ...draft,
      id: createResourceId('definition', draft.name),
      name: `${draft.name} - copie`,
      components: draft.components.map((component) => ({
        ...component,
        id: createResourceId('component', component.label),
      })),
    };
    setSelectedId('');
    setDraft(next);
  };
  const save = () => {
    const saved = actions.saveDefinition(buildRandomDefinition(draft));
    setSelectedId(saved.id);
  };
  const remove = () => {
    if (!selected) return;
    if (actions.deleteDefinition(selected.id)) newDefinition();
  };
  const updateComponent = (componentId, patch) => setDraft((current) => ({
    ...current,
    components: current.components.map((component) => (
      component.id === componentId ? { ...component, ...patch } : component
    )),
  }));
  const addComponent = () => setDraft((current) => ({
    ...current,
    components: [...current.components, {
      ...createDefinitionDraft(sources, definitions).components[0],
      id: createResourceId('component'),
      label: `Groupe ${current.components.length + 1}`,
    }],
  }));
  const changeKind = (kind) => setDraft((current) => {
    const fallbackDefinitionId = definitions.find((definition) => (
      definition.id !== current.id && definition.kind !== builderDefinitionKinds.COMBINATION
    ))?.id || '';
    return {
      ...current,
      kind,
      exposed: kind === builderDefinitionKinds.COMBINATION ? true : current.exposed,
      combination: {
        ...current.combination,
        enabled: kind === builderDefinitionKinds.COMBINATION,
        choices: current.combination.choices.map((choice) => ({
          ...choice,
          definitionId: choice.definitionId || fallbackDefinitionId,
        })),
      },
    };
  });
  const explosionRuleAvailable = isRandomRuleEnabled(rulePool, randomRuleIds.EXPLOSIONS);
  const rerollRuleAvailable = isRandomRuleEnabled(rulePool, randomRuleIds.REROLLS);
  const selectedIsReferenced = selected
    ? definitionIsReferenced(definitions, selected.id)
    : false;
  const definitionIsValid = draft.kind !== builderDefinitionKinds.COMBINATION
    || (
      draft.combination.choices.length > 0
      && draft.combination.choices.every((choice) => choice.definitionId)
    );
  const definitionGroups = useMemo(() => ({
    exposed: definitions.filter((definition) => definition.exposed !== false),
    internal: definitions.filter((definition) => definition.exposed === false),
  }), [definitions]);

  return (
    <div className="rs-config-workspace">
      <aside className="rs-config-list">
        <div className="rs-section-head">
          <div>
            <span className="rs-section-kicker">{t('random.definition.listKicker')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true">✦</span>
              <h3>{t('random.config.definitions')}</h3>
            </div>
            <p className="muted compact-help">{t('random.definition.listHelp')}</p>
          </div>
          <button type="button" className="small-btn" onClick={newDefinition}>{t('common.add')}</button>
        </div>
        <DefinitionListGroup
          definitions={definitionGroups.exposed}
          label={t('random.definition.exposedGroup')}
          selectedId={selectedId}
          allDefinitions={definitions}
          onSelect={setSelectedId}
        />
        <DefinitionListGroup
          definitions={definitionGroups.internal}
          label={t('random.definition.internalGroup')}
          selectedId={selectedId}
          allDefinitions={definitions}
          onSelect={setSelectedId}
        />
      </aside>
      <section className="rs-config-editor">
        <div className="rs-section-head">
          <div className="rs-section-copy">
            <span className="rs-section-kicker">{draft.kind === builderDefinitionKinds.COMBINATION ? t('random.definition.typeCombination') : t('random.definition.typeRoll')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true">✦</span>
              <h2>{selected ? t('random.definition.edit') : t('random.definition.new')}</h2>
            </div>
          </div>
          <div className="rs-section-actions">
            {onOpenResultOptions && <button type="button" className="small-btn" onClick={onOpenResultOptions}>{t('random.rules.open')}</button>}
            {selected && <button type="button" className="small-btn" onClick={duplicateDefinition}>{t('random.definition.duplicate')}</button>}
            {selected && (
              <button
                type="button"
                className="danger-btn"
                disabled={selectedIsReferenced}
                title={selectedIsReferenced ? t('random.definition.usedByCombination') : undefined}
                onClick={remove}
              >
                {t('common.delete')}
              </button>
            )}
          </div>
        </div>
        <div className="rs-definition-meta">
          <label className="field">
            {t('random.definition.name')}
            <input type="text" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            {t('random.definition.type')}
            <select value={draft.kind} onChange={(event) => changeKind(event.target.value)}>
              <option value={builderDefinitionKinds.ROLL}>{t('random.definition.typeRoll')}</option>
              <option value={builderDefinitionKinds.COMBINATION}>{t('random.definition.typeCombination')}</option>
            </select>
          </label>
          <label className={`global-switch rs-exposure-toggle ${draft.exposed || draft.kind === builderDefinitionKinds.COMBINATION ? 'active' : ''}`}>
            <span>
              {draft.kind === builderDefinitionKinds.COMBINATION
                ? t('random.definition.alwaysExposed')
                : t('random.definition.exposed')}
            </span>
            <input
              type="checkbox"
              checked={draft.exposed || draft.kind === builderDefinitionKinds.COMBINATION}
              disabled={draft.kind === builderDefinitionKinds.COMBINATION}
              onChange={(event) => setDraft((current) => ({ ...current, exposed: event.target.checked }))}
            />
          </label>
        </div>
        {draft.kind === builderDefinitionKinds.ROLL ? (
          <>
            <div className="rs-components">
              <div className="rs-subhead">
                <h3>{t('random.definition.groups')}</h3>
                <button type="button" className="small-btn" onClick={addComponent}>{t('common.add')}</button>
              </div>
              {draft.components.map((component, index) => (
                <ComponentEditor
                  component={component}
                  index={index}
                  sources={sources}
                  canDelete={draft.components.length > 1}
                  explosionAvailable={explosionRuleAvailable || component.explosionMode !== builderExplosionModes.NEVER}
                  rerollAvailable={rerollRuleAvailable || component.reroll.enabled}
                  rulePool={rulePool}
                  onChange={(patch) => updateComponent(component.id, patch)}
                  onDelete={() => setDraft((current) => ({
                    ...current,
                    components: current.components.filter((item) => item.id !== component.id),
                  }))}
                  key={component.id}
                />
              ))}
            </div>
            <CalculationEditor draft={draft} rulePool={rulePool} setDraft={setDraft} sources={sources} />
          </>
        ) : (
          <CombinationEditor
            combination={draft.combination}
            definitions={definitions}
            currentDefinitionId={draft.id}
            onChange={(next) => setDraft((current) => ({
              ...current,
              combination: { ...current.combination, ...next, enabled: true },
            }))}
          />
        )}
        <button type="button" className="primary rs-save-resource" disabled={!definitionIsValid} onClick={save}>
          {t('common.save')}
        </button>
      </section>
    </div>
  );
}
