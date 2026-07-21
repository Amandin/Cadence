import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { rulePresetCatalog, rulePresetFamilies } from '../../rulePresets.js';
import { randomKitCatalog } from '../../random-system/rulePresetKits.js';
import { ConfigurationPanel } from '../../random-system/ui/ConfigurationPanel.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import '../../random-system/styles/configuration.css';
import './PresetLibraryPage.css';

const sections = [
  { id: 'rules', label: 'Règles d’initiative' },
  { id: 'kits', label: 'Ensembles de tirages' },
  { id: 'definitions', label: 'Tirages disponibles' },
  { id: 'sources', label: 'Sources et paquets' },
];

function PresetCodeEditor({ value, onSave, saveLabel }) {
  const [draft, setDraft] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState('');
  useEffect(() => {
    setDraft(JSON.stringify(value, null, 2));
    setError('');
  }, [value]);
  const save = () => {
    try {
      const parsed = JSON.parse(draft);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error();
      onSave?.(parsed);
      setError('');
    } catch {
      setError(t('presetLibrary.code.invalid'));
    }
  };
  return <details className="preset-library-code">
    <summary>{t('presetLibrary.code.title')}</summary>
    <p>{t('presetLibrary.code.help')}</p>
    <textarea value={draft} spellCheck="false" onChange={(event) => setDraft(event.target.value)} aria-label={t('presetLibrary.code.title')} />
    {error && <p className="rule-warning" role="alert">{error}</p>}
    <button type="button" className="small-btn" onClick={save}>{saveLabel}</button>
  </details>;
}

function RuleCard({ preset, onSave }) {
  const rules = preset.rules || {};
  return <article className="preset-library-card">
    <div><span>{rulePresetFamilies[preset.family] || preset.family || 'Configuration'}</span><h3>{preset.name}</h3><p>{preset.description}</p></div>
    <div className="preset-library-tags"><span>{rules.temporalite || 'classique'}</span><span>{rules.initiativeValueType || 'numérique'}</span><span>{rules.multipleActionsMode || 'une action'}</span></div>
    <button type="button" className="small-btn" onClick={() => onSave?.(preset.rules, { name: preset.name, confirmDuplicate: true })}>Créer une copie modifiable</button>
    <PresetCodeEditor value={rules} saveLabel={t('presetLibrary.code.saveRules')} onSave={(nextRules) => onSave?.(nextRules, { name: `${preset.name} — modifié`, confirmDuplicate: true })} />
  </article>;
}

function KitCard({ kit, onApply, onSave }) {
  return <article className="preset-library-card">
    <div><span>{t('presetLibrary.kit')}</span><h3>{kit.label}</h3><p>{kit.description}</p></div>
    <div className="preset-library-tags"><span>{kit.definitions?.length || 0} tirages</span><span>{kit.sources?.length || kit.sourceIds?.length || 0} sources</span></div>
    <button type="button" className="small-btn" onClick={() => onApply?.(kit.id)}>Appliquer la sélection</button>
    <PresetCodeEditor value={kit} saveLabel={t('presetLibrary.code.saveKit')} onSave={(nextKit) => onSave?.({ ...nextKit, id: nextKit.id === kit.id ? `custom-${kit.id}-${Date.now()}` : nextKit.id })} />
  </article>;
}

export function PresetLibraryPage({ randomSystem, ruleTemplates = [], onBack, onSaveRuleTemplate }) {
  const [section, setSection] = useState('rules');
  const catalogRules = useMemo(() => [...rulePresetCatalog, ...ruleTemplates.map((template) => ({ ...template, family: 'local', description: 'Préréglage enregistré dans cette campagne.' }))], [ruleTemplates]);
  const kits = useMemo(() => [...randomKitCatalog, ...(randomSystem?.state?.randomKits || [])], [randomSystem?.state?.randomKits]);
  return <div className="preset-library-page">
    <header className="preset-library-header">
      <div><span className="style-reference-eyebrow">{t('presetLibrary.eyebrow')}</span><h2>{t('presetLibrary.title')}</h2><p className="muted">{t('presetLibrary.help')}</p></div>
      <button type="button" className="small-btn" onClick={onBack}><IconeCadence name="return" /> {t('styleReference.back')}</button>
    </header>
    <nav className="preset-library-tabs" aria-label={t('presetLibrary.title')}>{sections.map((item) => <button type="button" className={section === item.id ? 'selected' : ''} onClick={() => setSection(item.id)} key={item.id}>{item.label}</button>)}</nav>
    {section === 'rules' && <section className="preset-library-grid">{catalogRules.map((preset) => <RuleCard key={preset.catalogId || preset.id} preset={preset} onSave={onSaveRuleTemplate} />)}</section>}
    {section === 'kits' && <section className="preset-library-grid">{kits.map((kit) => <KitCard key={kit.id} kit={kit} onApply={randomSystem?.actions?.applyRandomKitSelection} onSave={randomSystem?.actions?.saveRandomKit} />)}</section>}
    {['definitions', 'sources'].includes(section) && <section className="random-system-page preset-library-configuration"><ConfigurationPanel state={randomSystem?.state || {}} actions={randomSystem?.actions || {}} section={section} /></section>}
  </div>;
}
