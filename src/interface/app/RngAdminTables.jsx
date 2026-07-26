import { t } from '../../i18n/index.js';
import { createUniformSource, randomDefinitionKinds, randomSourceKinds } from '../../random-system/engine.js';
import { randomRuleCatalogue } from '../../random-system/rulePool.js';
import {
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
} from '../../random-system/rulePresetKits.js';
import { createTokenId } from '../../random-system/tokens.js';

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
const kitPolicyLabel = (policy) => t(`presetLibrary.rng.policy.${policy}`);
const definitionKindLabel = (kind) => t(`presetLibrary.rng.definitionKind.${kind}`);
const sourceKindLabel = (kind) => t(`presetLibrary.rng.sourceKind.${kind}`);

function Table({ columns, children, className = '' }) {
  return <div className="rng-admin-table-wrap"><table className={`rng-admin-table ${className}`.trim()}><thead><tr>{columns.map((column) => {
    const descriptor = typeof column === 'object' ? column : { label: column };
    return <th key={descriptor.key || descriptor.label} className={descriptor.className || ''} title={descriptor.title}>{descriptor.label}</th>;
  })}</tr></thead><tbody>{children}</tbody></table></div>;
}

function Section({ title, action, children }) {
  return <section className="rng-admin-section"><header><h3>{title}</h3>{action}</header>{children}</section>;
}

function KitTable({ state, actions }) {
  const customById = new Map((state.randomKits || []).map((kit) => [kit.id, kit]));
  const catalogIds = new Set(randomKitCatalog.map((kit) => kit.id));
  const kits = [
    ...randomKitCatalog.map((kit) => ({ ...kit, ...(customById.get(kit.id) || {}), persisted: customById.has(kit.id) })),
    ...(state.randomKits || []).filter((kit) => !catalogIds.has(kit.id)).map((kit) => ({ ...kit, persisted: true })),
  ];
  const availableDefinitions = (state.definitions || []).filter((definition) => definition.exposed !== false);
  const selectedIds = (kit) => new Set(Array.isArray(kit.definitionIds)
    ? kit.definitionIds
    : (kit.definitions || []).filter((definition) => definition.exposed !== false).map((definition) => definition.id));
  const update = (kit, patch) => actions.saveRandomKit?.({ ...kit, ...patch });
  const toggleDefinition = (kit, definition, exposed) => {
    const nextIds = selectedIds(kit);
    if (exposed) nextIds.add(definition.id);
    else nextIds.delete(definition.id);
    const embeddedById = new Map((kit.definitions || []).map((item) => [item.id, item]));
    if (exposed) embeddedById.set(definition.id, definition);
    update(kit, {
      definitionIds: [...nextIds],
      definitions: [...embeddedById.values()],
    });
  };
  const create = () => actions.saveRandomKit?.({
    id: uid('rng-kit'),
    label: t('presetLibrary.rng.newKit'),
    description: '',
    familyTags: ['custom'],
    sourceIds: [],
    sources: [],
    definitions: [],
    definitionIds: [],
    initiative: { mode: randomKitInitiativeModes.MANUAL },
    applicationPolicy: randomKitApplicationPolicies.ASK,
  });
  return <Section title={t('presetLibrary.rng.kits')} action={<button type="button" className="small-btn" onClick={create}>{t('common.add')}</button>}>
    <Table className="rng-admin-kit-table" columns={[
      t('random.tokens.name'),
      t('presetLibrary.rng.policy'),
      ...availableDefinitions.map((definition) => ({
        key: definition.id,
        label: definition.name,
        title: definition.name,
        className: 'rng-admin-exposure-heading',
      })),
      t('presetLibrary.table.manage'),
    ]}>
      {kits.map((kit) => {
        const exposedIds = selectedIds(kit);
        return <tr key={kit.id}>
        <td><input value={kit.label} onChange={(event) => update(kit, { label: event.target.value })} /></td>
        <td><select value={kit.applicationPolicy || randomKitApplicationPolicies.ASK} onChange={(event) => update(kit, { applicationPolicy: event.target.value })}>{Object.values(randomKitApplicationPolicies).map((policy) => <option value={policy} key={policy}>{kitPolicyLabel(policy)}</option>)}</select></td>
        {availableDefinitions.map((definition) => {
          return <td className="rng-admin-exposure-cell" key={definition.id}><input type="checkbox" checked={exposedIds.has(definition.id)} onChange={(event) => toggleDefinition(kit, definition, event.target.checked)} aria-label={t('presetLibrary.rng.exposeDraw', { name: definition.name })} title={definition.name} /></td>;
        })}
        <td><button type="button" className="danger-btn" disabled={!kit.persisted} onClick={() => actions.deleteRandomKit?.(kit.id)}>{t('common.delete')}</button></td>
      </tr>;
      })}
    </Table>
  </Section>;
}

