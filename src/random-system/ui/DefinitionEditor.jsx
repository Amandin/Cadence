import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import {
  buildRandomDefinition,
  builderDefinitionKinds,
  builderExplosionModes,
  createDefinitionDraft,
  definitionToDraft,
} from '../definitionBuilder.js';
import { compileRollCode } from '../rollCode.js';
import { executeRandomDefinition } from '../engine.js';
import { definitionIsReferenced } from '../combinations.js';
import { randomDefinitionVisuals } from '../definitionVisuals.js';
import { createResourceId } from '../resourceIds.js';
import { isRandomRuleEnabled, randomRuleIds } from '../rulePool.js';
import { createNoCodeExampleDraft } from '../noCodeExamples.js';
import { CalculationEditor } from './definition/CalculationEditor.jsx';
import { CombinationEditor } from './definition/CombinationEditor.jsx';
import { ComponentEditor } from './definition/ComponentEditor.jsx';
import { RollOptionsEditor } from './definition/RollOptionsEditor.jsx';
import { NoCodeExamplePicker } from './definition/NoCodeExamplePicker.jsx';
import { DefinitionVisual } from './DefinitionVisual.jsx';
import { RandomIcon } from './RandomIcons.jsx';
import { ResultView } from './ResultView.jsx';
import { DefinitionForm } from './UsePanel.jsx';

function sanitizeConditions(conditions, options) {
  const optionMap = new Map((options || []).map((option) => [option.id, option]));
  return (Array.isArray(conditions) ? conditions : conditions ? [conditions] : [])
    .filter((condition) => (
      optionMap.get(condition.optionId)?.choices?.some((choice) => choice.value === condition.equals)
    ));
}

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
              <DefinitionVisual visualId={definition.visualId} className="compact" decorative />
              <span className="rs-definition-list-label">{definition.name}</span>
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

