import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { RandomIcon } from './RandomIcons.jsx';
import {
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
} from '../rulePresetKits.js';

function sourceIdsForDefinition(definition) {
  return [
    ...definition.components.flatMap((component) => {
      if (component.source.kind === 'fixed') return [component.source.value];
      const parameter = definition.parameters.find((item) => item.id === component.source.parameterId);
      return parameter?.type === 'source' ? [parameter.defaultValue] : [];
    }),
    ...definition.pipeline.filter((step) => step.type === 'lookup-table').map((step) => step.sourceId),
  ].filter(Boolean);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function referencedDefinitionIds(definition) {
  return definition.pipeline
    .filter((step) => step.type === 'repeat-select')
    .flatMap((step) => Object.values(step.variants || {}).map((variant) => variant?.definitionId))
    .filter(Boolean);
}

function collectDefinitionsWithDependencies(selectedDefinitionIds, definitions) {
  const byId = new Map(definitions.map((definition) => [definition.id, definition]));
  const selected = new Set(selectedDefinitionIds);
  const visit = (definitionId) => {
    const definition = byId.get(definitionId);
    if (!definition) return;
    referencedDefinitionIds(definition).forEach((dependencyId) => {
      if (selected.has(dependencyId)) return;
      selected.add(dependencyId);
      visit(dependencyId);
    });
  };
  selectedDefinitionIds.forEach(visit);
  return definitions.filter((definition) => selected.has(definition.id));
}

function AvailabilityRow({ name, kind, exposed, quick, required = false, onExposedChange, onQuickChange }) {
  const isExposed = exposed || required;
  return <div className={`rs-roll-availability-row ${isExposed ? 'is-exposed' : ''} ${quick ? 'is-quick' : ''}`}>
    <span><strong>{name}</strong><small>{kind}{required && ` · ${t('random.kits.requiredForInitiative')}`}</small></span>
    <label className={`global-switch ${isExposed ? 'active' : ''}`}><span>{t('random.kits.exposed')}</span><input type="checkbox" checked={isExposed} disabled={required} onChange={(event) => onExposedChange(event.target.checked)} /></label>
    <label className={`global-switch ${quick ? 'active' : ''}`}><span>{t('random.kits.quick')}</span><input type="checkbox" checked={quick} disabled={!isExposed} onChange={(event) => onQuickChange(event.target.checked)} /></label>
  </div>;
}

export function RandomKitManager({ state, actions, requiredDefinitionIds = [] }) {
  const configurableDefinitions = useMemo(
    () => state.definitions.filter((definition) => definition.exposed !== false),
    [state.definitions],
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedKitId, setSelectedKitId] = useState('');
  const customKits = state.randomKits || [];
  const catalogKits = randomKitCatalog.map((kit) => ({ ...kit, catalog: true }));
  const personalKits = customKits.map((kit) => ({ ...kit, catalog: false }));
  const selectedKit = [...catalogKits, ...personalKits].find((kit) => kit.id === selectedKitId) || null;
  const activeExposedDefinitions = configurableDefinitions.filter((definition) => definition.active !== false);
  const exposedContainers = (state.tokenContainers || []).filter((container) => container.exposed !== false);
  const quickRollCount = activeExposedDefinitions.filter((definition) => definition.quickAccess !== false).length
    + exposedContainers.filter((container) => container.quickAccess !== false).length;
  const snapshotDefinitions = collectDefinitionsWithDependencies(activeExposedDefinitions.map((definition) => definition.id), state.definitions);
  const internalDefinitionCount = snapshotDefinitions.length - activeExposedDefinitions.length;
  const referencedSourceIds = unique([
    ...snapshotDefinitions.flatMap(sourceIdsForDefinition),
  ]);
  const selectedSources = state.sources.filter((source) => referencedSourceIds.includes(source.id));
  const canSave = name.trim() && activeExposedDefinitions.length > 0;
  const activeRollCount = activeExposedDefinitions.length + exposedContainers.length;

  const saveKit = () => {
    if (!canSave) return;
    const saved = actions.saveRandomKit({
      label: name.trim(),
      description: description.trim(),
      familyTags: ['custom'],
      sourceIds: referencedSourceIds,
      sources: selectedSources,
      definitions: snapshotDefinitions,
      initiative: {
        mode: randomKitInitiativeModes.MANUAL,
        defaultDefinitionId: null,
        defaultSourceId: null,
        defaultCardCount: 0,
        tiebreaker: 'manual',
        order: 'manual',
      },
      applicationPolicy: randomKitApplicationPolicies.MANUAL_ONLY,
    });
    if (saved) {
      setName('');
      setDescription('');
    }
  };

  const applyKitSelection = () => {
    if (!selectedKit) return;
    (actions.applyRandomKitSelection || actions.activateRandomKit)?.(selectedKit.id);
  };

  return (
    <div className="rs-config-workspace rs-kit-manager rs-kit-manager-single">
      <section className="rs-config-editor">
        <div className="rs-section-head">
          <div className="rs-section-copy">
            <span className="rs-section-kicker">{t('random.kits.availableKicker')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true"><RandomIcon name="add" /></span>
              <h2>{t('random.config.rollKits')}</h2>
            </div>
            <p className="muted compact-help">{t('random.kits.pageHelp')}</p>
          </div>
        </div>
        <section className="rs-kit-quick-apply">
          <div>
            <h3>{t('random.kits.quickApply')}</h3>
            <p className="muted compact-help">{t('random.kits.quickApplyHelp')}</p>
          </div>
          <label className="field">
            {t('random.kits.savedGroups')}
            <select value={selectedKitId} onChange={(event) => setSelectedKitId(event.target.value)}>
              <option value="">{t('random.kits.choose')}</option>
              <optgroup label={t('random.kits.catalog')}>
                {catalogKits.map((kit) => <option value={kit.id} key={kit.id}>{kit.label}</option>)}
              </optgroup>
              {personalKits.length > 0 && <optgroup label={t('random.kits.personalGroups')}>
                {personalKits.map((kit) => <option value={kit.id} key={kit.id}>{kit.label}</option>)}
              </optgroup>}
            </select>
          </label>
          <button type="button" className="small-btn" disabled={!selectedKit} onClick={applyKitSelection}>{t('random.kits.apply')}</button>
        </section>
        <section className="rs-kit-definition-picker">
          <h3>{t('random.kits.availabilityTitle')}</h3>
          <p className="muted compact-help">{t('random.kits.availabilityHelp', { exposed: activeRollCount, quick: quickRollCount })}</p>
          <div className="rs-roll-availability-list">{configurableDefinitions.map((definition) => {
            const requiredForInitiative = requiredDefinitionIds.includes(definition.id);
            return <AvailabilityRow key={definition.id} name={definition.name} kind={t('random.kits.resourceRoll')} exposed={definition.active !== false} quick={definition.active !== false && definition.quickAccess !== false} required={requiredForInitiative} onExposedChange={(value) => actions.setDefinitionActive(definition.id, value)} onQuickChange={(value) => actions.setDefinitionQuickAccess(definition.id, value)} />;
          })}
          {(state.tokenContainers || []).map((container) => <AvailabilityRow key={container.id} name={container.name} kind={t('random.kits.resourceContainer')} exposed={container.exposed !== false} quick={container.exposed !== false && container.quickAccess !== false} onExposedChange={(value) => actions.setTokenContainerExposed(container.id, value)} onQuickChange={(value) => actions.setTokenContainerQuickAccess(container.id, value)} />)}
          </div>
        </section>
        <section className="rs-kit-save-panel">
          <div className="rs-section-head">
            <div>
              <h3>{t('random.kits.saveCurrent')}</h3>
              <p className="muted compact-help">{t('random.kits.snapshotHelp', { count: activeExposedDefinitions.length })}</p>
            </div>
            <button type="button" className="primary rs-save-resource rs-kit-save-button" onClick={saveKit} disabled={!canSave}>{t('random.kits.save')}</button>
          </div>
          <div className="rs-kit-save-fields">
            <label className="field">
              {t('random.kits.name')}
              <input type="text" value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label className="field">
              {t('random.kits.description')}
              <textarea rows="3" value={description} onChange={(event) => setDescription(event.target.value)} />
            </label>
          </div>
          <div className="rs-kit-snapshot-summary">
            <span>{t('random.kits.summary.definitions', { count: activeExposedDefinitions.length })}</span>
            <span>{t('random.kits.summary.sources', { count: selectedSources.length })}</span>
            {internalDefinitionCount > 0 && <span>{t('random.kits.summary.internal', { count: internalDefinitionCount })}</span>}
          </div>
          <p className="muted compact-help">{t('random.kits.saveHelp', { sources: selectedSources.length, definitions: activeExposedDefinitions.length })}</p>
          {internalDefinitionCount > 0 && <p className="muted compact-help">{t('random.kits.internalHelp', { count: internalDefinitionCount })}</p>}
        </section>
      </section>
    </div>
  );
}
