import { useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { uiSymbols } from '../../uiAssets.js';
import { IconeRepliFichette } from '../../interface/commun/ComposantsCommuns.jsx';
import {
  randomKitIsLoaded,
  randomKitIsStrictlyActive,
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
  randomKitResources,
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

function policyLabel(policy) {
  return t(`random.kits.policy.${policy}`);
}

function initiativeLabel(mode) {
  return t(`random.kits.initiative.${mode}`);
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

function kitSummary(kit) {
  const resources = randomKitResources(kit);
  const exposedDefinitions = resources.definitions.filter((definition) => definition.exposed !== false);
  const internalCount = resources.definitions.length - exposedDefinitions.length;
  return {
    sourceCount: resources.sources.length,
    definitionNames: exposedDefinitions.map((definition) => definition.name),
    description: kit.description || '',
    internalCount,
    initiative: initiativeLabel(kit.initiative.mode),
    policy: policyLabel(kit.applicationPolicy),
  };
}

function KitListItem({ kit, state, actions }) {
  const summary = kitSummary(kit);
  const loaded = randomKitIsLoaded(state, kit);
  const active = randomKitIsStrictlyActive(state, kit);
  return (
    <div className={`rs-config-list-item rs-kit-list-item ${active ? 'active' : ''}`}>
      <div className="rs-kit-title-row">
        <span className="rs-resource-title">
          <span>{kit.label}</span>
        </span>
        <div className="rs-kit-command-row">
          <button
            type="button"
            className="small-btn rs-kit-load-btn"
            disabled={loaded}
            onClick={() => actions.loadRandomKit(kit.id)}
          >
            {t('random.kits.load')}
          </button>
          {active ? (
            <span className="rs-kit-active-mark" role="img" aria-label={t('random.kits.active')} title={t('random.kits.active')}>
              <img className="rs-kit-active-logo light-logo" src="/branding/button-cadence-light.svg" alt="" />
              <img className="rs-kit-active-logo dark-logo" src="/branding/button-cadence-dark.svg" alt="" />
            </span>
          ) : (
            <button type="button" className="small-btn rs-kit-activate-btn" onClick={() => actions.activateRandomKit(kit.id)}>
              {t('random.kits.activate')}
            </button>
          )}
        </div>
      </div>
      <small>{kit.catalog ? t('random.kits.catalog') : t('random.kits.custom')}</small>
      <p className="rs-kit-description">{summary.description || t('random.kits.noDescription')}</p>
      <div className="rs-kit-summary">
        <span>{t('random.kits.summary.sources', { count: summary.sourceCount })}</span>
        <span>{t('random.kits.summary.definitions', { count: summary.definitionNames.length })}</span>
        {summary.internalCount > 0 && <span>{t('random.kits.summary.internal', { count: summary.internalCount })}</span>}
        <span>{summary.initiative}</span>
        <span>{summary.policy}</span>
      </div>
      {!kit.catalog && (
        <div className="rs-kit-actions">
          <button type="button" className="danger-btn" onClick={() => actions.deleteRandomKit(kit.id)}>{t('common.delete')}</button>
        </div>
      )}
    </div>
  );
}

export function RandomKitManager({ state, actions }) {
  const exposedDefinitions = useMemo(
    () => state.definitions.filter((definition) => definition.exposed !== false),
    [state.definitions],
  );
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const customKits = state.randomKits || [];
  const catalogKits = randomKitCatalog.map((kit) => ({ ...kit, catalog: true }));
  const personalKits = customKits.map((kit) => ({ ...kit, catalog: false }));
  const activeExposedDefinitions = exposedDefinitions.filter((definition) => definition.active !== false);
  const snapshotDefinitions = collectDefinitionsWithDependencies(activeExposedDefinitions.map((definition) => definition.id), state.definitions);
  const internalDefinitionCount = snapshotDefinitions.length - activeExposedDefinitions.length;
  const referencedSourceIds = unique([
    ...snapshotDefinitions.flatMap(sourceIdsForDefinition),
  ]);
  const selectedSources = state.sources.filter((source) => referencedSourceIds.includes(source.id));
  const canSave = name.trim() && activeExposedDefinitions.length > 0;
  const activeRollCount = activeExposedDefinitions.length;

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

  return (
    <div className="rs-config-workspace rs-kit-manager">
      <aside className="rs-config-list">
        <div className="rs-section-head">
          <div className="rs-section-copy">
            <span className="rs-section-kicker">{t('random.config.kits')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true">{uiSymbols.add}</span>
              <h3>{t('random.kits.savedGroups')}</h3>
            </div>
            <p className="muted compact-help">{t('random.kits.savedGroupsHelp')}</p>
          </div>
        </div>
        <details className="rs-kit-list-group rs-kit-catalog">
          <summary>
            <IconeRepliFichette repliee className="rs-kit-catalog-arrow" />
            <span>{t('random.kits.savedGroupsKicker')}</span>
            <small>{catalogKits.length}</small>
          </summary>
          <div className="rs-kit-list">
            {catalogKits.map((kit) => <KitListItem kit={kit} state={state} actions={actions} key={kit.id} />)}
          </div>
        </details>
        {personalKits.length > 0 && (
          <section className="rs-kit-list-group rs-kit-personal">
            <h4>{t('random.kits.personalGroups')}</h4>
            <div className="rs-kit-list">
              {personalKits.map((kit) => <KitListItem kit={kit} state={state} actions={actions} key={kit.id} />)}
            </div>
          </section>
        )}
      </aside>
      <section className="rs-config-editor">
        <div className="rs-section-head">
          <div className="rs-section-copy">
            <span className="rs-section-kicker">{t('random.kits.availableKicker')}</span>
            <div className="rs-heading-with-mark">
              <span className="rs-heading-mark" aria-hidden="true">{uiSymbols.add}</span>
              <h2>{t('random.config.rollKits')}</h2>
            </div>
            <p className="muted compact-help">{t('random.kits.pageHelp')}</p>
          </div>
        </div>
        <section className="rs-kit-definition-picker">
          <h3>{t('random.kits.activeRolls')}</h3>
          <p className="muted compact-help">{t('random.kits.activeRollsHelp', { count: activeRollCount })}</p>
          {exposedDefinitions.map((definition) => (
            <label className={`global-switch ${definition.active !== false ? 'active' : ''}`} key={definition.id}>
              <span>{definition.name}</span>
              <input
                type="checkbox"
                checked={definition.active !== false}
                onChange={(event) => actions.setDefinitionActive(definition.id, event.target.checked)}
              />
            </label>
          ))}
        </section>
        <section className="rs-kit-save-panel">
          <div className="rs-section-head">
            <div>
              <h3>{t('random.kits.saveCurrent')}</h3>
              <p className="muted compact-help">{t('random.kits.snapshotHelp', { count: activeRollCount })}</p>
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