export function DefinitionEditor({
  definitions,
  sources,
  rulePool,
  actions,
  onOpenResultOptions,
  noCodeOnly = false,
  initialNoCodeView = 'essential',
}) {
  const [selectedId, setSelectedId] = useState(definitions[0]?.id || '');
  const selected = definitions.find((item) => item.id === selectedId) || null;
  const [draft, setDraft] = useState(() => definitionToDraft(selected, sources));
  const [editorMode, setEditorMode] = useState(() => (selected?.code ? 'code' : 'guided'));
  const [rollCode, setRollCode] = useState(() => selected?.code || '1d20');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [noCodeView, setNoCodeView] = useState(initialNoCodeView === 'full' ? 'full' : 'essential');
  const [selectedExampleId, setSelectedExampleId] = useState('');
  const essentialOnly = draft.kind === builderDefinitionKinds.ROLL && noCodeView === 'essential';
  useEffect(() => {
    if (selected) {
      setDraft(definitionToDraft(selected, sources));
      setEditorMode(selected.code ? 'code' : 'guided');
      setRollCode(selected.code || '1d20');
      setPreviewOpen(false);
      setPreviewResult(null);
      setSelectedExampleId('');
    }
  }, [selected, sources]);

  const newDefinition = () => {
    setSelectedId('');
    setDraft(createDefinitionDraft(sources, definitions));
    setEditorMode('guided');
    setRollCode('1d20');
    setPreviewOpen(false);
    setPreviewResult(null);
    setSelectedExampleId('');
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
  const definitionFromEditor = () => (
    editorMode === 'code' && draft.kind === builderDefinitionKinds.ROLL
      ? compileRollCode(rollCode, {
        id: draft.id,
        name: draft.name,
        visualId: draft.visualId,
        exposed: draft.exposed,
        active: draft.active,
        sources,
      })
      : buildRandomDefinition(draft)
  );
  const save = () => {
    const definition = definitionFromEditor();
    const saved = actions.saveDefinition(definition);
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
  const duplicateComponent = (componentId) => setDraft((current) => {
    const source = current.components.find((component) => component.id === componentId);
    if (!source) return current;
    return {
      ...current,
      components: [...current.components, {
        ...source,
        id: createResourceId('component', source.label),
        label: source.label ? `${source.label} - copie` : `Groupe ${current.components.length + 1}`,
        enabledWhen: [...(source.enabledWhen || [])],
        explosionEnabledWhen: [...(source.explosionEnabledWhen || [])],
        reroll: {
          ...source.reroll,
          enabledWhen: [...(source.reroll?.enabledWhen || [])],
        },
        calculation: {
          ...source.calculation,
          counters: (source.calculation?.counters || []).map((counter) => ({
            ...counter,
            id: createResourceId('counter', counter.id),
          })),
        },
      }],
    };
  });
  const updateRollOptions = (rollOptions) => setDraft((current) => ({
    ...current,
    rollOptions,
    components: current.components.map((component) => ({
      ...component,
      enabledWhen: sanitizeConditions(component.enabledWhen, rollOptions),
      explosionEnabledWhen: sanitizeConditions(component.explosionEnabledWhen, rollOptions),
      reroll: {
        ...component.reroll,
        enabledWhen: sanitizeConditions(component.reroll?.enabledWhen, rollOptions),
      },
    })),
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
  const applyNoCodeExample = (exampleId) => {
    const example = createNoCodeExampleDraft(exampleId, sources);
    setDraft((current) => ({
      ...example,
      id: current.id,
      exposed: current.exposed,
      active: current.active,
    }));
    setEditorMode('guided');
    setNoCodeView('full');
    setPreviewOpen(false);
    setPreviewResult(null);
  };
  const explosionRuleAvailable = isRandomRuleEnabled(rulePool, randomRuleIds.EXPLOSIONS);
  const rerollRuleAvailable = isRandomRuleEnabled(rulePool, randomRuleIds.REROLLS);
  const selectedIsReferenced = selected
    ? definitionIsReferenced(definitions, selected.id)
    : false;
  let codeError = '';
  if (editorMode === 'code' && draft.kind === builderDefinitionKinds.ROLL) {
    try {
      compileRollCode(rollCode, { id: draft.id, name: draft.name, sources });
    } catch (error) {
      codeError = `${error.message}${Number.isFinite(error.position) ? ` (position ${error.position + 1})` : ''}`;
    }
  }
  const rollOptionsAreValid = (draft.rollOptions || []).every((option) => (
    option.choices?.length >= 2
    && option.choices.some((choice) => choice.value === option.defaultValue)
  ));
  const definitionIsValid = !codeError && rollOptionsAreValid && (draft.kind !== builderDefinitionKinds.COMBINATION
    || (
      draft.combination.choices.length > 0
      && draft.combination.choices.every((choice) => choice.definitionId)
    ));
  const definitionGroups = useMemo(() => ({
    exposed: definitions.filter((definition) => definition.exposed !== false),
    internal: definitions.filter((definition) => definition.exposed === false),
  }), [definitions]);
  const previewDefinition = useMemo(() => {
    if (draft.kind !== builderDefinitionKinds.ROLL || editorMode !== 'guided') return null;
    try {
      return buildRandomDefinition(draft);
    } catch {
      return null;
    }
  }, [draft, editorMode]);

  return (
    <div className="rs-config-workspace">
      <aside className="rs-config-list">
        <div className="rs-section-head">
          <div>
            <span className="rs-section-kicker">{t('random.definition.listKicker')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="roll" /></span>
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
              <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="roll" /></span>
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
        <div className={`rs-definition-meta ${essentialOnly ? 'essential' : ''}`}>
          <label className="field">
            {t('random.definition.name')}
            <input type="text" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          {!essentialOnly && <label className="field">
            {t('random.definition.type')}
            <select value={draft.kind} onChange={(event) => changeKind(event.target.value)}>
              <option value={builderDefinitionKinds.ROLL}>{t('random.definition.typeRoll')}</option>
              <option value={builderDefinitionKinds.COMBINATION}>{t('random.definition.typeCombination')}</option>
            </select>
          </label>}
          {!essentialOnly && <fieldset className="rs-definition-visual-picker">
            <legend>{t('random.definition.visual')}</legend>
            <div>
              {randomDefinitionVisuals.map((visual) => (
                <button
                  type="button"
                  className={draft.visualId === visual.id ? 'selected' : ''}
                  aria-pressed={draft.visualId === visual.id}
                  title={visual.label}
                  onClick={() => setDraft((current) => ({ ...current, visualId: visual.id }))}
                  key={visual.id}
                >
                  <DefinitionVisual visualId={visual.id} decorative />
                  <span>{visual.label}</span>
                </button>
              ))}
            </div>
          </fieldset>}
          {!essentialOnly && <label className={`global-switch rs-exposure-toggle ${draft.exposed || draft.kind === builderDefinitionKinds.COMBINATION ? 'active' : ''}`}>
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
          </label>}
        </div>
        {draft.kind === builderDefinitionKinds.ROLL ? (
          <>
            <div className="rs-no-code-intro">
              <div>
                <strong>{t('random.definition.noCodeTitle')}</strong>
                <p>{t('random.definition.noCodeHelp')}</p>
              </div>
              <div className="rs-segmented rs-no-code-view" aria-label={t('random.definition.noCodeView')}>
                <button type="button" className={essentialOnly ? 'selected' : ''} onClick={() => setNoCodeView('essential')}>{t('random.definition.noCodeEssential')}</button>
                <button type="button" className={!essentialOnly ? 'selected' : ''} onClick={() => setNoCodeView('full')}>{t('random.definition.noCodeFull')}</button>
              </div>
            </div>
            {!noCodeOnly && <div className="rs-segmented rs-code-mode" aria-label={t('random.definition.editorMode')}>
              <button type="button" className={editorMode === 'guided' ? 'selected' : ''} onClick={() => setEditorMode('guided')}>{t('random.definition.guidedMode')}</button>
              <button type="button" className={editorMode === 'code' ? 'selected' : ''} onClick={() => setEditorMode('code')}>{t('random.definition.codeMode')}</button>
            </div>}
            {editorMode === 'code' ? (
              <section className="rs-code-editor">
                <label className="field">
                  {t('random.definition.rollCode')}
                  <textarea rows="8" spellCheck="false" value={rollCode} onChange={(event) => setRollCode(event.target.value)} />
                </label>
                <p className="muted compact-help">{t('random.definition.rollCodeHelp')}</p>
                <details className="rs-code-reference">
                  <summary>{t('random.definition.rollCodeReference')}</summary>
                  <pre>{`Dés : 4d6, [pool]d10, max([pool]-[sang],0)d10
Succès : d10s>=6 ou d10>=6
Garder / relancer / exploser : 4d6kh3, d6r=1, d6!n3
Décider après le jet : d6!?, d6r?=1, 2d20kh1?
Calculs : min, max, abs, signe, puissance, arrondi.inf, arrondi.sup, si
Cartes : c@paquet, 3c@paquet(remise)
Traitements : valeur(...), marque(...), bonus.occurrence(...), table(@source)`}</pre>
                </details>
                {codeError && <p className="rule-warning" role="alert">{codeError}</p>}
              </section>
            ) : <>
            <NoCodeExamplePicker value={selectedExampleId} onChange={setSelectedExampleId} onApply={applyNoCodeExample} />
            {!essentialOnly && <label className={`global-switch rs-recursive-toggle ${draft.recursive ? 'active' : ''}`}>
              <span>
                <strong>{t('random.definition.recursive')}</strong>
                <small>{t('random.definition.recursiveHelp')}</small>
              </span>
              <input type="checkbox" checked={!!draft.recursive} onChange={(event) => setDraft((current) => ({ ...current, recursive: event.target.checked }))} />
            </label>}
            {!essentialOnly && <RollOptionsEditor options={draft.rollOptions || []} onChange={updateRollOptions} />}
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
                  rollOptions={draft.rollOptions || []}
                  essential={essentialOnly}
                  onChange={(patch) => updateComponent(component.id, patch)}
                  onDelete={() => setDraft((current) => ({
                    ...current,
                    components: current.components.filter((item) => item.id !== component.id),
                  }))}
                  onDuplicate={() => duplicateComponent(component.id)}
                  key={component.id}
                />
              ))}
            </div>
            <CalculationEditor draft={draft} rulePool={rulePool} setDraft={setDraft} sources={sources} essential={essentialOnly} />
            {previewOpen && previewDefinition && (
              <section className="rs-definition-preview">
                <div className="rs-subhead">
                  <div>
                    <h3>{t('random.definition.tryTitle')}</h3>
                    <p className="muted compact-help">{t('random.definition.tryHelp')}</p>
                  </div>
                  <button type="button" className="small-btn" onClick={() => { setPreviewOpen(false); setPreviewResult(null); }}>{t('common.close')}</button>
                </div>
                <DefinitionForm
                  definition={previewDefinition}
                  definitions={[previewDefinition, ...definitions.filter((definition) => definition.id !== previewDefinition.id)]}
                  sources={sources}
                  runLabel={t('random.definition.tryAction')}
                  showHeader={false}
                  onRun={(_definitionId, parameters, options, instances) => executeRandomDefinition({
                    definition: previewDefinition,
                    sources,
                    parameters,
                    options,
                    instances,
                  })}
                  onResult={setPreviewResult}
                />
                {previewResult?.kind === 'random-roll' && <ResultView result={previewResult} />}
              </section>
            )}
            </>}
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
        <div className="rs-definition-editor-actions">
          {editorMode === 'guided' && draft.kind === builderDefinitionKinds.ROLL && (
            <button type="button" className="small-btn" disabled={!previewDefinition} onClick={() => { setPreviewOpen(true); setPreviewResult(null); }}>
              {t('random.definition.tryBeforeSave')}
            </button>
          )}
          <button type="button" className="primary rs-save-resource" disabled={!definitionIsValid} onClick={save}>
            {t('common.save')}
          </button>
        </div>
      </section>
    </div>
  );
}