function RuleTable({ state, actions }) {
  const enabled = new Set(state.rulePool?.enabledRuleIds || []);
  return <Section title={t('presetLibrary.rng.rules')} action={<div className="rng-admin-actions"><button type="button" className="small-btn" onClick={actions.useEssentialRules}>{t('random.rules.essential')}</button><button type="button" className="small-btn" onClick={actions.enableAllRules}>{t('random.rules.enableAll')}</button></div>}>
    <Table className="rng-admin-rule-matrix" columns={[t('presetLibrary.rng.ruleSet'), ...randomRuleCatalogue.map((rule) => t(rule.labelKey))]}>
      <tr><th scope="row">{t('random.rules.enabledCount', { count: enabled.size })}</th>{randomRuleCatalogue.map((rule) => <td key={rule.id}><input type="checkbox" checked={enabled.has(rule.id)} onChange={(event) => actions.setRuleEnabled?.(rule.id, event.target.checked)} aria-label={t(rule.labelKey)} /></td>)}</tr>
    </Table>
  </Section>;
}

function DefinitionTable({ state, actions }) {
  const create = () => actions.saveDefinition?.({
    id: uid('definition'),
    name: t('presetLibrary.rng.newDefinition'),
    kind: randomDefinitionKinds.ROLL,
    exposed: true,
    active: true,
    quickAccess: true,
    components: [],
    pipeline: [],
  });
  const update = (definition, patch) => actions.saveDefinition?.({ ...definition, ...patch });
  return <Section title={t('presetLibrary.rng.definitions')} action={<button type="button" className="small-btn" onClick={create}>{t('common.add')}</button>}>
    <Table columns={[t('random.tokens.name'), t('presetLibrary.rng.type'), t('presetLibrary.rng.active'), t('presetLibrary.rng.quick'), t('presetLibrary.rng.components'), t('presetLibrary.rng.steps'), t('presetLibrary.table.manage')]}>
      {(state.definitions || []).map((definition) => <tr key={definition.id}>
        <td><input value={definition.name} onChange={(event) => update(definition, { name: event.target.value })} /></td>
        <td><select value={definition.kind} onChange={(event) => update(definition, { kind: event.target.value })}>{Object.values(randomDefinitionKinds).map((kind) => <option value={kind} key={kind}>{definitionKindLabel(kind)}</option>)}</select></td>
        <td><input type="checkbox" checked={definition.active !== false} onChange={(event) => actions.setDefinitionActive?.(definition.id, event.target.checked)} /></td>
        <td><input type="checkbox" checked={definition.quickAccess !== false} onChange={(event) => actions.setDefinitionQuickAccess?.(definition.id, event.target.checked)} /></td>
        <td>{definition.components?.length || 0}</td>
        <td>{definition.pipeline?.length || 0}</td>
        <td><button type="button" className="danger-btn" onClick={() => actions.deleteDefinition?.(definition.id)}>{t('common.delete')}</button></td>
      </tr>)}
    </Table>
  </Section>;
}

function SourceTable({ state, actions }) {
  const create = () => actions.saveSource?.(createUniformSource({ id: uid('source'), name: t('presetLibrary.rng.newSource'), min: 1, max: 6 }));
  const update = (source, patch) => actions.saveSource?.({ ...source, ...patch });
  const count = (source) => source.kind === randomSourceKinds.CARDS ? source.cards?.length || 0 : source.kind === randomSourceKinds.WEIGHTED ? source.outcomes?.length || 0 : Math.floor(((source.max || 1) - (source.min || 1)) / (source.step || 1)) + 1;
  return <Section title={t('presetLibrary.rng.sources')} action={<button type="button" className="small-btn" onClick={create}>{t('common.add')}</button>}>
    <Table columns={[t('random.tokens.name'), t('presetLibrary.rng.type'), t('presetLibrary.rng.minimum'), t('presetLibrary.rng.maximum'), t('presetLibrary.rng.step'), t('presetLibrary.rng.outcomes'), t('presetLibrary.table.manage')]}>
      {(state.sources || []).map((source) => <tr key={source.id}>
        <td><input value={source.name} onChange={(event) => update(source, { name: event.target.value })} /></td>
        <td>{sourceKindLabel(source.kind)}</td>
        <td>{source.kind === randomSourceKinds.UNIFORM ? <input type="number" value={source.min} onChange={(event) => update(source, { min: Number(event.target.value) })} /> : '—'}</td>
        <td>{source.kind === randomSourceKinds.UNIFORM ? <input type="number" value={source.max} onChange={(event) => update(source, { max: Number(event.target.value) })} /> : '—'}</td>
        <td>{source.kind === randomSourceKinds.UNIFORM ? <input type="number" min="0.0001" value={source.step} onChange={(event) => update(source, { step: Number(event.target.value) })} /> : '—'}</td>
        <td>{count(source)}</td>
        <td><button type="button" className="danger-btn" onClick={() => actions.deleteSource?.(source.id)}>{t('common.delete')}</button></td>
      </tr>)}
    </Table>
  </Section>;
}

