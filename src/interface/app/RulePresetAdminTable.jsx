import { useEffect, useState } from 'react';
import {
  activationAdvancePolicies,
  equalityRules,
  initiativeOrders,
  initiativeValueTypes,
  manualMultipleActionScopes,
  multipleActionModes,
  participantKinds,
  phaseActionModes,
  temporalityModes,
} from '../../constants.js';
import { normalizeCampaignRules } from '../../domain/campaignRules.js';
import {
  initiativeTextOrderFromRandomSource,
  initiativeTextOrderPresetIds,
  normalizeInitiativeTextOrder,
  presetInitiativeTextOrder,
} from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const optionSets = {
  temporality: [
    [temporalityModes.CLASSIC, 'Classique'],
    [temporalityModes.PHASES, 'Phases'],
    [temporalityModes.FLEXIBLE, 'Souple'],
  ],
  phaseMode: [
    [phaseActionModes.AUTOMATIC, 'Par initiative'],
    [phaseActionModes.CHECKED, 'Phases cochées'],
  ],
  initiativeValue: [
    [initiativeValueTypes.NUMERIC, 'Numérique'],
    [initiativeValueTypes.LABEL, 'Libellés'],
  ],
  initiativeOrder: [
    [initiativeOrders.DESC, 'Décroissant'],
    [initiativeOrders.ASC, 'Croissant'],
  ],
  equality: [
    [equalityRules.STRICT, 'Par type'],
    [equalityRules.LOOSE, 'Par initiative'],
    [equalityRules.NEVER, 'Jamais'],
  ],
  multipleActions: [
    [multipleActionModes.NONE, 'Une action'],
    [multipleActionModes.MANUAL, 'Créneaux saisis'],
    [multipleActionModes.INITIATIVE_COST, 'Coût d’initiative'],
  ],
  manualScope: [
    [manualMultipleActionScopes.ALL, 'Tous'],
    [manualMultipleActionScopes.ELITE_ONLY, 'Élites'],
  ],
  activationAdvance: [
    [activationAdvancePolicies.ONCE_PER_ROUND, 'Une fois par round'],
    [activationAdvancePolicies.EVERY_ACTION, 'Chaque action'],
  ],
  rounding: [
    ['nearest', 'Au plus proche'],
    ['floor', 'Inférieur'],
    ['ceil', 'Supérieur'],
  ],
  surpriseImpact: [
    ['limited', 'Limité'],
    ['inactive', 'Inactif'],
  ],
  surpriseAdvance: [
    ['activation', 'À l’activation'],
    ['round', 'Au nouveau round'],
  ],
  unknownLabels: [
    ['last', 'Après les connus'],
    ['first', 'Avant les connus'],
  ],
  textFormat: [
    ['numeric', 'Numérique'],
    [initiativeTextOrderPresetIds.CARDS, 'Cartes'],
    [initiativeTextOrderPresetIds.TAROT, 'Tarot'],
    [initiativeTextOrderPresetIds.POSTURES, 'Postures'],
    ['custom', 'Personnalisé'],
  ],
  declaration: [
    ['none', 'Non'],
    ['free', 'Oui · libre'],
    ['required', 'Oui · texte requis'],
  ],
  bonusTiebreaker: [
    ['both', 'Bonus + départage'],
    ['bonus', 'Bonus seul'],
    ['tiebreaker', 'Départage seul'],
    ['none', 'Aucun'],
  ],
};

const listText = (values) => (Array.isArray(values) ? values : []).join(', ');
const parseList = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
const partsText = (parts) => (Array.isArray(parts) ? parts : [])
  .map((part) => `${part.label}: ${listText(part.values)}`)
  .join('\n');
const parseParts = (value) => String(value || '').split(/\r?\n/).map((line, index) => {
  const separatorIndex = line.indexOf(':');
  const label = (separatorIndex >= 0 ? line.slice(0, separatorIndex) : '').trim() || `Partie ${index + 1}`;
  const values = parseList(separatorIndex >= 0 ? line.slice(separatorIndex + 1) : line);
  return { label, values };
}).filter((part) => part.values.length);
const separatorsText = (separators) => (Array.isArray(separators) ? separators : [])
  .map((separator) => separator === '' ? '∅' : separator)
  .join(' | ');
