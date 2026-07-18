// NOTE AUDIT / DEV TOOL:
// Cette page admin est une surface de développement temporaire. Elle sert à
// inspecter et corriger rapidement les presets de règles et ensembles de
// tirages, puis pourra être retirée. Elle n'a pas vocation à être harmonisée
// finement avec l'UI produit de Cadence, ni à être entièrement couverte par
// l'i18n, l'accessibilité produit ou les règles de polish visuel standard.
import { useEffect, useState } from 'react';
import {
  activationAdvancePolicies,
  equalityRules,
  initiativeOrders,
  initiativeValueTypes,
  multipleActionModes,
  manualMultipleActionScopes,
  phaseActionModes,
  surpriseImpacts,
  temporalityModes,
} from '../../constants.js';
import { t } from '../../i18n/index.js';
import { rulePresetCatalog, rulePresetFamilies } from '../../rulePresets.js';
import { initiativeProfileCatalog, quickRollProfileCatalog, systemProfileCatalog } from '../../domain/systemProfiles.js';
import {
  randomKitApplicationPolicies,
  randomKitCatalog,
  randomKitInitiativeModes,
  randomKitIsLoaded,
  randomKitIsStrictlyActive,
  randomKitResources,
} from '../../random-system/rulePresetKits.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { ConfigurationPanel } from '../../random-system/ui/ConfigurationPanel.jsx';
import { createHierarchyNode, createProfileHierarchy, findHierarchyNode, hierarchyNodeReferenceKey, listHierarchyNodes, loadProfileHierarchy, removeHierarchyNode, saveProfileHierarchy, updateHierarchyNode } from '../../domain/profileHierarchy.js';
import { profileHierarchyCsvFilename, profileHierarchyToCsv } from '../../domain/profileHierarchyCsv.js';
import './AdminPresetsPage-layout.css';
import './AdminPresetsPage-workbench.css';

function ReferenceTag({ children }) {
  return <code className="admin-presets-tag">{children}</code>;
}

import { downloadProfileHierarchyCsv, safeList, cleanCatalogId, makeLocalId, familyLabel, initiativeLabel, policyLabel, yesNo, listToText, textToList, numbersToList, participantTypesToText, textToParticipantTypes, rulesBreakdown, kitResourceSummary, editablePresetPayload, editableKitPayload, buildPresetRows, buildKitRows } from './adminPresetsData.js';
import { KitForm, PresetForm } from './AdminPresetsPageForms.jsx';


