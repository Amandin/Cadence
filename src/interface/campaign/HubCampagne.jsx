import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { t } from '../../i18n/index.js';

const OngletRegles = lazy(() => import('./OngletRegles.jsx').then((module) => ({ default: module.OngletRegles })));
const OngletTemplates = lazy(() => import('./OngletTemplates.jsx').then((module) => ({ default: module.OngletTemplates })));

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

function EnteteHub({ campaignName, sombre, onChangerTheme }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';
  return (
    <header className="campaign-hub-header panel">
      <div className="menu-brand campaign-brand-capsule">
        <img src={logo} alt="Cadence" />
        <div>
          <strong className="brand-title">Cadence</strong>
          <span className="muted brand-meta">{campaignName || t('hub.brandFallback')} · v{APP_VERSION}</span>
        </div>
        <button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label={t('hub.themeToggle')}>
          <span>☀</span><span>☾</span><i />
        </button>
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

function OngletCampagnes({ campaignEntries = [], activeCampaignEntryId, fileSaveStatus, onChoisirCampagne, onExporter, onImporter, onReinitialiser }) {
  const inputImportRef = useRef(null);
  const importEnCoursRef = useRef(false);

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

  return (
    <div className="stack hub-section panel campaign-files-panel">
      <div className="hub-section-head"><h3>{t('hub.campaigns.title')}</h3></div>
      <p className="muted compact-help">{t('hub.campaigns.help')}</p>
      {campaignEntries.length
        ? <label className="field">{t('hub.campaigns.active')}<select value={activeCampaignEntryId || ''} onChange={(event) => onChoisirCampagne(event.target.value)}>{campaignEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} - {entry.folderName}/{entry.fileName}</option>)}</select></label>
        : <p className="muted compact-help">{t('hub.campaigns.empty')}</p>}
      <div className={`campaign-save-status status-${fileSaveStatus?.mode || 'local'}`}>{fileSaveStatus?.message || t('hub.campaigns.status.local')}</div>
      <div className="grid2">
        <button className="primary" onClick={ouvrirImport}>{t('hub.campaigns.open')}</button>
        <button className="small-btn" onClick={onExporter}>{t('hub.campaigns.copy')}</button>
        <input ref={inputImportRef} className="import-file-input" type="file" aria-label={t('hub.campaigns.importAria')} accept=".cad,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} />
      </div>
      <details className="advanced-options">
        <summary>{t('hub.campaigns.advanced')}</summary>
        <button className="danger-btn" onClick={onReinitialiser}>{t('hub.campaigns.reset')}</button>
      </details>
    </div>
  );
}

export function HubCampagne({ campaignName, scene, scenes, templates, trackerTemplates, statusTemplates, sceneCounterTemplates, sceneStatusTemplates, ruleTemplates, rulePresetSnapshot, templateCategories, campaignEntries, activeCampaignEntryId, fileSaveStatus, dark, onChangerTheme, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onChoisirCampagne, onExporter, onImporter, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onAjouterTemplateSuivi, onModifierTemplateSuivi, onDupliquerTemplateSuivi, onSupprimerTemplateSuivi, onAjouterTemplateEtat, onModifierTemplateEtat, onDupliquerTemplateEtat, onSupprimerTemplateEtat, onAjouterTemplateCompteurScene, onModifierTemplateCompteurScene, onDupliquerTemplateCompteurScene, onSupprimerTemplateCompteurScene, onAjouterTemplateEtatScene, onModifierTemplateEtatScene, onDupliquerTemplateEtatScene, onSupprimerTemplateEtatScene, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onDupliquerTemplateRegles, onSupprimerTemplateRegles, onImporterTemplates, onFermerEditeursTemplates, templatePersonnageId, templatePersonnageOuvert, onFermerEditionTemplatePersonnage, onDemanderChangementDepuisTemplatePersonnage, onTemplatePanelOpenChange }) {
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
      <EnteteHub campaignName={campaignName} sombre={dark} onChangerTheme={onChangerTheme} />
      <main className="campaign-hub-page">
        <OngletsHub onglet={onglet} setOnglet={changerOnglet} />
        {onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}
        {onglet === 'regles' && <Suspense fallback={<ChargementOnglet texte={t('hub.loading.rules')} />}><OngletRegles scene={scene} rulePresetSnapshot={rulePresetSnapshot} onModifierRegles={onModifierReglesInitiative} ruleTemplates={ruleTemplates} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} /></Suspense>}
        {onglet === 'campagnes' && <OngletCampagnes campaignEntries={campaignEntries} activeCampaignEntryId={activeCampaignEntryId} fileSaveStatus={fileSaveStatus} onChoisirCampagne={onChoisirCampagne} onExporter={onExporter} onImporter={onImporter} onReinitialiser={onReinitialiser} />}
        {onglet === 'templates' && <Suspense fallback={<ChargementOnglet texte={t('hub.loading.templates')} />}><OngletTemplates categories={templateCategories} templates={templates} trackerTemplates={trackerTemplates} statusTemplates={statusTemplates} sceneCounterTemplates={sceneCounterTemplates} sceneStatusTemplates={sceneStatusTemplates} surpriseImpact={scene?.surpriseImpact} surpriseAdvanceOn={scene?.surpriseAdvanceOn} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onAjouterTemplateSuivi={onAjouterTemplateSuivi} onModifierTemplateSuivi={onModifierTemplateSuivi} onDupliquerTemplateSuivi={onDupliquerTemplateSuivi} onSupprimerTemplateSuivi={onSupprimerTemplateSuivi} onAjouterTemplateEtat={onAjouterTemplateEtat} onModifierTemplateEtat={onModifierTemplateEtat} onDupliquerTemplateEtat={onDupliquerTemplateEtat} onSupprimerTemplateEtat={onSupprimerTemplateEtat} onAjouterTemplateCompteurScene={onAjouterTemplateCompteurScene} onModifierTemplateCompteurScene={onModifierTemplateCompteurScene} onDupliquerTemplateCompteurScene={onDupliquerTemplateCompteurScene} onSupprimerTemplateCompteurScene={onSupprimerTemplateCompteurScene} onAjouterTemplateEtatScene={onAjouterTemplateEtatScene} onModifierTemplateEtatScene={onModifierTemplateEtatScene} onDupliquerTemplateEtatScene={onDupliquerTemplateEtatScene} onSupprimerTemplateEtatScene={onSupprimerTemplateEtatScene} onImporterTemplates={onImporterTemplates} templatePersonnageId={templatePersonnageId} templatePersonnageOuvert={templatePersonnageOuvert} onFermerEditionTemplatePersonnage={onFermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={onDemanderChangementDepuisTemplatePersonnage} onTemplatePanelOpenChange={onTemplatePanelOpenChange} /></Suspense>}
      </main>
    </div>
  );
}