const parseSeparators = (value) => String(value ?? '').split('|')
  .map((separator) => separator.trim())
  .map((separator) => separator === '∅' ? '' : separator);

function SelectField({ label, value, options, onChange, disabled = false }) {
  return <label className="rule-admin-field"><span>{label}</span><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, optionLabel]) => <option value={optionValue} key={optionValue}>{optionLabel}</option>)}</select></label>;
}

function TextField({ label, value, onChange, type = 'text', min, max, placeholder = '' }) {
  return <label className="rule-admin-field"><span>{label}</span><input type={type} min={min} max={max} value={value ?? ''} placeholder={placeholder} onChange={(event) => onChange(type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value)} /></label>;
}

function TextAreaField({ label, value, onChange, rows = 2, placeholder = '' }) {
  return <label className="rule-admin-field rule-admin-wide-field"><span>{label}</span><textarea rows={rows} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} /></label>;
}

function CheckField({ label, checked, onChange, disabled = false }) {
  return <label className="rule-admin-field rule-admin-check"><span>{label}</span><input type="checkbox" checked={!!checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} /></label>;
}

function Subgroup({ title, children, className = '' }) {
  return <section className={`rule-admin-subgroup ${className}`.trim()}><h4>{title}</h4>{children}</section>;
}

function PhaseSettings({ rules, update }) {
  return <Subgroup title={t('presetLibrary.rules.phases')} className="is-conditional">
    <SelectField label={t('presetLibrary.rules.phaseMode')} value={rules.phaseActionMode} options={optionSets.phaseMode} onChange={(phaseActionMode) => update({ phaseActionMode })} />
    {rules.phaseActionMode === phaseActionModes.CHECKED
      ? <TextField label={t('presetLibrary.rules.phaseCount')} type="number" min="1" max="20" value={rules.phaseCount} onChange={(phaseCount) => update({ phaseCount })} />
      : <TextField label={t('presetLibrary.rules.phaseDecrement')} type="number" min="1" value={rules.phaseDecrement} onChange={(phaseDecrement) => update({ phaseDecrement })} />}
    <CheckField label={t('presetLibrary.rules.phaseOnce')} checked={rules.phaseActivateOncePerRound} onChange={(phaseActivateOncePerRound) => update({ phaseActivateOncePerRound })} />
  </Subgroup>;
}

function SurpriseSettings({ rules, update }) {
  return <Subgroup title={t('presetLibrary.rules.surprise')}>
    <SelectField label={t('presetLibrary.rules.impact')} value={rules.surpriseImpact} options={optionSets.surpriseImpact} onChange={(surpriseImpact) => update({ surpriseImpact })} />
    <SelectField label={t('presetLibrary.rules.advance')} value={rules.surpriseAdvanceOn} options={optionSets.surpriseAdvance} disabled={rules.temporalite === temporalityModes.FLEXIBLE} onChange={(surpriseAdvanceOn) => update({ surpriseAdvanceOn })} />
    <CheckField label={t('presetLibrary.rules.dedicatedRound')} checked={rules.surpriseDedicatedRound} onChange={(surpriseDedicatedRound) => update({ surpriseDedicatedRound })} />
  </Subgroup>;
}

