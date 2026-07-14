import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs, uiSymbols } from '../../uiAssets.js';
import { OptionsContent, ThemeModeToggle } from '../app/MenuOptions.jsx';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { activeDefinitions } from '../../random-system/definitionAccess.js';

const OngletRegles = lazy(() => import('./OngletRegles.jsx').then((module) => ({ default: module.OngletRegles })));
const OngletTemplates = lazy(() => import('./OngletTemplates.jsx').then((module) => ({ default: module.OngletTemplates })));
const loadRandomUsePanel = () => import('../../random-system/ui/UsePanel.jsx');
const loadRandomConfigurationPanel = () => import('../../random-system/ui/ConfigurationPanel.jsx');
const loadRandomStatisticsPanel = () => import('../../random-system/ui/StatisticsPanel.jsx');
const loadStyleReferencePage = () => import('../app/StyleReferencePage.jsx');
const loadAdminPresetsPage = () => import('../app/AdminPresetsPage.jsx');
const UsePanel = lazy(() => loadRandomUsePanel().then((module) => ({ default: module.UsePanel })));
const ConfigurationPanel = lazy(() => loadRandomConfigurationPanel().then((module) => ({ default: module.ConfigurationPanel })));
const StatisticsPanel = lazy(() => loadRandomStatisticsPanel().then((module) => ({ default: module.StatisticsPanel })));
const StyleReferencePage = lazy(() => loadStyleReferencePage().then((module) => ({ default: module.StyleReferencePage })));
const AdminPresetsPage = lazy(() => loadAdminPresetsPage().then((module) => ({ default: module.AdminPresetsPage })));

const HUB_TAB_STORAGE_KEY = 'cadence:interface:hub-tab:v1';

function initialHubTab() {
  try {
    const value = window.sessionStorage.getItem(HUB_TAB_STORAGE_KEY);
    return ['scenes', 'regles', 'tirages', 'campagnes', 'templates'].includes(value) ? value : 'scenes';
  } catch {
    return 'scenes';
  }
}

function OngletsHub({ onglet, setOnglet }) {
  return (
    <nav className="grid4 hub-tabs" aria-label={t('hub.navigation')}>
      <button type="button" className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} aria-current={onglet === 'scenes' ? 'page' : undefined} onClick={() => setOnglet('scenes')}>{t('hub.tabs.scenes')}</button>
      <button type="button" className={`choice ${onglet === 'tirages' ? 'selected' : ''}`} aria-current={onglet === 'tirages' ? 'page' : undefined} onPointerEnter={loadRandomUsePanel} onFocus={loadRandomUsePanel} onClick={() => setOnglet('tirages')}>{t('hub.tabs.random')}</button>
      <button type="button" className={`choice ${onglet === 'regles' ? 'selected' : ''}`} aria-current={onglet === 'regles' ? 'page' : undefined} onClick={() => setOnglet('regles')}>{t('hub.tabs.rules')}</button>
      <button type="button" className={`choice ${onglet === 'templates' ? 'selected' : ''}`} aria-current={onglet === 'templates' ? 'page' : undefined} onClick={() => setOnglet('templates')}>{t('hub.tabs.templates')}</button>
      <button type="button" className={`choice ${onglet === 'campagnes' ? 'selected' : ''}`} aria-current={onglet === 'campagnes' ? 'page' : undefined} onClick={() => setOnglet('campagnes')}>{t('hub.tabs.campaigns')}</button>
    </nav>
  );
}

function ChargementOnglet({ texte }) {
  return <div className="panel empty-section hub-tab-loading">{texte}</div>;
}

function EnteteHub({ campaignName, sombre, themeState, onThemeModeChange }) {
  const logo = getCadenceLogo(sombre);
  return (
    <header className="campaign-hub-header panel">
      <div className="menu-brand campaign-brand-capsule">
        <img src={logo} alt="Cadence" />
        <div>
          <h1 className="brand-title">Cadence</h1>
          <span className="muted brand-meta">{campaignName || t('hub.brandFallback')} {uiGlyphs.middleDot} v{APP_VERSION}</span>
        </div>
        <ThemeModeToggle themeState={themeState} onThemeModeChange={onThemeModeChange} ariaLabel={t('hub.themeToggle')} />
      </div>
    </header>
  );
}