function TokenTables({ state, actions }) {
  const types = state.tokenTypes || [];
  const containers = state.tokenContainers || [];
  const createType = () => actions.saveTokenType?.({ id: createTokenId('type'), name: t('presetLibrary.rng.newToken'), appearance: { color: '#6b4b9a', symbol: '', image: '' }, value: '', tags: [], description: '' });
  const createContainer = () => actions.saveTokenContainer?.({ id: createTokenId('container'), name: t('presetLibrary.rng.newContainer'), contents: {}, referenceContents: null });
  const updateType = (token, patch) => actions.saveTokenType?.({ ...token, ...patch });
  return <>
    <Section title={t('random.tokens.types')} action={<button type="button" className="small-btn" onClick={createType}>{t('common.add')}</button>}>
      <Table columns={[t('random.tokens.name'), t('random.tokens.color'), t('random.tokens.symbol'), t('random.tokens.value'), t('random.tokens.tags'), t('presetLibrary.table.manage')]}>
        {types.map((token) => <tr key={token.id}>
          <td><input value={token.name} onChange={(event) => updateType(token, { name: event.target.value })} /></td>
          <td><input type="color" value={token.appearance?.color || '#6b4b9a'} onChange={(event) => updateType(token, { appearance: { ...token.appearance, color: event.target.value } })} /></td>
          <td><input value={token.appearance?.symbol || ''} onChange={(event) => updateType(token, { appearance: { ...token.appearance, symbol: event.target.value } })} /></td>
          <td><input value={token.value ?? ''} onChange={(event) => updateType(token, { value: event.target.value })} /></td>
          <td><input value={(token.tags || []).join(', ')} onChange={(event) => updateType(token, { tags: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) })} /></td>
          <td><button type="button" className="danger-btn" onClick={() => actions.deleteTokenType?.(token.id)}>{t('common.delete')}</button></td>
        </tr>)}
      </Table>
    </Section>
    <Section title={t('presetLibrary.rng.containers')} action={<button type="button" className="small-btn" onClick={createContainer}>{t('common.add')}</button>}>
      <Table className="rng-admin-container-table" columns={[t('random.tokens.name'), t('presetLibrary.rng.active'), t('presetLibrary.rng.quick'), ...types.map((type) => type.name), t('presetLibrary.rng.total'), t('presetLibrary.table.manage')]}>
        {containers.map((container) => <tr key={container.id}>
          <td><input value={container.name} onChange={(event) => actions.saveTokenContainer?.({ ...container, name: event.target.value })} /></td>
          <td><input type="checkbox" checked={container.exposed !== false} onChange={(event) => actions.setTokenContainerExposed?.(container.id, event.target.checked)} /></td>
          <td><input type="checkbox" checked={container.quickAccess !== false} onChange={(event) => actions.setTokenContainerQuickAccess?.(container.id, event.target.checked)} /></td>
          {types.map((type) => <td key={type.id}><input type="number" min="0" value={container.contents?.[type.id] || 0} onChange={(event) => actions.updateTokenContents?.(container.id, { [type.id]: event.target.value })} /></td>)}
          <td>{Object.values(container.contents || {}).reduce((sum, value) => sum + (Number(value) || 0), 0)}</td>
          <td className="rng-admin-actions"><button type="button" className="small-btn" onClick={() => actions.saveTokenReference?.(container.id)}>{t('presetLibrary.rng.reference')}</button><button type="button" className="small-btn" disabled={!container.referenceContents} onClick={() => actions.resetTokenContainer?.(container.id)}>{t('presetLibrary.rng.reset')}</button><button type="button" className="danger-btn" onClick={() => actions.deleteTokenContainer?.(container.id)}>{t('common.delete')}</button></td>
        </tr>)}
      </Table>
    </Section>
  </>;
}

export function RngAdminTables({ randomSystem }) {
  const state = randomSystem?.state || { randomKits: [], definitions: [], sources: [], rulePool: { enabledRuleIds: [] }, tokenTypes: [], tokenContainers: [] };
  const actions = randomSystem?.actions || {};
  return <div className="rng-admin-tables">
    <KitTable state={state} actions={actions} />
    <RuleTable state={state} actions={actions} />
    <DefinitionTable state={state} actions={actions} />
    <SourceTable state={state} actions={actions} />
    <TokenTables state={state} actions={actions} />
  </div>;
}