function InitiativeFormatSettings({ rules, update, randomSources }) {
  const config = normalizeInitiativeTextOrder(rules.initiativeTextOrder);
  const format = initiativeFormatValue(rules);
  const changeSource = (sourceId) => {
    const source = randomSources.find((item) => item.id === sourceId);
    update({ initiativeTextOrder: source ? initiativeTextOrderFromRandomSource(source, config) : { ...config, sourceId: '', cardSourceId: '' } });
  };
  return <Subgroup title={t('presetLibrary.rules.format')} className="is-conditional">
    <SelectField label={t('presetLibrary.rules.valueType')} value={rules.initiativeValueType} options={optionSets.initiativeValue} onChange={(initiativeValueType) => update({ initiativeValueType })} />
    <SelectField label={t('presetLibrary.rules.textFormat')} value={format} options={optionSets.textFormat} onChange={(nextFormat) => update(initiativeFormatPatch(rules, nextFormat))} />
    {config.enabled && <>
      <label className="rule-admin-field"><span>{t('presetLibrary.rules.source')}</span><select value={config.sourceId || config.cardSourceId || ''} onChange={(event) => changeSource(event.target.value)}><option value="">—</option>{randomSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label>
      <SelectField label={t('presetLibrary.rules.unknown')} value={config.unknown} options={optionSets.unknownLabels} onChange={(unknown) => update({ initiativeTextOrder: { ...config, unknown } })} />
      <TextField label={t('presetLibrary.rules.separator')} value={config.separator} onChange={(separator) => update({ initiativeTextOrder: { ...config, separator, separators: [separator] } })} />
      {config.parts.length > 1 && <TextField label={t('presetLibrary.rules.separators')} value={separatorsText(config.separators)} placeholder={t('presetLibrary.rules.separatorsPlaceholder')} onChange={(value) => update({ initiativeTextOrder: { ...config, separators: parseSeparators(value) } })} />}
      <TextAreaField label={t('presetLibrary.rules.parts')} rows={3} value={partsText(config.parts)} placeholder={t('presetLibrary.rules.partsPlaceholder')} onChange={(value) => update({ initiativeTextOrder: { ...config, parts: parseParts(value) } })} />
    </>}
    {rules.initiativeValueType === initiativeValueTypes.LABEL && <TextField label={t('presetLibrary.rules.legacyLabels')} value={listText(rules.initiativeLabels)} onChange={(value) => update({ initiativeLabels: parseList(value) })} />}
  </Subgroup>;
}

function InitiativeSettings({ rules, update, rollDefinitions }) {
  const usesInitiative = rules.temporalite !== temporalityModes.FLEXIBLE || rules.flexibleUseInitiative !== false;
  return <Subgroup title={t('presetLibrary.rules.initiative')}>
    {rules.temporalite === temporalityModes.FLEXIBLE && <CheckField label={t('presetLibrary.rules.useInitiative')} checked={usesInitiative} onChange={(flexibleUseInitiative) => update({ flexibleUseInitiative })} />}
    {usesInitiative && <>
      <SelectField label={t('presetLibrary.rules.order')} value={rules.initiativeOrder} options={optionSets.initiativeOrder} onChange={(initiativeOrder) => update({ initiativeOrder })} />
      <CheckField label={t('presetLibrary.rules.reroll')} checked={rules.phaseRerollEachRound} onChange={(phaseRerollEachRound) => update({ phaseRerollEachRound })} />
      <SelectField label={t('presetLibrary.rules.activationAdvance')} value={rules.activationAdvancePolicy} options={optionSets.activationAdvance} onChange={(activationAdvancePolicy) => update({ activationAdvancePolicy })} />
      <label className="rule-admin-field"><span>{t('presetLibrary.rules.initiativeRoll')}</span><select value={rules.initiativeBonusRollDefinitionId || ''} onChange={(event) => update({ initiativeBonusRollDefinitionId: event.target.value })}><option value="">—</option>{rollDefinitions.map((definition) => <option value={definition.id} key={definition.id}>{definition.name}</option>)}</select></label>
    </>}
  </Subgroup>;
}

function BonusSettings({ rules, update }) {
  return <Subgroup title={t('presetLibrary.rules.bonusTiebreaker')}>
    <CheckField label={t('presetLibrary.rules.bonus')} checked={rules.initiativeBonusEnabled} onChange={(initiativeBonusEnabled) => update({ initiativeBonusEnabled })} />
    <CheckField label={t('presetLibrary.rules.tiebreaker')} checked={rules.tiebreakerVisible} onChange={(tiebreakerVisible) => update({ tiebreakerVisible })} />
    {rules.tiebreakerVisible && <TextField label={t('presetLibrary.rules.tiebreakerLabel')} value={rules.tiebreakerLabel} onChange={(tiebreakerLabel) => update({ tiebreakerLabel })} />}
  </Subgroup>;
}

function ActionSettings({ rules, update }) {
  return <div className="rule-admin-stack">
    <Subgroup title={t('presetLibrary.rules.multipleActions')}>
      <SelectField label={t('presetLibrary.rules.mode')} value={rules.multipleActionMode} options={optionSets.multipleActions} onChange={(multipleActionMode) => update({ multipleActionMode })} />
      {rules.multipleActionMode === multipleActionModes.MANUAL && <SelectField label={t('presetLibrary.rules.scope')} value={rules.manualMultipleActionScope} options={optionSets.manualScope} onChange={(manualMultipleActionScope) => update({ manualMultipleActionScope })} />}
      {rules.multipleActionMode === multipleActionModes.INITIATIVE_COST && <>
        <TextField label={t('presetLibrary.rules.threshold')} type="number" value={rules.initiativeCostThreshold} onChange={(initiativeCostThreshold) => update({ initiativeCostThreshold })} />
        <TextField label={t('presetLibrary.rules.quickCosts')} value={listText(rules.initiativeCostQuickCosts)} onChange={(value) => update({ initiativeCostQuickCosts: parseList(value) })} />
        <CheckField label={t('presetLibrary.rules.limitCost')} checked={rules.initiativeCostLimitToCurrent} onChange={(initiativeCostLimitToCurrent) => update({ initiativeCostLimitToCurrent })} />
      </>}
    </Subgroup>
  </div>;
}

function TypeSettings({ rules, update }) {
  const customTypes = (rules.participantTypes || []).filter((item) => !participantKinds.includes(item.name));
  const moveType = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= (rules.categoryOrder || []).length) return;
    const categoryOrder = [...rules.categoryOrder];
    [categoryOrder[index], categoryOrder[target]] = [categoryOrder[target], categoryOrder[index]];
    update({ categoryOrder });
  };
  const updateCustomType = (index, patch) => {
    const current = customTypes[index];
    const nextCustomTypes = customTypes.map((item, position) => position === index ? { ...item, ...patch } : item);
    const categoryOrder = patch.name === undefined
      ? rules.categoryOrder
      : (rules.categoryOrder || []).map((name) => name === current.name ? patch.name : name);
    update({ participantTypes: nextCustomTypes, categoryOrder });
  };
  const addCustomType = () => {
    const existingNames = new Set([...(rules.categoryOrder || []), ...customTypes.map((item) => item.name)]);
    let name = t('presetLibrary.rules.newCustomType');
    let suffix = 2;
    while (existingNames.has(name)) {
      name = `${t('presetLibrary.rules.newCustomType')} ${suffix}`;
      suffix += 1;
    }
    update({
      participantTypes: [...customTypes, { name, behaviorType: 'Opposant' }],
      categoryOrder: [...(rules.categoryOrder || []), name],
    });
  };
  const deleteCustomType = (index) => {
    const deletedName = customTypes[index]?.name;
    update({
      participantTypes: customTypes.filter((_, position) => position !== index),
      categoryOrder: (rules.categoryOrder || []).filter((name) => name !== deletedName),
    });
  };
  return <Subgroup title={t('presetLibrary.rules.organization')}>
    <div className="rule-type-order">
      <strong>{t('presetLibrary.rules.categories')}</strong>
      <ol>{(rules.categoryOrder || []).map((name, index) => <li key={`${name}-${index}`}>
        <span>{name}</span>
        <div className="rule-type-order-actions">
          <button type="button" className="small-btn" aria-label={t('presetLibrary.rules.moveTypeUp', { name })} title={t('presetLibrary.rules.moveTypeUp', { name })} disabled={index === 0} onClick={() => moveType(index, -1)}>▲</button>
          <button type="button" className="small-btn" aria-label={t('presetLibrary.rules.moveTypeDown', { name })} title={t('presetLibrary.rules.moveTypeDown', { name })} disabled={index === rules.categoryOrder.length - 1} onClick={() => moveType(index, 1)}>▼</button>
        </div>
      </li>)}</ol>
    </div>
    <div className="rule-custom-types">
      <header><strong>{t('presetLibrary.rules.customTypes')}</strong><button type="button" className="small-btn" onClick={addCustomType}>{t('common.add')}</button></header>
      {customTypes.length ? customTypes.map((item, index) => <div className="rule-custom-type-row" key={index}>
        <label><span>{t('common.name')}</span><input value={item.name} onChange={(event) => updateCustomType(index, { name: event.target.value })} /></label>
        <label><span>{t('presetLibrary.rules.cloneBehavior')}</span><select value={item.behaviorType || 'Opposant'} onChange={(event) => updateCustomType(index, { behaviorType: event.target.value })}>{participantKinds.map((kind) => <option value={kind} key={kind}>{kind}</option>)}</select></label>
        <button type="button" className="danger-btn" onClick={() => deleteCustomType(index)}>{t('common.delete')}</button>
      </div>) : <p className="muted compact-help">{t('presetLibrary.rules.noCustomTypes')}</p>}
    </div>
  </Subgroup>;
}