function CarteScene({ scene, index, canDelete, editing, onEditer, onFermerEdition, onChoisirScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  const [titre, setTitre] = useState(scene.title || t('hub.scene.defaultTitle'));
  const [type, setType] = useState(scene.type || t('hub.scene.defaultType'));
  const [notes, setNotes] = useState(scene.notes || '');
  const [suppressionVisible, setSuppressionVisible] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setTitre(scene.title || t('hub.scene.defaultTitle'));
    setType(scene.type || t('hub.scene.defaultType'));
    setNotes(scene.notes || '');
  }, [editing, scene.notes, scene.title, scene.type]);

  const enregistrer = () => {
    onModifierScene(index, { title: titre.trim() || t('hub.scene.defaultTitle'), type: type.trim() || t('hub.scene.defaultType'), notes });
    onFermerEdition();
  };

  return (
    <div className="hub-scene-card">
      {editing ? (
        <div className="stack hub-scene-edit">
          <label className="field">{t('hub.scene.name')}<input type="text" value={titre} onChange={(event) => setTitre(event.target.value)} /></label>
          <label className="field">{t('hub.scene.type')}<input type="text" value={type} onChange={(event) => setType(event.target.value)} /></label>
          <label className="field">{t('hub.scene.notes')}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label>
          <div className="grid2">
            <button className="primary" onClick={enregistrer}>{t('common.save')}</button>
            <button className="small-btn" onClick={onFermerEdition}>{t('common.cancel')}</button>
          </div>
        </div>
      ) : (
        <>
          <div className="hub-scene-summary">
            <strong className="hub-scene-title">{scene.title || t('hub.scene.defaultTitle')}</strong>
            <span className="hub-scene-type">{scene.type || t('hub.scene.defaultType')}</span>
            {canDelete && (
              <div className={`hub-scene-delete-actions ${suppressionVisible ? 'confirming' : ''}`}>
                {suppressionVisible && <button className="small-btn scene-delete-cancel" onClick={() => setSuppressionVisible(false)}>{t('common.cancel')}</button>}
                {suppressionVisible ? (
                  <button className="danger-btn mini-danger scene-delete-confirm" onClick={() => onSupprimerScene(index)}>{t('common.delete')}</button>
                ) : (
                  <button className="small-btn scene-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={t('hub.scene.deleteRevealAria', { title: scene.title || t('hub.scene.defaultTitle') })}><IconeCadence name="remove" /></button>
                )}
              </div>
            )}
          </div>
          {scene.notes && <p className="muted compact-help hub-scene-notes">{scene.notes}</p>}
          <div className="hub-scene-actions explicit">
            <button className="primary" onClick={() => onChoisirScene(index)}>{t('hub.scene.open')}</button>
            <button className="small-btn" onClick={() => onEditer(scene.id)}>{t('hub.scene.edit')}</button>
            <button className="small-btn" onClick={() => onDupliquerScene(index)}>{t('hub.scene.duplicate')}</button>
          </div>
        </>
      )}
    </div>
  );
}

