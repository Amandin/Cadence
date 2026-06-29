import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';
import { OptionsContent, ThemeModeToggle } from '../app/MenuOptions.jsx';

const OngletRegles = lazy(() => import('./OngletRegles.jsx').then((module) => ({ default: module.OngletRegles })));
const OngletTemplates = lazy(() => import('./OngletTemplates.jsx').then((module) => ({ default: module.OngletTemplates })));
const loadRandomSystemPage = () => import('../../random-system/RandomSystemPage.jsx');
const RandomSystemPage = lazy(() => loadRandomSystemPage().then((module) => ({ default: module.RandomSystemPage })));

const HUB_TAB_STORAGE_KEY = 'cadence:interface:hub-tab:v1';

function initialHubTab() {
  try {
    const value = window.sessionStorage.getItem(HUB_TAB_STORAGE_KEY);
    return ['scenes', 'regles', 'campagnes', 'templates'].includes(value) ? value : 'scenes';
  } catch {
    return 'scenes';
  }
}

function OngletsHub({ onglet, setOnglet }) {
  return (
    <div className="grid4 hub-tabs">
      <button className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} onClick={() => setOnglet('scenes')}>{t('hub.tabs.scenes')}</button>
      <button className={`choice ${onglet === 'regles' ? 'selected' : ''}`} onClick={() => setOnglet('regles')}>{t('hub.tabs.rules')}</button>
      <button className={`choice ${onglet === 'campagnes' ? 'selected' : ''}`} onClick={() => setOnglet('campagnes')}>{t('hub.tabs.campaigns')}</button>
      <button className={`choice ${onglet === 'templates' ? 'selected' : ''}`} onClick={() => setOnglet('templates')}>{t('hub.tabs.templates')}</button>
    </div>
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
          <strong className="brand-title">Cadence</strong>
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
                  <button className="small-btn scene-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={t('hub.scene.deleteRevealAria', { title: scene.title || t('hub.scene.defaultTitle') })}>x</button>
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
          <h3>{t('hub.scenes.title')}</h3>
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

function BoutonRandomSystem({ onOuvrir }) {
  useEffect(() => {
    if (!window.requestIdleCallback) return undefined;
    const idleId = window.requestIdleCallback(loadRandomSystemPage, { timeout: 4000 });
    return () => window.cancelIdleCallback?.(idleId);
  }, []);

  return (
    <section className="hub-section panel hub-addon-panel">
      <div className="hub-section-head">
        <div>
          <h3>{t('addons.title')}</h3>
          <p className="muted compact-help">{t('addons.help')}</p>
        </div>
      </div>
      <button
        type="button"
        className="primary addon-launch-btn"
        onPointerEnter={loadRandomSystemPage}
        onPointerDown={loadRandomSystemPage}
        onFocus={loadRandomSystemPage}
        onClick={onOuvrir}
      >
        {t('random.open')}
      </button>
    </section>
  );
}

function OngletCampagnes({ campaignName, campaignEntries = [], fileSaveStatus, performanceState, themeState, onRenommerCampagne, onExporter, onImporter, onImporterTemplates, onChargerCampagneTest, onReinitialiser, onPerformancePreferenceChange, onThemeModeChange, onOuvrirRandomSystem }) {
  const inputImportRef = useRef(null);
  const inputImportTemplatesRef = useRef(null);
  const importEnCoursRef = useRef(false);
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
  const importerModeles = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImporterTemplates(file);
  };

  return (
    <div className="stack hub-options-tab">
      <OptionsContent performanceState={performanceState} themeState={themeState} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} />
      <BoutonRandomSystem onOuvrir={onOuvrirRandomSystem} />
      <div className="stack hub-section panel campaign-files-panel">
        <div className="hub-section-head"><h3>{t('hub.campaigns.title')}</h3></div>
        <p className="muted compact-help">{t('hub.campaigns.help')}</p>
        <label className="field">
          {t('hub.campaigns.name')}
          <input type="text" value={campaignName || ''} onChange={(event) => onRenommerCampagne(event.target.value)} />
        </label>
        {!campaignEntries.length && <p className="muted compact-help">{t('hub.campaigns.empty')}</p>}
        {statutVisible && <div className={`campaign-save-status status-${fileSaveStatus?.mode || 'local'}`}>{fileSaveStatus?.message || t('hub.campaigns.status.local')}</div>}
        <div className="grid2">
          <button className="primary" onClick={ouvrirImport}>{t('hub.campaigns.open')}</button>
          <button className="small-btn" onClick={onExporter}>{t('hub.campaigns.copy')}</button>
          <input ref={inputImportRef} className="import-file-input" type="file" aria-label={t('hub.campaigns.importAria')} accept=".cad,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} />
        </div>
        <button className="small-btn" onClick={() => inputImportTemplatesRef.current?.click()}>{t('templates.hub.import')}</button>
        <input ref={inputImportTemplatesRef} className="import-file-input" type="file" aria-label={t('templates.hub.import')} accept=".cad,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerModeles} />
        <details className="advanced-options">
          <summary>{t('hub.campaigns.advanced')}</summary>
          <button className="small-btn" onClick={onChargerCampagneTest}>{t('hub.campaigns.loadTest')}</button>
          <button className="danger-btn" onClick={onReinitialiser}>{t('hub.campaigns.reset')}</button>
        </details>
      </div>
    </div>
  );
}

