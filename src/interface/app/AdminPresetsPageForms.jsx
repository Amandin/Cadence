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
import { randomKitApplicationPolicies, randomKitInitiativeModes } from '../../random-system/rulePresetKits.js';
import { listToText, numbersToList, participantTypesToText, safeList, textToList, textToParticipantTypes } from './adminPresetsData.js';

function FormField({ label, children, wide = false }) {
  return (
    <label className={`admin-presets-form-field ${wide ? 'wide' : ''}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function CheckboxField({ label, checked, onChange }) {
  return (
    <label className="admin-presets-check-field">
      <input type="checkbox" checked={!!checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

function updateArrayItem(items, index, patch) {
  return safeList(items).map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

export function PresetForm({ form, onChange }) {
  const rules = form.rules || {};
  const setMeta = (key, value) => onChange({ ...form, [key]: value });
  const setRule = (key, value) => onChange({ ...form, rules: { ...rules, [key]: value } });
  const textOrder = rules.initiativeTextOrder || {};
  const setTextOrder = (key, value) => setRule('initiativeTextOrder', { ...textOrder, [key]: value });

  return (
    <div className="admin-presets-form">
      <section className="admin-presets-form-section">
        <h4>Identité</h4>
        <div className="admin-presets-form-grid">
          <FormField label="Nom"><input value={form.name || ''} onChange={(event) => setMeta('name', event.target.value)} /></FormField>
          <FormField label="Catégorie"><input value={form.category || ''} onChange={(event) => setMeta('category', event.target.value)} /></FormField>
          <FormField label="Système"><input value={form.system || ''} onChange={(event) => setMeta('system', event.target.value)} /></FormField>
          <FormField label="Description" wide><textarea value={form.description || ''} onChange={(event) => setMeta('description', event.target.value)} /></FormField>
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Déroulement</h4>
        <div className="admin-presets-form-grid compact">
          <FormField label="Temporalité">
            <select value={rules.temporalite || temporalityModes.CLASSIC} onChange={(event) => setRule('temporalite', event.target.value)}>
              <option value={temporalityModes.CLASSIC}>classique</option>
              <option value={temporalityModes.FLEXIBLE}>souple</option>
              <option value={temporalityModes.PHASES}>phases</option>
            </select>
          </FormField>
          <FormField label="Ordre initiative">
            <select value={rules.initiativeOrder || initiativeOrders.DESC} onChange={(event) => setRule('initiativeOrder', event.target.value)}>
              <option value={initiativeOrders.DESC}>descendant</option>
              <option value={initiativeOrders.ASC}>ascendant</option>
            </select>
          </FormField>
          <FormField label="Départage">
            <select value={rules.equalityRule || equalityRules.STRICT} onChange={(event) => setRule('equalityRule', event.target.value)}>
              <option value={equalityRules.NEVER}>jamais</option>
              <option value={equalityRules.STRICT}>strict</option>
              <option value={equalityRules.LOOSE}>souple</option>
            </select>
          </FormField>
          <FormField label="Actions multiples">
            <select value={rules.multipleActionMode || multipleActionModes.NONE} onChange={(event) => setRule('multipleActionMode', event.target.value)}>
              <option value={multipleActionModes.NONE}>aucune</option>
              <option value={multipleActionModes.MANUAL}>manuel</option>
              <option value={multipleActionModes.INITIATIVE_COST}>coût initiative</option>
            </select>
          </FormField>
          {rules.multipleActionMode === multipleActionModes.MANUAL && <FormField label="Portée manuelle"><select value={rules.manualMultipleActionScope || manualMultipleActionScopes.ALL} onChange={(event) => setRule('manualMultipleActionScope', event.target.value)}><option value={manualMultipleActionScopes.ALL}>tous les participants</option><option value={manualMultipleActionScopes.ELITE_ONLY}>actions multiples pour les Élites</option></select></FormField>}
          <CheckboxField label="Déclaration" checked={rules.declarationMode} onChange={(value) => setRule('declarationMode', value)} />
          <CheckboxField label="Texte requis" checked={rules.declarationRequireText} onChange={(value) => setRule('declarationRequireText', value)} />
          <CheckboxField label="Initiative en mode souple" checked={rules.flexibleUseInitiative !== false} onChange={(value) => setRule('flexibleUseInitiative', value)} />
          <CheckboxField label="Bonus initiative" checked={rules.initiativeBonusEnabled !== false} onChange={(value) => setRule('initiativeBonusEnabled', value)} />
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Initiative avancée</h4>
        <div className="admin-presets-form-grid compact">
          <FormField label="Type de valeur">
            <select value={rules.initiativeValueType || initiativeValueTypes.NUMERIC} onChange={(event) => setRule('initiativeValueType', event.target.value)}>
              <option value={initiativeValueTypes.NUMERIC}>numérique</option>
              <option value={initiativeValueTypes.LABEL}>labels</option>
            </select>
          </FormField>
          <FormField label="Libellé départage"><input value={rules.tiebreakerLabel || ''} onChange={(event) => setRule('tiebreakerLabel', event.target.value)} /></FormField>
          <FormField label="Définition bonus"><input value={rules.initiativeBonusRollDefinitionId || ''} onChange={(event) => setRule('initiativeBonusRollDefinitionId', event.target.value)} /></FormField>
          <FormField label="Labels initiative" wide><textarea value={listToText(rules.initiativeLabels)} onChange={(event) => setRule('initiativeLabels', textToList(event.target.value))} /></FormField>
          <FormField label="Ordre catégories" wide><textarea value={listToText(rules.categoryOrder)} onChange={(event) => setRule('categoryOrder', textToList(event.target.value))} /></FormField>
          <FormField label="Types (nom:comportement)" wide><textarea value={participantTypesToText(rules.participantTypes)} onChange={(event) => setRule('participantTypes', textToParticipantTypes(event.target.value))} /></FormField>
          <CheckboxField label="Départage visible" checked={rules.tiebreakerVisible !== false} onChange={(value) => setRule('tiebreakerVisible', value)} />
          <CheckboxField label="Ordre texte activé" checked={textOrder.enabled} onChange={(value) => setTextOrder('enabled', value)} />
          <FormField label="Preset ordre texte"><input value={textOrder.preset || ''} onChange={(event) => setTextOrder('preset', event.target.value)} /></FormField>
          <FormField label="Source cartes"><input value={textOrder.cardSourceId || ''} onChange={(event) => setTextOrder('cardSourceId', event.target.value)} /></FormField>
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Phases, surprise et coûts</h4>
        <div className="admin-presets-form-grid compact">
          <FormField label="Mode phases">
            <select value={rules.phaseActionMode || phaseActionModes.AUTOMATIC} onChange={(event) => setRule('phaseActionMode', event.target.value)}>
              <option value={phaseActionModes.AUTOMATIC}>automatique</option>
              <option value={phaseActionModes.CHECKED}>coché</option>
            </select>
          </FormField>
          <FormField label="Nombre phases"><input type="number" min="1" max="20" value={rules.phaseCount ?? 3} onChange={(event) => setRule('phaseCount', Number(event.target.value) || 1)} /></FormField>
          <FormField label="Décrément"><input type="number" min="1" value={rules.phaseDecrement ?? 10} onChange={(event) => setRule('phaseDecrement', Number(event.target.value) || 1)} /></FormField>
          <FormField label="Seuil coût"><input type="number" min="0" value={rules.initiativeCostThreshold ?? 0} onChange={(event) => setRule('initiativeCostThreshold', Number(event.target.value) || 0)} /></FormField>
          <FormField label="Coûts rapides"><input value={safeList(rules.initiativeCostQuickCosts).join(', ')} onChange={(event) => setRule('initiativeCostQuickCosts', numbersToList(event.target.value))} /></FormField>
          <FormField label="Surprise">
            <select value={rules.surpriseImpact || surpriseImpacts.LIMITED} onChange={(event) => setRule('surpriseImpact', event.target.value)}>
              <option value={surpriseImpacts.LIMITED}>limitée</option>
              <option value={surpriseImpacts.INACTIVE}>inactive</option>
            </select>
          </FormField>
          <FormField label="Avance surprise">
            <select value={rules.surpriseAdvanceOn || 'activation'} onChange={(event) => setRule('surpriseAdvanceOn', event.target.value)}>
              <option value="activation">activation</option>
              <option value="round">round</option>
            </select>
          </FormField>
          <FormField label="Avance activation">
            <select value={rules.activationAdvancePolicy || activationAdvancePolicies.ONCE_PER_ROUND} onChange={(event) => setRule('activationAdvancePolicy', event.target.value)}>
              <option value={activationAdvancePolicies.ONCE_PER_ROUND}>une fois / round</option>
              <option value={activationAdvancePolicies.EVERY_ACTION}>chaque action</option>
            </select>
          </FormField>
          <CheckboxField label="Relancer chaque round" checked={rules.phaseRerollEachRound} onChange={(value) => setRule('phaseRerollEachRound', value)} />
          <CheckboxField label="Une activation / round" checked={rules.phaseActivateOncePerRound !== false} onChange={(value) => setRule('phaseActivateOncePerRound', value)} />
          <CheckboxField label="Limiter coût au courant" checked={rules.initiativeCostLimitToCurrent} onChange={(value) => setRule('initiativeCostLimitToCurrent', value)} />
          <CheckboxField label="Round surprise dédié" checked={rules.surpriseDedicatedRound} onChange={(value) => setRule('surpriseDedicatedRound', value)} />
        </div>
      </section>
    </div>
  );
}

export function KitForm({ form, onChange }) {
  const initiative = form.initiative || {};
  const setField = (key, value) => onChange({ ...form, [key]: value });
  const setInitiative = (key, value) => setField('initiative', { ...initiative, [key]: value });
  const setSource = (index, patch) => setField('sources', updateArrayItem(form.sources, index, patch));
  const setDefinition = (index, patch) => setField('definitions', updateArrayItem(form.definitions, index, patch));

  return (
    <div className="admin-presets-form">
      <section className="admin-presets-form-section">
        <h4>Identité</h4>
        <div className="admin-presets-form-grid">
          <FormField label="Libellé"><input value={form.label || ''} onChange={(event) => setField('label', event.target.value)} /></FormField>
          <FormField label="Politique">
            <select value={form.applicationPolicy || randomKitApplicationPolicies.ASK} onChange={(event) => setField('applicationPolicy', event.target.value)}>
              <option value={randomKitApplicationPolicies.ASK}>demande</option>
              <option value={randomKitApplicationPolicies.FILL_EMPTY}>complète les vides</option>
              <option value={randomKitApplicationPolicies.REPLACE_ALL}>remplace tout</option>
              <option value={randomKitApplicationPolicies.MANUAL_ONLY}>manuel seulement</option>
            </select>
          </FormField>
          <FormField label="Description" wide><textarea value={form.description || ''} onChange={(event) => setField('description', event.target.value)} /></FormField>
          <FormField label="Tags famille" wide><textarea value={listToText(form.familyTags)} onChange={(event) => setField('familyTags', textToList(event.target.value))} /></FormField>
          <FormField label="Presets associés" wide><textarea value={listToText(form.presetIds)} onChange={(event) => setField('presetIds', textToList(event.target.value))} /></FormField>
          <FormField label="Sources catalogue" wide><textarea value={listToText(form.sourceIds)} onChange={(event) => setField('sourceIds', textToList(event.target.value))} /></FormField>
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Initiative du kit</h4>
        <div className="admin-presets-form-grid compact">
          <FormField label="Mode">
            <select value={initiative.mode || randomKitInitiativeModes.MANUAL} onChange={(event) => setInitiative('mode', event.target.value)}>
              <option value={randomKitInitiativeModes.NUMERIC}>numérique</option>
              <option value={randomKitInitiativeModes.CARDS}>cartes</option>
              <option value={randomKitInitiativeModes.LABEL_ORDER}>labels</option>
              <option value={randomKitInitiativeModes.RANDOM_ORDER}>aléatoire</option>
              <option value={randomKitInitiativeModes.MANUAL}>manuel</option>
              <option value={randomKitInitiativeModes.NONE}>aucune</option>
            </select>
          </FormField>
          <FormField label="Définition par défaut"><input value={initiative.defaultDefinitionId || ''} onChange={(event) => setInitiative('defaultDefinitionId', event.target.value || null)} /></FormField>
          <FormField label="Source par défaut"><input value={initiative.defaultSourceId || ''} onChange={(event) => setInitiative('defaultSourceId', event.target.value || null)} /></FormField>
          <FormField label="Cartes"><input type="number" min="0" value={initiative.defaultCardCount || 0} onChange={(event) => setInitiative('defaultCardCount', Number(event.target.value) || 0)} /></FormField>
          <FormField label="Départage"><input value={initiative.tiebreaker || ''} onChange={(event) => setInitiative('tiebreaker', event.target.value)} /></FormField>
          <FormField label="Ordre"><input value={initiative.order || ''} onChange={(event) => setInitiative('order', event.target.value)} /></FormField>
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Sources directes</h4>
        <div className="admin-presets-edit-table-wrap">
          <table className="admin-presets-edit-table">
            <thead><tr><th>ID</th><th>Nom</th><th>Type</th><th>Contenu</th></tr></thead>
            <tbody>
              {safeList(form.sources).length ? safeList(form.sources).map((source, index) => (
                <tr key={`${source.id}-${index}`}>
                  <td><input value={source.id || ''} onChange={(event) => setSource(index, { id: event.target.value })} /></td>
                  <td><input value={source.name || source.label || ''} onChange={(event) => setSource(index, { name: event.target.value })} /></td>
                  <td><input value={source.kind || ''} onChange={(event) => setSource(index, { kind: event.target.value })} /></td>
                  <td>{safeList(source.faces).length || safeList(source.cards).length || '—'}</td>
                </tr>
              )) : <tr><td colSpan="4">Aucune source directe. Utilise “Sources catalogue” pour lier des sources existantes.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-presets-form-section">
        <h4>Tirages directs</h4>
        <div className="admin-presets-edit-table-wrap">
          <table className="admin-presets-edit-table">
            <thead><tr><th>ID</th><th>Nom</th><th>Actif</th><th>Visible</th><th>Composants</th><th>Pipeline</th></tr></thead>
            <tbody>
              {safeList(form.definitions).length ? safeList(form.definitions).map((definition, index) => (
                <tr key={`${definition.id}-${index}`}>
                  <td><input value={definition.id || ''} onChange={(event) => setDefinition(index, { id: event.target.value })} /></td>
                  <td><input value={definition.name || ''} onChange={(event) => setDefinition(index, { name: event.target.value })} /></td>
                  <td><input type="checkbox" checked={definition.active !== false} onChange={(event) => setDefinition(index, { active: event.target.checked })} /></td>
                  <td><input type="checkbox" checked={definition.exposed !== false} onChange={(event) => setDefinition(index, { exposed: event.target.checked })} /></td>
                  <td>{safeList(definition.components).length}</td>
                  <td>{safeList(definition.pipeline).length}</td>
                </tr>
              )) : <tr><td colSpan="6">Aucun tirage direct.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