function OngletScenes({ scenes, editingSceneId, onEditerScene, onFermerEditionScene, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  return (
    <div className="stack hub-section panel">
      <div className="hub-section-head">
        <div>
          <h2>{t('hub.scenes.title')}</h2>
          <p className="muted compact-help">{t('hub.scenes.help')}</p>
        </div>
        <button className="small-btn" onClick={onNouvelleScene}>{t('hub.scenes.new')}</button>
      </div>
      <div className="stack hub-scene-list">
        {scenes.length > 0
          ? scenes.map((scene, index) => (
            <CarteScene
              key={scene.id}
              scene={scene}
              index={index}
              editing={scene.id === editingSceneId}
              canDelete={scenes.length > 1}
              onEditer={onEditerScene}
              onFermerEdition={onFermerEditionScene}
              onChoisirScene={onChoisirScene}
              onModifierScene={onModifierScene}
              onDupliquerScene={onDupliquerScene}
              onSupprimerScene={onSupprimerScene}
            />
          ))
          : <div className="empty-section panel">{t('hub.scenes.empty')}</div>}
      </div>
    </div>
  );
}

const rulesHubSections = [
  { id: 'initiative', labelKey: 'rules.navigation.initiative' },
  { id: 'kits', labelKey: 'rules.navigation.kits' },
  { id: 'definitions', labelKey: 'random.config.rollDefinitions' },
  { id: 'sources', labelKey: 'random.config.sources' },
];

function OngletReglesEtHasard({ scene, campaignProfile, rulePresetSnapshot, ruleTemplates, initiativeTextPresets, randomSystem, onModifierReglesInitiative, onOuvrirProfilCampagne, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onEnregistrerPresetInitiativeTextuelle, onDupliquerTemplateRegles, onSupprimerTemplateRegles }) {
  const [section, setSection] = useState('initiative');
  const randomConfigurationSection = ['kits', 'definitions', 'sources'].includes(section);
  return (
    <div className="stack hub-section panel rules-hub">
      <div className="hub-section-head">
        <h2>{t('rules.navigation.title')}</h2>
      </div>
      <nav className="template-subtabs rules-subtabs" aria-label={t('rules.navigation.title')}>
        {rulesHubSections.map((entry) => (
          <button
            type="button"
            className={`choice ${section === entry.id ? 'selected' : ''}`}
            aria-pressed={section === entry.id}
            onPointerEnter={['kits', 'definitions', 'sources'].includes(entry.id) ? loadRandomConfigurationPanel : undefined}
            onFocus={['kits', 'definitions', 'sources'].includes(entry.id) ? loadRandomConfigurationPanel : undefined}
            onClick={() => setSection(entry.id)}
            key={entry.id}
          >
            {t(entry.labelKey)}
          </button>
        ))}
      </nav>
      <Suspense fallback={<ChargementOnglet texte={t('random.loadingSection')} />}>
        <div className="rules-hub-content">
          {section === 'initiative' && <OngletRegles embedded scene={scene} campaignProfile={campaignProfile} rulePresetSnapshot={rulePresetSnapshot} onModifierRegles={onModifierReglesInitiative} ruleTemplates={ruleTemplates} initiativeTextPresets={initiativeTextPresets} cardSources={randomSystem.state.sources.filter((source) => source.kind === 'cards')} rollDefinitions={activeDefinitions(randomSystem.state.definitions)} onOuvrirProfilCampagne={onOuvrirProfilCampagne} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onEnregistrerPresetInitiativeTextuelle={onEnregistrerPresetInitiativeTextuelle} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} />}
          {randomConfigurationSection && <section className="random-system-page"><ConfigurationPanel state={randomSystem.state} actions={randomSystem.actions} section={section} /></section>}
        </div>
      </Suspense>
    </div>
  );
}