const optionLabel = (options, value) => options.find(([optionValue]) => optionValue === value)?.[1] || value || '—';
const initiativeFormatValue = (rules) => {
  const config = normalizeInitiativeTextOrder(rules.initiativeTextOrder);
  return !config.enabled ? 'numeric' : Object.values(initiativeTextOrderPresetIds).includes(config.preset) ? config.preset : 'custom';
};
const initiativeFormatPatch = (rules, nextFormat) => {
  const config = normalizeInitiativeTextOrder(rules.initiativeTextOrder);
  if (nextFormat === 'numeric') return { initiativeValueType: initiativeValueTypes.NUMERIC, initiativeTextOrder: { ...config, enabled: false } };
  const nextConfig = nextFormat === 'custom'
    ? { ...config, enabled: true, preset: '', parts: config.parts.length ? config.parts : [{ label: 'Ordre', values: ['Premier', 'Deuxième'] }] }
    : presetInitiativeTextOrder(nextFormat);
  return { initiativeValueType: initiativeValueTypes.LABEL, initiativeTextOrder: nextConfig };
};
const phaseSummary = (rules) => rules.temporalite !== temporalityModes.PHASES
  ? '—'
  : rules.phaseActionMode === phaseActionModes.CHECKED
    ? `Cochées · ${rules.phaseCount}`
    : `Initiative · −${rules.phaseDecrement}`;