function AdminMetric({ label, value }) {
  return (
    <article>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function AdminBadge({ children, tone = '' }) {
  return <span className={`admin-presets-badge ${tone}`.trim()}>{children}</span>;
}

function tokenClass(prefix, value) {
  const token = String(value || 'none').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'none';
  return `${prefix}-${token}`;
}

function PresetTable({ rows, selectedKey, onSelect }) {
  return (
    <section className="admin-presets-panel">
      <div className="admin-presets-panel-head">
        <div>
          <h3>Presets de règles</h3>
          <p className="muted compact-help">Vue compacte des presets catalogue et locaux, avec les kits de tirage reliés.</p>
        </div>
        <ReferenceTag>{rows.length} lignes</ReferenceTag>
      </div>
      <div className="admin-presets-table-wrap">
        <table className="admin-presets-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Origine</th>
              <th>Famille</th>
              <th>Catégorie / système</th>
              <th>Tempo</th>
              <th>Décl.</th>
              <th>Init.</th>
              <th>Ordre</th>
              <th>Égal.</th>
              <th>Actions</th>
              <th>Phases</th>
              <th>Surprise</th>
              <th>Décl. texte</th>
              <th>Kits liés</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((preset) => {
              const breakdown = rulesBreakdown(preset.rules);
              const selected = selectedKey === preset.adminKey;
              return (
                <tr className={`${selected ? 'selected' : ''} ${preset.adminOrigin === 'Local' ? 'local-row' : 'catalog-row'}`.trim()} key={`${preset.adminOrigin}-${preset.adminKey}`} onClick={() => onSelect('preset', preset.adminKey)}>
                  <td><strong>{preset.name || 'Sans nom'}</strong></td>
                  <td><AdminBadge tone={preset.adminOrigin === 'Local' ? 'local' : ''}>{preset.adminOrigin}</AdminBadge></td>
                  <td>{familyLabel(preset.family)}</td>
                  <td>{preset.system || preset.category || '—'}</td>
                  <td className={`admin-presets-token ${tokenClass('tempo', breakdown.temporalite)}`}>{breakdown.temporalite}</td>
                  <td className={`admin-presets-token ${breakdown.declaration ? 'flag-on' : 'flag-off'}`}>{yesNo(breakdown.declaration)}</td>
                  <td className={`admin-presets-token ${tokenClass('initiative', breakdown.initiative)}`}>{breakdown.initiative}</td>
                  <td className={`admin-presets-token ${tokenClass('order', breakdown.order)}`}>{breakdown.order}</td>
                  <td className={`admin-presets-token ${tokenClass('equality', breakdown.equality)}`}>{breakdown.equality}</td>
                  <td className={`admin-presets-token ${tokenClass('actions', breakdown.actions)}`}>{breakdown.actions}</td>
                  <td className={`admin-presets-token ${tokenClass('phases', breakdown.phases)}`}>{breakdown.phases}</td>
                  <td className={`admin-presets-token ${tokenClass('surprise', breakdown.surprise)}`}>{breakdown.surprise}</td>
                  <td className={`admin-presets-token ${breakdown.declarationText === '—' ? 'flag-off' : 'flag-on'}`}>{breakdown.declarationText}</td>
                  <td>{preset.linkedKits.length ? preset.linkedKits.map((kit) => <AdminBadge key={kit}>{kit}</AdminBadge>) : <span className="muted">—</span>}</td>
                  <td><ReferenceTag>{preset.adminKey}</ReferenceTag></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function KitTable({ rows, selectedKey, onSelect }) {
  return (
    <section className="admin-presets-panel">
      <div className="admin-presets-panel-head">
        <div>
          <h3>Ensembles de tirages</h3>
          <p className="muted compact-help">Supervision des kits disponibles, de leur contenu et de leur état dans RandomSystem.</p>
        </div>
        <ReferenceTag>{rows.length} lignes</ReferenceTag>
      </div>
      <div className="admin-presets-table-wrap">
        <table className="admin-presets-table admin-presets-kit-table">
          <thead>
            <tr>
              <th>Kit</th>
              <th>Origine</th>
              <th>État</th>
              <th>Init.</th>
              <th>Politique</th>
              <th>Sources</th>
              <th>Tirages</th>
              <th>Presets associés</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((kit) => (
              <tr className={`${selectedKey === kit.adminKey ? 'selected' : ''} ${kit.adminOrigin === 'Local' ? 'local-row' : 'catalog-row'}`.trim()} key={`${kit.adminOrigin}-${kit.id}`} onClick={() => onSelect('kit', kit.adminKey)}>
                <td><strong>{kit.label || kit.id}</strong></td>
                <td><AdminBadge tone={kit.adminOrigin === 'Local' ? 'local' : ''}>{kit.adminOrigin}</AdminBadge></td>
                <td>
                  <span className="admin-presets-state">
                    {kit.active && <AdminBadge tone="active">actif</AdminBadge>}
                    {kit.loaded && !kit.active && <AdminBadge tone="loaded">chargé</AdminBadge>}
                    {!kit.loaded && <span className="muted">—</span>}
                  </span>
                </td>
                <td className={`admin-presets-token ${tokenClass('kit-init', kit.initiative?.mode)}`}>{initiativeLabel(kit.initiative?.mode)}</td>
                <td className={`admin-presets-token ${tokenClass('policy', kit.applicationPolicy)}`}>{policyLabel(kit.applicationPolicy)}</td>
                <td className="admin-presets-token count-token">{kit.resources.sources}</td>
                <td className="admin-presets-token count-token" title={kit.resources.definitionNames}>{kit.resources.definitions}{kit.resources.internal ? ` +${kit.resources.internal}` : ''}</td>
                <td>{safeList(kit.presetIds).length ? safeList(kit.presetIds).map((id) => <ReferenceTag key={id}>{id}</ReferenceTag>) : <span className="muted">—</span>}</td>
                <td><ReferenceTag>{kit.id}</ReferenceTag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MiniResourceTable({ title, rows, columns }) {
  return (
    <section className="admin-presets-mini-section">
      <h4>{title}</h4>
      <div className="admin-presets-mini-table-wrap">
        <table className="admin-presets-mini-table">
          <thead>
            <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => <td key={column.key}>{String(row[column.key] ?? '—')}</td>)}
              </tr>
            )) : (
              <tr><td colSpan={columns.length}>Aucun contenu direct.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function DetailEditor({ selected, kitRows, randomSystem, onSaveRuleTemplate, onDeleteRuleTemplate, onSelect }) {
  const [form, setForm] = useState(() => selected?.editablePayload || {});
  const [message, setMessage] = useState('');

  const resetForm = () => {
    setForm(selected?.editablePayload || {});
    setMessage('');
  };

  useEffect(resetForm, [selected?.adminType, selected?.adminKey]);

  if (!selected) {
    return (
      <aside className="admin-presets-detail panel">
        <p className="muted">Sélectionne une ligne pour inspecter son contenu.</p>
      </aside>
    );
  }

  const isPreset = selected.adminType === 'preset';
  const isKit = selected.adminType === 'kit';
  const editable = selected.adminOrigin === 'Local';

  const save = () => {
    if (isPreset) {
      const payload = form || {};
      const name = String(payload.name || selected.name || 'Preset local').trim();
      const result = onSaveRuleTemplate?.(payload.rules || {}, {
        name,
        templateId: editable ? selected.id : undefined,
        overwriteExistingId: editable ? selected.id : undefined,
        confirmDuplicate: true,
      });
      if (result?.ok === false) {
        setMessage(result.message || 'Sauvegarde impossible.');
        return;
      }
      setMessage(editable ? 'Preset de règles mis à jour.' : 'Copie locale créée depuis le catalogue.');
      onSelect?.('preset', result?.template?.id || selected.adminKey);
      return;
    }

    if (isKit) {
      const payload = form || {};
      const kit = {
        ...payload,
        id: editable ? (payload.id || selected.id) : makeLocalId(payload.id || selected.id, kitRows, 'kit-local'),
        label: String(payload.label || payload.name || selected.label || 'Kit local').trim(),
      };
      const saved = randomSystem?.actions?.saveRandomKit?.(kit);
      if (!saved) {
        setMessage('Sauvegarde du kit impossible.');
        return;
      }
      setMessage(editable ? 'Ensemble de tirages mis à jour.' : 'Copie locale créée depuis le catalogue.');
      onSelect?.('kit', saved.id);
    }
  };

  const remove = () => {
    if (!editable) return;
    if (isPreset) {
      onDeleteRuleTemplate?.(selected.id);
      setMessage('Preset local supprimé.');
      onSelect?.('preset', '');
    }
    if (isKit) {
      randomSystem?.actions?.deleteRandomKit?.(selected.id);
      setMessage('Kit local supprimé.');
      onSelect?.('kit', '');
    }
  };

  const loadKit = () => {
    if (!isKit) return;
    randomSystem?.actions?.loadRandomKit?.(selected.id);
    setMessage('Kit chargé dans RandomSystem.');
  };

  const activateKit = () => {
    if (!isKit) return;
    randomSystem?.actions?.activateRandomKit?.(selected.id);
    setMessage('Kit activé dans RandomSystem.');
  };

  return (
    <aside className="admin-presets-detail panel">
      <div className="admin-presets-detail-head">
        <div>
          <span className="style-reference-eyebrow">{isPreset ? 'Preset de règles' : 'Ensemble de tirages'}</span>
          <h3>{selected.name || selected.label || selected.id}</h3>
          <p className="muted compact-help">{selected.description || 'Aucune description.'}</p>
        </div>
        <AdminBadge tone={editable ? 'local' : ''}>{selected.adminOrigin}</AdminBadge>
      </div>

      <div className="admin-presets-detail-grid">
        <span><strong>ID</strong><ReferenceTag>{selected.adminKey || selected.id}</ReferenceTag></span>
        {isPreset && <span><strong>Temporalité</strong>{rulesBreakdown(selected.rules).temporalite}</span>}
        {isPreset && <span><strong>Actions</strong>{rulesBreakdown(selected.rules).actions}</span>}
        {isKit && <span><strong>Initiative</strong>{initiativeLabel(selected.initiative?.mode)}</span>}
        {isKit && <span><strong>Politique</strong>{policyLabel(selected.applicationPolicy)}</span>}
      </div>

      {isPreset && (
        <section className="admin-presets-mini-section">
          <h4>Kits reliés</h4>
          <div className="admin-presets-chip-row">
            {selected.linkedKits.length ? selected.linkedKits.map((kit) => <AdminBadge key={kit}>{kit}</AdminBadge>) : <span className="muted">Aucun kit explicitement associé.</span>}
          </div>
        </section>
      )}

      {isKit && (
        <>
          <MiniResourceTable
            title="Sources incluses"
            rows={selected.resources.sourceRows}
            columns={[
              { key: 'name', label: 'Nom' },
              { key: 'kind', label: 'Type' },
              { key: 'faces', label: 'Faces/cartes' },
              { key: 'id', label: 'ID' },
            ]}
          />
          <MiniResourceTable
            title="Tirages inclus"
            rows={selected.resources.definitionRows}
            columns={[
              { key: 'name', label: 'Nom' },
              { key: 'components', label: 'Composants' },
              { key: 'pipeline', label: 'Pipeline' },
              { key: 'id', label: 'ID' },
            ]}
          />
        </>
      )}

      {isPreset && <PresetForm form={form} onChange={setForm} />}
      {isKit && <KitForm form={form} onChange={setForm} />}

      <div className="admin-presets-detail-actions">
        <button type="button" className="primary" onClick={save}>{editable ? 'Enregistrer' : 'Créer une copie locale'}</button>
        <button type="button" className="small-btn" onClick={resetForm}>Réinitialiser</button>
        {isKit && <button type="button" className="small-btn" onClick={loadKit}>Charger</button>}
        {isKit && <button type="button" className="small-btn" onClick={activateKit}>Activer</button>}
        {editable && <button type="button" className="danger-btn" onClick={remove}>Supprimer local</button>}
      </div>
      {message && <p className="admin-presets-message">{message}</p>}
      {!editable && <p className="muted compact-help">Les éléments du catalogue ne sont pas modifiés directement : Cadence crée une copie locale modifiable.</p>}
    </aside>
  );
}

const hierarchyTypeLabels = { root: 'Accueil', group: 'Niveau', system: 'Système', edition: 'Sous-système', initiative: 'Initiative', quickRoll: 'Jet rapide' };

function HierarchyNode({ node, depth = 0, selectedId, selectedReferenceKey = '', selectedType = '', onSelect, onAdd, onRemove }) {
  const canContain = node.type !== 'quickRoll';
  const reused = node.id !== selectedId && !!selectedReferenceKey && hierarchyNodeReferenceKey(node) === selectedReferenceKey && node.type === selectedType;
  return <div className={`admin-profile-node type-${node.type}`} style={{ '--tree-depth': depth }}>
    <div className="admin-profile-node-row">
      <button type="button" className={`admin-profile-node-main ${selectedId === node.id ? 'selected' : ''} ${reused ? 'reused' : ''}`} onClick={() => onSelect(node.id)}><span>{hierarchyTypeLabels[node.type] || node.type}</span><strong>{node.label}</strong><small>{reused ? 'lié' : node.children.length}</small></button>
      {canContain && <div className="admin-profile-node-actions">{node.type === 'root' ? <><button type="button" onClick={() => onAdd(node.id, 'system')}>+ système</button><button type="button" onClick={() => onAdd(node.id, 'group')}>+ groupe</button></> : node.type === 'initiative' ? <button type="button" onClick={() => onAdd(node.id, 'quickRoll')}>+ liaison jet</button> : <><button type="button" onClick={() => onAdd(node.id, 'group')}>+ niveau</button><button type="button" onClick={() => onAdd(node.id, 'edition')}>+ sous-système</button><button type="button" onClick={() => onAdd(node.id, 'initiative')}>+ liaison initiative</button></>}</div>}
      {node.type !== 'root' && <button type="button" className="admin-profile-node-delete" onClick={() => onRemove(node.id)} aria-label={`Supprimer ${node.label}`}>×</button>}
    </div>
    {node.children.length > 0 && <div className="admin-profile-node-children">{node.children.map((child) => <HierarchyNode key={child.id} node={child} depth={depth + 1} selectedId={selectedId} selectedReferenceKey={selectedReferenceKey} selectedType={selectedType} onSelect={onSelect} onAdd={onAdd} onRemove={onRemove} />)}</div>}
  </div>;
}

function LinkedElementEditor({ node, randomSystem, onUpdate, onSelect, onOpenPreset, onOpenKit }) {
  const baseElement = node.type === 'system'
    ? systemProfileCatalog.find((profile) => profile.id === node.refId)
    : node.type === 'initiative'
      ? initiativeProfileCatalog.find((profile) => profile.id === node.refId)
      : node.type === 'quickRoll'
        ? quickRollProfileCatalog.find((profile) => profile.id === node.refId)
        : null;
  const element = { ...(baseElement || {}), ...node.data, id: node.refId || node.data.id || '' };
  const directChildren = node.children || [];
  const rulePreset = rulePresetCatalog.find((preset) => (preset.catalogId || preset.id) === element.rulePresetId);
  const kit = randomKitCatalog.find((candidate) => candidate.id === element.kitId);
  const kitResources = kit ? randomKitResources(kit, safeList(randomSystem?.state?.randomKits)) : { sources: [], definitions: [] };

  if (['root', 'group'].includes(node.type)) return null;
  return <section className="admin-profile-linked-element">
    <div className="admin-profile-linked-element-head"><div><span className="style-reference-eyebrow">Édition de l’élément lié</span><h5>{element.name || element.label || node.label}</h5></div>{element.id && <ReferenceTag>{element.id}</ReferenceTag>}</div>
    {node.type === 'system' && <p className="muted compact-help">Ce système organise les parcours ci-dessous. Les règles et les jets se règlent depuis les initiatives qu’il contient.</p>}
    {node.type === 'edition' && <p className="muted compact-help">Cette édition ouvre les initiatives et les jets affichés ci-dessous.</p>}
    {['system', 'edition'].includes(node.type) && <div className="admin-profile-linked-list">{directChildren.filter((child) => ['edition', 'initiative', 'group'].includes(child.type)).map((child) => <button type="button" key={child.id} onClick={() => onSelect(child.id)}><span>{hierarchyTypeLabels[child.type]}</span>{child.label}</button>)}</div>}
    {node.type === 'initiative' && <>
      <label className="field">Règles appliquées<select value={element.rulePresetId || ''} onChange={(event) => onUpdate({ rulePresetId: event.target.value })}><option value="">Aucune règle prédéfinie</option>{rulePresetCatalog.map((preset) => <option key={preset.catalogId || preset.id} value={preset.catalogId || preset.id}>{preset.name}</option>)}</select></label>
      {rulePreset && <div className="admin-profile-resource-summary"><span>{rulePreset.description}</span><div><AdminBadge>{rulesBreakdown(rulePreset.rules).temporalite}</AdminBadge><AdminBadge>{rulesBreakdown(rulePreset.rules).initiative}</AdminBadge><AdminBadge>{rulesBreakdown(rulePreset.rules).actions}</AdminBadge><button type="button" className="small-btn" onClick={() => onOpenPreset?.(rulePreset.catalogId || rulePreset.id)}>Éditer les règles</button></div></div>}
      <h6>Jets proposés après cette initiative</h6>
      <div className="admin-profile-linked-list">{directChildren.filter((child) => child.type === 'quickRoll').map((child) => <button type="button" key={child.id} onClick={() => onSelect(child.id)}><span>Jet rapide</span>{child.label}</button>)}</div>
    </>}
    {node.type === 'quickRoll' && <>
      <label className="field">Ensemble de tirages<select value={element.kitId || ''} onChange={(event) => onUpdate({ kitId: event.target.value })}><option value="">Aucun ensemble</option>{randomKitCatalog.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.label}</option>)}</select></label>
      <label className="field">Tirages disponibles<textarea value={safeList(element.definitionIds).join(', ')} onChange={(event) => onUpdate({ definitionIds: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} /></label>
      {kit && <div className="admin-profile-resource-summary"><span>{kit.description || 'Ensemble de tirages lié.'}</span><div><AdminBadge>{kitResources.sources.length} sources</AdminBadge><AdminBadge>{kitResources.definitions.length} tirages</AdminBadge><button type="button" className="small-btn" onClick={() => onOpenKit?.(kit.id)}>Éditer le jet</button></div></div>}
    </>}
  </section>;
}

function ProfileBrowser({ randomSystem, onOpenPreset, onOpenKit }) {
  const fallback = createProfileHierarchy({ systems: systemProfileCatalog, initiatives: initiativeProfileCatalog, quickRolls: quickRollProfileCatalog });
  const [tree, setTree] = useState(() => loadProfileHierarchy(fallback));
  const [selectedId, setSelectedId] = useState(tree.children[0]?.id || tree.id);
  const selected = findHierarchyNode(tree, selectedId) || tree;
  useEffect(() => { saveProfileHierarchy(tree); }, [tree]);
  const updateSelected = (patch) => setTree((current) => updateHierarchyNode(current, selected.id, (node) => ({ ...node, ...patch })));
  const updateData = (patch) => updateSelected({ data: { ...selected.data, ...patch } });
  const updateLinkedData = (patch) => {
    const referenceKey = hierarchyNodeReferenceKey(selected);
    if (!referenceKey) return updateData(patch);
    const updateSharedNodes = (node) => ({
      ...node,
      data: node.type === selected.type && hierarchyNodeReferenceKey(node) === referenceKey ? { ...node.data, ...patch } : node.data,
      children: node.children.map(updateSharedNodes),
    });
    setTree((current) => updateSharedNodes(current));
  };
  const add = (parentId, type) => setTree((current) => updateHierarchyNode(current, parentId, (node) => ({ ...node, children: [...node.children, createHierarchyNode(type)] })));
  const remove = (id) => { setTree((current) => removeHierarchyNode(current, id)); setSelectedId(tree.id); };
  const baseReferenceOptions = selected.type === 'system' ? systemProfileCatalog : selected.type === 'initiative' ? initiativeProfileCatalog : selected.type === 'quickRoll' ? quickRollProfileCatalog : [];
  const customReferenceOptions = ['initiative', 'quickRoll'].includes(selected.type)
    ? listHierarchyNodes(tree).filter((node) => node.type === selected.type && node.data?.id).map((node) => ({ id: node.data.id, label: `${node.label} (personnalisé)` }))
    : [];
  const referenceOptions = [...new Map([...baseReferenceOptions, ...customReferenceOptions].map((profile) => [profile.id, profile])).values()];
  const selectedReferenceKey = hierarchyNodeReferenceKey(selected);
  const reset = () => { const next = createProfileHierarchy({ systems: systemProfileCatalog, initiatives: initiativeProfileCatalog, quickRolls: quickRollProfileCatalog }); setTree(next); setSelectedId(next.children[0]?.id || next.id); };
  return <section className="admin-presets-profile-browser panel">
    <div className="admin-presets-panel-head"><div><h3>Arbre des parcours d’accueil</h3><p className="muted compact-help">Tous les étages restent visibles. Les feuilles sont des liaisons : une même initiative ou un même jet peut être appelé depuis plusieurs branches.</p></div><div className="admin-presets-panel-actions"><button type="button" className="small-btn" onClick={() => downloadProfileHierarchyCsv(tree)}>Exporter les modifications CSV</button><button type="button" className="small-btn" onClick={reset}>Restaurer le catalogue</button></div></div>
    <div className="admin-presets-profile-layout">
      <nav className="admin-presets-profile-tree" aria-label="Arbre des parcours"><HierarchyNode node={tree} selectedId={selected.id} selectedReferenceKey={selectedReferenceKey} selectedType={selected.type} onSelect={setSelectedId} onAdd={add} onRemove={remove} /></nav>
      <section className="admin-presets-profile-detail">
        <span className="style-reference-eyebrow">Édition de l’étage</span><h4>{selected.label}</h4><ReferenceTag>{selected.id}</ReferenceTag>
        {selected.type !== 'root' && <div className="admin-profile-editor"><label className="field">Type<select value={selected.type} onChange={(event) => updateSelected({ type: event.target.value, refId: '' })}>{Object.entries(hierarchyTypeLabels).filter(([type]) => type !== 'root').map(([type, label]) => <option key={type} value={type}>{label}</option>)}</select></label><label className="field">Nom affiché<input value={selected.label} onChange={(event) => updateSelected({ label: event.target.value })} /></label>{referenceOptions.length > 0 && <label className="field">Élément lié<select value={selected.refId} onChange={(event) => { const refId = event.target.value; const profile = referenceOptions.find((item) => item.id === refId); updateSelected({ refId, ...(profile ? { label: profile.name || profile.label || refId, data: {} } : {}) }); }}><option value="">Personnalisé</option>{referenceOptions.map((profile) => <option key={profile.id} value={profile.id}>{profile.name || profile.label}</option>)}</select></label>}<label className="field">Identifiant personnalisé<input value={selected.data.id || ''} onChange={(event) => updateData({ id: event.target.value })} placeholder="Utilisé si aucun élément n’est lié" /></label><label className="field wide">Description<textarea value={selected.data.description || ''} onChange={(event) => updateData({ description: event.target.value })} /></label></div>}
        <LinkedElementEditor node={selected} randomSystem={randomSystem} onUpdate={updateLinkedData} onSelect={setSelectedId} onOpenPreset={onOpenPreset} onOpenKit={onOpenKit} />
      </section>
    </div>
  </section>;
}

function RngManagement({ randomSystem }) {
  const [section, setSection] = useState('definitions');
  return <section className="admin-presets-rng panel"><div className="admin-presets-panel-head"><div><h3>Gestion RNG</h3><p className="muted compact-help">Tirages, sources aléatoires et règles du moteur.</p></div></div><div className="admin-presets-rng-tabs" role="tablist"><button type="button" className={section === 'definitions' ? 'selected' : ''} onClick={() => setSection('definitions')}>Tirages</button><button type="button" className={section === 'sources' ? 'selected' : ''} onClick={() => setSection('sources')}>Sources RNG</button><button type="button" className={section === 'rules' ? 'selected' : ''} onClick={() => setSection('rules')}>Règles</button></div><ConfigurationPanel state={randomSystem?.state || {}} actions={randomSystem?.actions} section={section} /></section>;
}

export function AdminPresetsPage({ ruleTemplates = [], randomSystem, onBack, onSaveRuleTemplate, onDeleteRuleTemplate }) {
  const randomState = randomSystem?.state || {};
  const kitRows = buildKitRows(randomState);
  const presetRows = buildPresetRows(ruleTemplates, kitRows);
  const [selection, setSelection] = useState({ type: 'preset', key: presetRows[0]?.adminKey || '' });
  const selected = selection.type === 'kit'
    ? kitRows.find((row) => row.adminKey === selection.key) || kitRows[0] || null
    : presetRows.find((row) => row.adminKey === selection.key) || presetRows[0] || null;
  const selectedPresetKey = selection.type === 'preset' ? selected?.adminKey : '';
  const selectedKitKey = selection.type === 'kit' ? selected?.adminKey : '';
  const localPresetCount = presetRows.filter((row) => row.adminOrigin === 'Local').length;
  const localKitCount = kitRows.filter((row) => row.adminOrigin === 'Local').length;
  const linkedPresetCount = presetRows.filter((row) => row.linkedKits.length > 0).length;
  const activeKitCount = kitRows.filter((row) => row.active).length;
  const selectRow = (type, key) => setSelection({ type, key });

  return (
    <div className="admin-presets-page">
      <header className="admin-presets-header">
        <div>
          <span className="style-reference-eyebrow">Outil admin</span>
          <h2>Admin presets</h2>
          <p className="muted">Supervision et édition large écran des presets de règles et ensembles de tirages. Les catalogues sont copiés en local avant modification.</p>
        </div>
        <button type="button" className="small-btn" onClick={onBack}><IconeCadence name="return" /> {t('styleReference.back')}</button>
      </header>
      <div className="admin-presets-metrics">
        <AdminMetric label="Presets règles" value={presetRows.length} />
        <AdminMetric label="Presets locaux" value={localPresetCount} />
        <AdminMetric label="Kits tirages" value={kitRows.length} />
        <AdminMetric label="Kits locaux" value={localKitCount} />
        <AdminMetric label="Presets liés" value={linkedPresetCount} />
        <AdminMetric label="Kits actifs" value={activeKitCount} />
        <AdminMetric label="Profils système" value={systemProfileCatalog.length} />
        <AdminMetric label="Profils initiative" value={initiativeProfileCatalog.length} />
        <AdminMetric label="Profils jets" value={quickRollProfileCatalog.length} />
      </div>
      <section className="admin-presets-catalog panel"><h3>Catalogues de profils</h3><p className="muted compact-help">Systèmes : {systemProfileCatalog.map((profile) => profile.name).join(' · ')}</p><p className="muted compact-help">Initiatives : {initiativeProfileCatalog.map((profile) => profile.label).join(' · ')}</p><p className="muted compact-help">Jets rapides : {quickRollProfileCatalog.map((profile) => profile.label).join(' · ')}</p></section>
      <ProfileBrowser randomSystem={randomSystem} onOpenPreset={(key) => setSelection({ type: 'preset', key })} onOpenKit={(key) => setSelection({ type: 'kit', key })} />
      <RngManagement randomSystem={randomSystem} />
      <div className="admin-presets-workbench">
        <div className="admin-presets-tables">
          <PresetTable rows={presetRows} selectedKey={selectedPresetKey} onSelect={selectRow} />
          <KitTable rows={kitRows} selectedKey={selectedKitKey} onSelect={selectRow} />
        </div>
        <DetailEditor
          selected={selected}
          kitRows={kitRows}
          randomSystem={randomSystem}
          onSaveRuleTemplate={onSaveRuleTemplate}
          onDeleteRuleTemplate={onDeleteRuleTemplate}
          onSelect={selectRow}
        />
      </div>
    </div>
  );
}