function OngletCampagnes({ campaignName, campaignEntries = [], fileSaveStatus, performanceState, themeState, randomSystem, ruleTemplates, onEnregistrerTemplateRegles, onSupprimerTemplateRegles, onRenommerCampagne, onExporter, onImporter, onImporterTemplates, onExporterBibliotheque, onChargerCampagneTest, onReinitialiser, onPerformancePreferenceChange, onThemeModeChange }) {
  const inputImportRef = useRef(null);
  const inputLibraryRef = useRef(null);
  const importEnCoursRef = useRef(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [styleReferenceOpen, setStyleReferenceOpen] = useState(false);
  const [adminPresetsOpen, setAdminPresetsOpen] = useState(false);
  const statutVisible = fileSaveStatus?.mode !== 'local' || (fileSaveStatus?.message && fileSaveStatus.message !== t('hub.campaigns.status.local'));

  const ouvrirImport = async () => {
    if (importEnCoursRef.current) return;
    importEnCoursRef.current = true;
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ multiple: false, types: [{ description: t('hub.campaigns.filePickerDescription'), accept: { 'application/json': ['.cad'] } }] });
        const file = await handle?.getFile();
        if (file) await onImporter(file, { handle });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        return;
      } finally {
        importEnCoursRef.current = false;
      }
    }
    importEnCoursRef.current = false;
    inputImportRef.current?.click();
  };

  const importerFichier = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await onImporter(file);
  };
  const importerBibliotheque = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) await onImporterTemplates(file);
  };
  if (styleReferenceOpen) {
    return (
      <Suspense fallback={<ChargementOnglet texte={t('styleReference.loading')} />}>
        <StyleReferencePage themeState={themeState} onThemeModeChange={onThemeModeChange} onBack={() => setStyleReferenceOpen(false)} />
      </Suspense>
    );
  }
  if (adminPresetsOpen) {
    return (
      <Suspense fallback={<ChargementOnglet texte="Chargement de l’admin presets..." />}>
        <AdminPresetsPage ruleTemplates={ruleTemplates} randomSystem={randomSystem} onSaveRuleTemplate={onEnregistrerTemplateRegles} onDeleteRuleTemplate={onSupprimerTemplateRegles} onBack={() => setAdminPresetsOpen(false)} />
      </Suspense>
    );
  }
  return (
    <div className="stack hub-options-tab">
      <h2 className="visually-hidden">{t('hub.tabs.campaigns')}</h2>
      <OptionsContent performanceState={performanceState} themeState={themeState} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} />
      <section className="hub-section panel">
        <div className="hub-section-head">
          <div>
            <h3>{t('random.tabs.statistics')}</h3>
            <p className="muted compact-help">{t('random.stats.optionsHelp')}</p>
          </div>
          <button type="button" className="small-btn" onPointerEnter={loadRandomStatisticsPanel} onFocus={loadRandomStatisticsPanel} onClick={() => setStatsOpen(true)}>{t('random.stats.open')}</button>
        </div>
      </section>
      {statsOpen && (
        <Fenetre title={t('random.tabs.statistics')} onClose={() => setStatsOpen(false)} className="random-statistics-dialog">
          <section className="random-system-page">
            <Suspense fallback={<ChargementOnglet texte={t('random.loadingSection')} />}>
              <StatisticsPanel state={randomSystem.state} onReset={randomSystem.actions.resetStatistics} />
            </Suspense>
          </section>
        </Fenetre>
      )}
      <div className="stack hub-section panel cadence-files-panel">
        <div className="hub-section-head">
          <div>
            <h3>{t('hub.files.title')}</h3>
            <p className="muted compact-help">{t('hub.files.help')}</p>
          </div>
        </div>
        <label className="field">
          {t('hub.campaigns.name')}
          <input type="text" value={campaignName || ''} onChange={(event) => onRenommerCampagne(event.target.value)} />
        </label>
        <div className="cadence-file-grid">
          <section className="cadence-file-kind">
            <div className="cadence-file-kind-head">
              <h4>{t('hub.files.campaignTitle')}</h4>
              <span>.cad</span>
            </div>
            <p className="muted compact-help">{t('hub.files.campaignHelp')}</p>
            {!campaignEntries.length && <p className="muted compact-help">{t('hub.campaigns.empty')}</p>}
            {statutVisible && <div className={`campaign-save-status status-${fileSaveStatus?.mode || 'local'}`}>{fileSaveStatus?.message || t('hub.campaigns.status.local')}</div>}
            <div className="cadence-file-actions">
              <button className="primary" onClick={ouvrirImport}>{t('hub.files.openCampaign')}</button>
              <button className="small-btn" onClick={onExporter}>{t('hub.files.saveCampaign')}</button>
            </div>
          </section>
          <section className="cadence-file-kind">
            <div className="cadence-file-kind-head">
              <h4>{t('hub.files.libraryTitle')}</h4>
              <span>.cadlib</span>
            </div>
            <p className="muted compact-help">{t('hub.files.libraryHelp')}</p>
            <div className="cadence-file-actions">
              <button className="primary" onClick={() => inputLibraryRef.current?.click()}>{t('hub.files.importLibrary')}</button>
              <button className="small-btn" onClick={onExporterBibliotheque}>{t('hub.files.exportLibrary')}</button>
            </div>
          </section>
        </div>
        <input ref={inputImportRef} className="import-file-input" type="file" aria-label={t('hub.campaigns.importAria')} accept=".cad,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} />
        <input ref={inputLibraryRef} className="import-file-input" type="file" aria-label={t('hub.files.importLibrary')} accept=".cadlib,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerBibliotheque} />
        <details className="advanced-options">
          <summary>{t('hub.campaigns.advanced')}</summary>
          <button className="small-btn" type="button" onPointerEnter={loadAdminPresetsPage} onFocus={loadAdminPresetsPage} onClick={() => setAdminPresetsOpen(true)}>Admin presets règles/tirages</button>
          <button className="small-btn" type="button" onPointerEnter={loadStyleReferencePage} onFocus={loadStyleReferencePage} onClick={() => setStyleReferenceOpen(true)}>{t('hub.campaigns.styleReference')}</button>
          <button className="small-btn" onClick={onChargerCampagneTest}>{t('hub.campaigns.loadTest')}</button>
          <button className="danger-btn" onClick={onReinitialiser}>{t('hub.campaigns.reset')}</button>
        </details>
      </div>
    </div>
  );
}