export function HubCampagne({ campaignName, scene, scenes, templates, trackerTemplates, statusTemplates, sceneCounterTemplates, sceneStatusTemplates, ruleTemplates, rulePresetSnapshot, templateCategories, campaignEntries, fileSaveStatus, dark, performanceState, themeState, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onRenommerCampagne, onExporter, onImporter, onChargerCampagneTest, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onAjouterTemplateSuivi, onModifierTemplateSuivi, onDupliquerTemplateSuivi, onSupprimerTemplateSuivi, onAjouterTemplateEtat, onModifierTemplateEtat, onDupliquerTemplateEtat, onSupprimerTemplateEtat, onAjouterTemplateCompteurScene, onModifierTemplateCompteurScene, onDupliquerTemplateCompteurScene, onSupprimerTemplateCompteurScene, onAjouterTemplateEtatScene, onModifierTemplateEtatScene, onDupliquerTemplateEtatScene, onSupprimerTemplateEtatScene, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onDupliquerTemplateRegles, onSupprimerTemplateRegles, onImporterTemplates, onFermerEditeursTemplates, templatePersonnageId, templatePersonnageOuvert, onFermerEditionTemplatePersonnage, onDemanderChangementDepuisTemplatePersonnage, onTemplatePanelOpenChange, onPerformancePreferenceChange, onThemeModeChange }) {
  const [onglet, setOnglet] = useState(initialHubTab);
  const [moduleActif, setModuleActif] = useState('');
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
  const ouvrirOngletOptions = () => { setModuleActif(''); changerOnglet('campagnes'); };
  const ouvrirRandomSystem = () => setModuleActif('random-system');
  const fermerModule = () => setModuleActif('');

  return (
    <div className={`campaign-page shell ${moduleActif ? 'random-system-active' : ''}`}>
      <EnteteHub campaignName={campaignName} sombre={dark} themeState={themeState} onThemeModeChange={onThemeModeChange} />
      <main className="campaign-hub-page">
        {moduleActif === 'random-system' ? (
          <Suspense fallback={<ChargementOnglet texte={t('random.loading')} />}>
            <RandomSystemPage onBack={fermerModule} />
          </Suspense>
        ) : (
          <>
            <OngletsHub onglet={onglet} setOnglet={changerOnglet} />
            {onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}
            {onglet === 'regles' && <Suspense fallback={<ChargementOnglet texte={t('hub.loading.rules')} />}><OngletRegles scene={scene} rulePresetSnapshot={rulePresetSnapshot} onModifierRegles={onModifierReglesInitiative} ruleTemplates={ruleTemplates} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} /></Suspense>}
            {onglet === 'campagnes' && <OngletCampagnes campaignName={campaignName} campaignEntries={campaignEntries} fileSaveStatus={fileSaveStatus} performanceState={performanceState} themeState={themeState} onRenommerCampagne={onRenommerCampagne} onExporter={onExporter} onImporter={onImporter} onImporterTemplates={onImporterTemplates} onChargerCampagneTest={onChargerCampagneTest} onReinitialiser={onReinitialiser} onPerformancePreferenceChange={onPerformancePreferenceChange} onThemeModeChange={onThemeModeChange} onOuvrirRandomSystem={ouvrirRandomSystem} />}
            {onglet === 'templates' && <Suspense fallback={<ChargementOnglet texte={t('hub.loading.templates')} />}><OngletTemplates categories={templateCategories} templates={templates} trackerTemplates={trackerTemplates} statusTemplates={statusTemplates} sceneCounterTemplates={sceneCounterTemplates} sceneStatusTemplates={sceneStatusTemplates} surpriseImpact={scene?.surpriseImpact} surpriseAdvanceOn={scene?.surpriseAdvanceOn} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onAjouterTemplateSuivi={onAjouterTemplateSuivi} onModifierTemplateSuivi={onModifierTemplateSuivi} onDupliquerTemplateSuivi={onDupliquerTemplateSuivi} onSupprimerTemplateSuivi={onSupprimerTemplateSuivi} onAjouterTemplateEtat={onAjouterTemplateEtat} onModifierTemplateEtat={onModifierTemplateEtat} onDupliquerTemplateEtat={onDupliquerTemplateEtat} onSupprimerTemplateEtat={onSupprimerTemplateEtat} onAjouterTemplateCompteurScene={onAjouterTemplateCompteurScene} onModifierTemplateCompteurScene={onModifierTemplateCompteurScene} onDupliquerTemplateCompteurScene={onDupliquerTemplateCompteurScene} onSupprimerTemplateCompteurScene={onSupprimerTemplateCompteurScene} onAjouterTemplateEtatScene={onAjouterTemplateEtatScene} onModifierTemplateEtatScene={onModifierTemplateEtatScene} onDupliquerTemplateEtatScene={onDupliquerTemplateEtatScene} onSupprimerTemplateEtatScene={onSupprimerTemplateEtatScene} templatePersonnageId={templatePersonnageId} templatePersonnageOuvert={templatePersonnageOuvert} onFermerEditionTemplatePersonnage={onFermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={onDemanderChangementDepuisTemplatePersonnage} onTemplatePanelOpenChange={onTemplatePanelOpenChange} /></Suspense>}
          </>
        )}
      </main>
    </div>
  );
}