const initiativeDetailsSummary = (rules, rollDefinitions) => {
  const roll = rollDefinitions.find((definition) => definition.id === rules.initiativeBonusRollDefinitionId);
  return `${roll?.name || 'Sans tirage'} · ${rules.phaseRerollEachRound ? 'relance' : 'fixe'} · ${rules.activationAdvancePolicy === activationAdvancePolicies.EVERY_ACTION ? 'chaque action' : '1/round'}`;
};
const formatDetailsSummary = (rules, randomSources) => {
  const config = normalizeInitiativeTextOrder(rules.initiativeTextOrder);
  if (!config.enabled) return '—';
  const source = randomSources.find((item) => item.id === (config.sourceId || config.cardSourceId));
  return source?.name || `${config.parts.length} partie${config.parts.length > 1 ? 's' : ''} · inconnus ${config.unknown === 'first' ? 'avant' : 'après'}`;
};
const bonusDetailsSummary = (rules) => rules.tiebreakerVisible ? `Départage · ${rules.tiebreakerLabel}` : rules.initiativeBonusEnabled ? 'Bonus sans départage' : 'Aucun réglage';
const actionDetailsSummary = (rules) => {
  if (rules.multipleActionMode === multipleActionModes.NONE) return '—';
  if (rules.multipleActionMode === multipleActionModes.MANUAL) {
    return rules.manualMultipleActionScope === manualMultipleActionScopes.ELITE_ONLY ? 'Élites uniquement' : 'Tous les participants';
  }
  return `Seuil ${rules.initiativeCostThreshold} · ${listText(rules.initiativeCostQuickCosts)}`;
};
const surpriseDetailsSummary = (rules) => `${rules.surpriseAdvanceOn === 'round' ? 'Fin au round' : 'Fin à l’activation'}${rules.surpriseDedicatedRound ? ' · round dédié' : ''}`;
const typeSummary = (rules) => (rules.categoryOrder || []).join(' › ') || '—';
const declarationValue = (rules) => !rules.declarationMode ? 'none' : rules.declarationRequireText ? 'required' : 'free';
const bonusTiebreakerValue = (rules) => rules.initiativeBonusEnabled
  ? rules.tiebreakerVisible ? 'both' : 'bonus'
  : rules.tiebreakerVisible ? 'tiebreaker' : 'none';
const initiativeTableValue = (rules) => rules.temporalite === temporalityModes.FLEXIBLE && rules.flexibleUseInitiative === false
  ? 'none'
  : rules.initiativeOrder;

function SummaryButton({ children, onClick, disabled = false }) {
  return <button type="button" className="rule-summary-button" disabled={disabled} title={typeof children === 'string' ? children : undefined} onClick={onClick}>{children}</button>;
}