export function HubCampagne({ campaignName, scene, scenes, templates, trackerTemplates, statusTemplates, sceneCounterTemplates, sceneStatusTemplates, ruleTemplates, initiativeTextPresets, campaignProfile, rulePresetSnapshot, randomSystem, templateCategories, campaignEntries, fileSaveStatus, dark, performanceState, themeState, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onOuvrirProfilCampagne, onRenommerCampagne, onExporter, onImporter, onChargerCampagneTest, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onAjouterTemplateSuivi, onModifierTemplateSuivi, onDupliquerTemplateSuivi, onSupprimerTemplateSuivi, onAjouterTemplateEtat, onModifierTemplateEtat, onDupliquerTemplateEtat, onSupprimerTemplateEtat, onAjouterTemplateCompteurScene, onModifierTemplateCompteurScene, onDupliquerTemplateCompteurScene, onSupprimerTemplateCompteurScene, onAjouterTemplateEtatScene, onModifierTemplateEtatScene, onDupliquerTemplateEtatScene, onSupprimerTemplateEtatScene, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onEnregistrerPresetInitiativeTextuelle, onDupliquerTemplateRegles, onSupprimerTemplateRegles, onImporterTemplates, onExporterBibliotheque, onFermerEditeursTemplates, templatePersonnageId, templatePersonnageOuvert, onFermerEditionTemplatePersonnage, onDemanderChangementDepuisTemplatePersonnage, onTemplatePanelOpenChange, onPerformancePreferenceChange, onThemeModeChange }) {
  const [onglet, setOnglet] = useState(initialHubTab);
  const [editingSceneId, setEditingSceneId] = useState('');
  const [editCreatedSceneWhenReady, setEditCreatedSceneWhenReady] = useState(false);

  useEffect(() => {
    if (!editCreatedSceneWhenReady || !scene?.id) return;
    setOnglet('scenes');
    setEditingSceneId(scene.id);
    setEditCreatedSceneWhenReady(false);
  }, [editCreatedSceneWhenReady, scene?.id]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(HUB_TAB_STORAGE_KEY, onglet);
    } catch {
      // Le Hub reste utilisable si le stockage de session est indisponible.
    }
  }, [onglet]);

  const changerOnglet = (suivant) => {
    if (onglet === 'templates' && suivant !== 'templates') onFermerEditeursTemplates?.();
    setOnglet(suivant);
  };

  const creerNouvelleScene = () => { onNouvelleScene(); setEditCreatedSceneWhenReady(true); };
  const dupliquerScene = (index) => { onDupliquerScene(index); setEditCreatedSceneWhenReady(true); };

  return (
    <div className="campaign-page shell">
      <EnteteHub campaignName={campaignName} sombre={dark} themeState={themeState} onThemeModeChange={onThemeModeChange} />
      <main className="campaign-hub-page">
        <OngletsHub onglet={onglet} setOnglet={changerOnglet} />
        {onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}
        {onglet === 'regles' && <OngletReglesEtHasard scene={scene} campaignProfile={campaignProfile} rulePresetSnapshot={rulePresetSnapshot} ruleTemplates={ruleTemplates} initiativeTextPresets={initiativeTextPresets} randomSystem={randomSystem} onModifierReglesInitiative={onModifierReglesInitiative} onOuvrirProfilCampagne={onOuvrirProfilCampagne} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onEnregistrerPresetInitiativeTextuelle={onEnregistrerPresetInitiativeTextuelle} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} />}
        {onglet === 'tirages' && <section className="random-system-page"><h2 className="visually-hidden">{t('hub.tabs.random')}</h2><Suspense fallback={<ChargementOnglet texte={t('random.loadingSection')} />}><UsePanel state={randomSystem.state} actions={randomSystem.actions} /></Suspense></section>}
        {onglet === 'campagnes' && <OngletCampagnes campaignName={campaignName} campaignEntries={campaignEntries} fileSaveStatus={fileSaveStatus} performanceState={performanceState} themeState={themeState} randomSystem={randomSystem} ruleTemplates={ruleTemplates} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} onRenommerCampagne={onRenommerCampagne} onExporter={onExporter} onImporter={onImporter} onImporterTemplates={onImporterTemplates} onExporterBibliotheque={onExporterBibliotheque} onChargerCampagneTest={onChargerCampagneTest} onReinitialiser={onReinitialiser} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} />}
        {onglet === 'templates' && <Suspense fallback={<ChargementOnglet texte={t('hub.loading.templates')} />}><OngletTemplates categories={templateCategories} templates={templates} trackerTemplates={trackerTemplates} statusTemplates={statusTemplates} sceneCounterTemplates={sceneCounterTemplates} sceneStatusTemplates={sceneStatusTemplates} surpriseImpact={scene?.surpriseImpact} surpriseAdvanceOn={scene?.surpriseAdvanceOn} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onAjouterTemplateSuivi={onAjouterTemplateSuivi} onModifierTemplateSuivi={onModifierTemplateSuivi} onDupliquerTemplateSuivi={onDupliquerTemplateSuivi} onSupprimerTemplateSuivi={onSupprimerTemplateSuivi} onAjouterTemplateEtat={onAjouterTemplateEtat} onModifierTemplateEtat={onModifierTemplateEtat} onDupliquerTemplateEtat={onDupliquerTemplateEtat} onSupprimerTemplateEtat={onSupprimerTemplateEtat} onAjouterTemplateCompteurScene={onAjouterTemplateCompteurScene} onModifierTemplateCompteurScene={onModifierTemplateCompteurScene} onDupliquerTemplateCompteurScene={onDupliquerTemplateCompteurScene} onSupprimerTemplateCompteurScene={onSupprimerTemplateCompteurScene} onAjouterTemplateEtatScene={onAjouterTemplateEtatScene} onModifierTemplateEtatScene={onModifierTemplateEtatScene} onDupliquerTemplateEtatScene={onDupliquerTemplateEtatScene} onSupprimerTemplateEtatScene={onSupprimerTemplateEtatScene} templatePersonnageId={templatePersonnageId} templatePersonnageOuvert={templatePersonnageOuvert} onFermerEditionTemplatePersonnage={onFermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={onDemanderChangementDepuisTemplatePersonnage} onTemplatePanelOpenChange={onTemplatePanelOpenChange} /></Suspense>}
      </main>
    </div>
  );
}
