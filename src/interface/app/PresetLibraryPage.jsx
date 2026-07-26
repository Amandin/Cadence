import { useMemo } from 'react';
import { t } from '../../i18n/index.js';
import { normalizeCampaignRules } from '../../domain/campaignRules.js';
import { rulePresetCatalog } from '../../rulePresets.js';
import { ConfigurationPanel } from '../../random-system/ui/ConfigurationPanel.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { RngAdminTables } from './RngAdminTables.jsx';
import { RulePresetAdminTable } from './RulePresetAdminTable.jsx';
import './PresetLibraryPage.css';

function exportAdminPresets(presets, randomState) {
  const rulePresets = presets.map(({ id, name, rules }) => {
    const presetRules = normalizeCampaignRules(rules);
    delete presetRules.randomSystemMode;
    return { id, name, rules: presetRules };
  });
  const payload = {
    format: 'cadence-admin-presets',
    version: 1,
    exportedAt: new Date().toISOString(),
    rulePresets,
    rng: randomState,
  };
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
  link.download = 'cadence-presets-rng.json';
  link.click();
  URL.revokeObjectURL(link.href);
}

export function PresetLibraryPage({ randomSystem, ruleTemplates = [], onBack, onSaveRuleTemplate, onDeleteRuleTemplate }) {
  const catalogRules = useMemo(() => {
    const savedById = new Map(ruleTemplates.map((template) => [template.id, template]));
    const catalogIds = new Set(rulePresetCatalog.map((preset) => preset.id));
    const catalog = rulePresetCatalog.map((preset) => ({ ...preset, ...(savedById.get(preset.id) || {}), persisted: savedById.has(preset.id), readOnly: false }));
    const personal = ruleTemplates.filter((template) => !catalogIds.has(template.id)).map((template) => ({ ...template, persisted: true, readOnly: false }));
    return [...catalog, ...personal];
  }, [ruleTemplates]);
  const createPreset = () => onSaveRuleTemplate?.(normalizeCampaignRules({}), { name: `${t('presetLibrary.table.new')} ${catalogRules.length + 1}`, confirmDuplicate: true });
  return <div className="preset-library-page">
    <header className="preset-library-header"><button type="button" className="small-btn" onClick={onBack}><IconeCadence name="return" /> {t('styleReference.back')}</button></header>
    <section className="preset-library-rules"><RulePresetAdminTable presets={catalogRules} onSave={onSaveRuleTemplate} onDelete={onDeleteRuleTemplate} onCreate={createPreset} rollDefinitions={randomSystem?.state?.definitions || []} randomSources={randomSystem?.state?.sources || []} /></section>
    <section className="preset-rng-settings">
      <header className="preset-rng-heading"><div><h2>{t('presetLibrary.rng.title')}</h2><p className="muted compact-help">{t('presetLibrary.rng.help')}</p></div></header>
      <RngAdminTables randomSystem={randomSystem} />
      <details className="preset-rng-advanced">
        <summary>{t('presetLibrary.rng.advanced')}</summary>
        <div className="preset-rng-advanced-panels">
          {['definitions', 'sources'].map((section) => <details key={section}><summary>{t(`presetLibrary.rng.${section}`)}</summary><ConfigurationPanel state={randomSystem?.state || { sources: [], definitions: [], rulePool: {}, tokenContainers: [] }} actions={randomSystem?.actions || {}} section={section} /></details>)}
        </div>
      </details>
    </section>
    <footer className="preset-library-export"><button type="button" className="primary" onClick={() => exportAdminPresets(catalogRules, randomSystem?.state || {})}>{t('presetLibrary.export')}</button></footer>
  </div>;
}