function rulesForPreset(rules) {
  const normalized = normalizeCampaignRules(rules);
  delete normalized.randomSystemMode;
  return normalized;
}

function RuleEditor({ section, rules, update, rollDefinitions, randomSources }) {
  if (section === 'phases') return <PhaseSettings rules={rules} update={update} />;
  if (section === 'initiative') return <InitiativeSettings rules={rules} update={update} rollDefinitions={rollDefinitions} />;
  if (section === 'format') return <InitiativeFormatSettings rules={rules} update={update} randomSources={randomSources} />;
  if (section === 'bonus') return <BonusSettings rules={rules} update={update} />;
  if (section === 'actions') return <ActionSettings rules={rules} update={update} />;
  if (section === 'surprise') return <SurpriseSettings rules={rules} update={update} />;
  return <TypeSettings rules={rules} update={update} />;
}

export function RulePresetAdminTable({
  presets,
  onSave,
  onDelete,
  onCreate,
  rollDefinitions = [],
  randomSources = [],
}) {
  const [drafts, setDrafts] = useState({});
  const [editor, setEditor] = useState(null);
  useEffect(() => {
    setDrafts(Object.fromEntries(presets.map((preset) => [
      preset.catalogId || preset.id,
      { name: preset.name, rules: normalizeCampaignRules(preset.rules || {}) },
    ])));
  }, [presets]);
  const updateDraft = (preset, patch) => {
    const key = preset.catalogId || preset.id;
    setDrafts((current) => {
      const base = current[key] || { name: preset.name, rules: normalizeCampaignRules(preset.rules || {}) };
      return { ...current, [key]: { ...base, ...patch, rules: { ...base.rules, ...(patch.rules || {}) } } };
    });
  };
  const save = (preset) => {
    const key = preset.catalogId || preset.id;
    const draft = drafts[key] || { name: preset.name, rules: normalizeCampaignRules(preset.rules || {}) };
    onSave?.(rulesForPreset(draft.rules), {
      name: draft.name,
      overwriteExistingId: preset.id,
      confirmDuplicate: true,
    });
  };
  const editorPreset = editor ? presets.find((preset) => (preset.catalogId || preset.id) === editor.key) : null;
  const editorDraft = editorPreset ? drafts[editor.key] || { name: editorPreset.name, rules: normalizeCampaignRules(editorPreset.rules || {}) } : null;
  const openEditor = (key, section) => setEditor({ key, section });
  return <>
    <div className="preset-rule-table-wrap">
    <table className="preset-rule-table preset-rule-compact-table">
      <colgroup>{Array.from({ length: 12 }, (_, index) => <col key={index} />)}</colgroup>
      <thead><tr><th scope="col">{t('presetLibrary.table.preset')}</th><th scope="col">{t('presetLibrary.rules.temporality')}</th><th scope="col">{t('presetLibrary.rules.declaration')}</th><th scope="col">{t('presetLibrary.rules.phases')}</th><th scope="col">{t('presetLibrary.rules.initiative')}</th><th scope="col">{t('presetLibrary.rules.format')}</th><th scope="col">{t('presetLibrary.rules.bonusTiebreaker')}</th><th scope="col">{t('presetLibrary.rules.actions')}</th><th scope="col">{t('presetLibrary.rules.surprise')}</th><th scope="col">{t('presetLibrary.rules.equality')}</th><th scope="col">{t('presetLibrary.rules.categories')}</th><th scope="col">{t('presetLibrary.table.manage')}</th></tr></thead>
      <tbody>{presets.map((preset) => {
        const key = preset.catalogId || preset.id;
        const draft = drafts[key] || { name: preset.name, rules: normalizeCampaignRules(preset.rules || {}) };
        const updateRules = (patch) => updateDraft(preset, { rules: patch });
        return <tr key={key}>
          <th scope="row" className="preset-rule-name"><input value={draft.name} onChange={(event) => updateDraft(preset, { name: event.target.value })} aria-label={t('presetLibrary.table.presetName')} /></th>
          <td><select value={draft.rules.temporalite} onChange={(event) => updateRules({ temporalite: event.target.value, ...(event.target.value === temporalityModes.FLEXIBLE ? { surpriseAdvanceOn: 'round' } : {}) })}>{optionSets.temporality.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
          <td><select value={declarationValue(draft.rules)} onChange={(event) => updateRules({ declarationMode: event.target.value !== 'none', declarationRequireText: event.target.value === 'required' })}>{optionSets.declaration.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></td>
          <td><div className="rule-compact-two-lines"><select disabled={draft.rules.temporalite !== temporalityModes.PHASES} value={draft.rules.phaseActionMode} onChange={(event) => updateRules({ phaseActionMode: event.target.value })}>{optionSets.phaseMode.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton disabled={draft.rules.temporalite !== temporalityModes.PHASES} onClick={() => openEditor(key, 'phases')}>{phaseSummary(draft.rules)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={initiativeTableValue(draft.rules)} onChange={(event) => updateRules(event.target.value === 'none' ? { flexibleUseInitiative: false } : { flexibleUseInitiative: true, initiativeOrder: event.target.value })}>{[[initiativeOrders.DESC, 'Décroissant'], [initiativeOrders.ASC, 'Croissant'], ...(draft.rules.temporalite === temporalityModes.FLEXIBLE ? [['none', 'Sans initiative']] : [])].map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton onClick={() => openEditor(key, 'initiative')}>{initiativeDetailsSummary(draft.rules, rollDefinitions)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={initiativeFormatValue(draft.rules)} onChange={(event) => updateRules(initiativeFormatPatch(draft.rules, event.target.value))}>{optionSets.textFormat.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton disabled={initiativeFormatValue(draft.rules) === 'numeric'} onClick={() => openEditor(key, 'format')}>{formatDetailsSummary(draft.rules, randomSources)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={bonusTiebreakerValue(draft.rules)} onChange={(event) => updateRules({ initiativeBonusEnabled: ['both', 'bonus'].includes(event.target.value), tiebreakerVisible: ['both', 'tiebreaker'].includes(event.target.value) })}>{optionSets.bonusTiebreaker.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton onClick={() => openEditor(key, 'bonus')}>{bonusDetailsSummary(draft.rules)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={draft.rules.multipleActionMode} onChange={(event) => updateRules({ multipleActionMode: event.target.value })}>{optionSets.multipleActions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton disabled={draft.rules.multipleActionMode === multipleActionModes.NONE} onClick={() => openEditor(key, 'actions')}>{actionDetailsSummary(draft.rules)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={draft.rules.surpriseImpact} onChange={(event) => updateRules({ surpriseImpact: event.target.value })}>{optionSets.surpriseImpact.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><SummaryButton onClick={() => openEditor(key, 'surprise')}>{surpriseDetailsSummary(draft.rules)}</SummaryButton></div></td>
          <td><div className="rule-compact-two-lines"><select value={draft.rules.equalityRule} onChange={(event) => updateRules({ equalityRule: event.target.value })}>{optionSets.equality.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><select value={draft.rules.rounding} onChange={(event) => updateRules({ rounding: event.target.value })}>{optionSets.rounding.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div></td>
          <td><SummaryButton onClick={() => openEditor(key, 'types')}>{typeSummary(draft.rules)}</SummaryButton></td>
          <td className="preset-rule-actions"><button type="button" className="small-btn" onClick={() => save(preset)}>{t('common.save')}</button><button type="button" className="danger-btn" onClick={() => onDelete?.(preset.id)} disabled={!preset.persisted}>{t('common.delete')}</button></td>
        </tr>;
      })}</tbody>
    </table>
    <footer className="preset-rule-table-footer"><button type="button" className="small-btn" onClick={onCreate}>{t('presetLibrary.table.new')}</button></footer>
    </div>
    {editor && editorPreset && editorDraft && <Fenetre title={t(`presetLibrary.rules.${editor.section}`)} className="preset-rule-editor-window" onClose={() => setEditor(null)}>
      <div className="preset-rule-editor-content"><RuleEditor section={editor.section} rules={editorDraft.rules} update={(patch) => updateDraft(editorPreset, { rules: patch })} rollDefinitions={rollDefinitions} randomSources={randomSources} /></div>
      <footer className="preset-rule-editor-footer"><button type="button" className="primary" onClick={() => setEditor(null)}>{t('common.close')}</button></footer>
    </Fenetre>}
  </>;
}
