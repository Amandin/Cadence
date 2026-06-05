import { useEffect, useRef, useState } from 'react';
import { APP_VERSION } from '../../constants.js';
import { OngletRegles } from './OngletRegles.jsx';
import { OngletTemplates } from './OngletTemplates.jsx';

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
  return <div className="grid4 hub-tabs"><button className={`choice ${onglet === 'scenes' ? 'selected' : ''}`} onClick={() => setOnglet('scenes')}>Scènes</button><button className={`choice ${onglet === 'regles' ? 'selected' : ''}`} onClick={() => setOnglet('regles')}>Règles</button><button className={`choice ${onglet === 'campagnes' ? 'selected' : ''}`} onClick={() => setOnglet('campagnes')}>Campagnes</button><button className={`choice ${onglet === 'templates' ? 'selected' : ''}`} onClick={() => setOnglet('templates')}>Templates</button></div>;
}

function EnteteHub({ campaignName, sombre, onChangerTheme }) {
  const logo = sombre ? '/branding/logo-cadence-dark.svg' : '/branding/logo-cadence-light.svg';
  return <header className="campaign-hub-header panel"><div className="menu-brand campaign-brand-capsule"><img src={logo} alt="Cadence" /><div><strong>{campaignName || 'Campagne Cadence'}</strong><span className="muted">Cadence - v{APP_VERSION}</span></div><button className={`theme-toggle ${sombre ? 'dark-on' : 'light-on'}`} onClick={() => onChangerTheme(!sombre)} aria-label="Basculer thème clair ou sombre"><span>☀</span><span>☾</span><i /></button></div></header>;
}

function CarteScene({ scene, index, canDelete, editing, onEditer, onFermerEdition, onChoisirScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  const [titre, setTitre] = useState(scene.title || 'Scène');
  const [type, setType] = useState(scene.type || 'Scène');
  const [notes, setNotes] = useState(scene.notes || '');
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  useEffect(() => { if (!editing) return; setTitre(scene.title || 'Scène'); setType(scene.type || 'Scène'); setNotes(scene.notes || ''); }, [editing, scene.notes, scene.title, scene.type]);
  const enregistrer = () => { onModifierScene(index, { title: titre.trim() || 'Scène', type: type.trim() || 'Scène', notes }); onFermerEdition(); };
  return <div className="hub-scene-card">{editing ? <div className="stack hub-scene-edit"><label className="field">Nom<input type="text" value={titre} onChange={(event) => setTitre(event.target.value)} /></label><label className="field">Type<input type="text" value={type} onChange={(event) => setType(event.target.value)} /></label><label className="field">Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} /></label><div className="grid2"><button className="primary" onClick={enregistrer}>Enregistrer</button><button className="small-btn" onClick={onFermerEdition}>Annuler</button></div></div> : <><div className="hub-scene-summary"><strong className="hub-scene-title">{scene.title || 'Scène'}</strong><span className="hub-scene-type">{scene.type || 'Scène'}</span>{canDelete && <div className={`hub-scene-delete-actions ${suppressionVisible ? 'confirming' : ''}`}>{suppressionVisible && <button className="small-btn scene-delete-cancel" onClick={() => setSuppressionVisible(false)}>Annuler</button>}{suppressionVisible ? <button className="danger-btn mini-danger scene-delete-confirm" onClick={() => onSupprimerScene(index)}>Suppr.</button> : <button className="small-btn scene-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${scene.title || 'Scène'}`}>x</button>}</div>}</div>{scene.notes && <p className="muted compact-help hub-scene-notes">{scene.notes}</p>}<div className="hub-scene-actions explicit"><button className="primary" onClick={() => onChoisirScene(index)}>Ouvrir</button><button className="small-btn" onClick={() => onEditer(scene.id)}>Modifier</button><button className="small-btn" onClick={() => onDupliquerScene(index)}>Dupliquer</button></div></>}</div>;
}

function OngletScenes({ scenes, editingSceneId, onEditerScene, onFermerEditionScene, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene }) {
  return <div className="stack hub-section panel"><div className="hub-section-head"><h3>Scènes</h3><button className="small-btn" onClick={onNouvelleScene}>Nouvelle scène</button></div><div className="stack hub-scene-list">{scenes.map((scene, index) => <CarteScene key={scene.id} scene={scene} index={index} editing={scene.id === editingSceneId} canDelete={scenes.length > 1} onEditer={onEditerScene} onFermerEdition={onFermerEditionScene} onChoisirScene={onChoisirScene} onModifierScene={onModifierScene} onDupliquerScene={onDupliquerScene} onSupprimerScene={onSupprimerScene} />)}</div></div>;
}

function OngletCampagnes({ campaignEntries = [], activeCampaignEntryId, fileSaveStatus, onChoisirCampagne, onExporter, onImporter, onReinitialiser }) {
  const inputImportRef = useRef(null);
  const importEnCoursRef = useRef(false);
  const ouvrirImport = async () => {
    if (importEnCoursRef.current) return;
    importEnCoursRef.current = true;
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({ multiple: false, types: [{ description: 'Campagne Cadence', accept: { 'application/json': ['.cad'] } }] });
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
  const importerFichier = async (event) => { const file = event.target.files?.[0]; event.target.value = ''; if (file) await onImporter(file); };
  return <div className="stack hub-section panel campaign-files-panel"><div className="hub-section-head"><h3>Campagnes</h3></div><p className="muted compact-help">Chaque campagne correspond à un fichier .cad. Ouvre un fichier existant ou enregistre une copie de la campagne active.</p><label className="field">Campagne active<select value={activeCampaignEntryId || ''} onChange={(event) => onChoisirCampagne(event.target.value)}>{campaignEntries.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} - {entry.folderName}/{entry.fileName}</option>)}</select></label><div className={`campaign-save-status status-${fileSaveStatus?.mode || 'local'}`}>{fileSaveStatus?.message || 'Sauvegarde locale active.'}</div><div className="grid2"><button className="primary" onClick={ouvrirImport}>Ouvrir un .cad</button><button className="small-btn" onClick={onExporter}>Enregistrer une copie</button><input ref={inputImportRef} className="import-file-input" type="file" aria-label="Importer une campagne" accept=".cad,application/json,text/json,text/plain,application/octet-stream,*/*" onChange={importerFichier} /></div><button className="danger-btn" onClick={onReinitialiser}>Recharger les campagnes de démo</button></div>;
}

export function HubCampagne({ campaignName, scene, scenes, templates, trackerTemplates, statusTemplates, sceneCounterTemplates, sceneStatusTemplates, ruleTemplates, templateCategories, campaignEntries, activeCampaignEntryId, fileSaveStatus, dark, onChangerTheme, onChoisirScene, onNouvelleScene, onModifierScene, onDupliquerScene, onSupprimerScene, onModifierReglesInitiative, onChoisirCampagne, onExporter, onImporter, onReinitialiser, onAjouterTemplateCategorie, onAjouterCategorieTemplate, onRenommerCategorieTemplate, onSupprimerCategorieTemplate, onDeplacerCategorieTemplate, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onAjouterTemplateSuivi, onModifierTemplateSuivi, onDupliquerTemplateSuivi, onSupprimerTemplateSuivi, onAjouterTemplateEtat, onModifierTemplateEtat, onDupliquerTemplateEtat, onSupprimerTemplateEtat, onAjouterTemplateCompteurScene, onModifierTemplateCompteurScene, onDupliquerTemplateCompteurScene, onSupprimerTemplateCompteurScene, onAjouterTemplateEtatScene, onModifierTemplateEtatScene, onDupliquerTemplateEtatScene, onSupprimerTemplateEtatScene, onAppliquerTemplateRegles, onEnregistrerTemplateRegles, onDupliquerTemplateRegles, onSupprimerTemplateRegles, onImporterTemplates, onFermerEditeursTemplates, templatePersonnageId, templatePersonnageOuvert, onFermerEditionTemplatePersonnage, onDemanderChangementDepuisTemplatePersonnage, onTemplatePanelOpenChange }) {
  const [onglet, setOnglet] = useState(initialHubTab);
  const [editingSceneId, setEditingSceneId] = useState('');
  const [editCreatedSceneWhenReady, setEditCreatedSceneWhenReady] = useState(false);
  useEffect(() => { if (!editCreatedSceneWhenReady || !scene?.id) return; setOnglet('scenes'); setEditingSceneId(scene.id); setEditCreatedSceneWhenReady(false); }, [editCreatedSceneWhenReady, scene?.id]);
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
  return <div className="campaign-page shell"><EnteteHub campaignName={campaignName} sombre={dark} onChangerTheme={onChangerTheme} /><main className="campaign-hub-page"><OngletsHub onglet={onglet} setOnglet={changerOnglet} />{onglet === 'scenes' && <OngletScenes scenes={scenes} editingSceneId={editingSceneId} onEditerScene={setEditingSceneId} onFermerEditionScene={() => setEditingSceneId('')} onChoisirScene={onChoisirScene} onNouvelleScene={creerNouvelleScene} onModifierScene={onModifierScene} onDupliquerScene={dupliquerScene} onSupprimerScene={onSupprimerScene} />}{onglet === 'regles' && <OngletRegles scene={scene} onModifierRegles={onModifierReglesInitiative} ruleTemplates={ruleTemplates} onAppliquerTemplateRegles={onAppliquerTemplateRegles} onEnregistrerTemplateRegles={onEnregistrerTemplateRegles} onDupliquerTemplateRegles={onDupliquerTemplateRegles} onSupprimerTemplateRegles={onSupprimerTemplateRegles} />}{onglet === 'campagnes' && <OngletCampagnes campaignEntries={campaignEntries} activeCampaignEntryId={activeCampaignEntryId} fileSaveStatus={fileSaveStatus} onChoisirCampagne={onChoisirCampagne} onExporter={onExporter} onImporter={onImporter} onReinitialiser={onReinitialiser} />}{onglet === 'templates' && <OngletTemplates categories={templateCategories} templates={templates} trackerTemplates={trackerTemplates} statusTemplates={statusTemplates} sceneCounterTemplates={sceneCounterTemplates} sceneStatusTemplates={sceneStatusTemplates} surpriseImpact={scene?.surpriseImpact} surpriseAdvanceOn={scene?.surpriseAdvanceOn} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onAjouterCategorie={onAjouterCategorieTemplate} onRenommerCategorie={onRenommerCategorieTemplate} onSupprimerCategorie={onSupprimerCategorieTemplate} onDeplacerCategorie={onDeplacerCategorieTemplate} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} onAjouterTemplateSuivi={onAjouterTemplateSuivi} onModifierTemplateSuivi={onModifierTemplateSuivi} onDupliquerTemplateSuivi={onDupliquerTemplateSuivi} onSupprimerTemplateSuivi={onSupprimerTemplateSuivi} onAjouterTemplateEtat={onAjouterTemplateEtat} onModifierTemplateEtat={onModifierTemplateEtat} onDupliquerTemplateEtat={onDupliquerTemplateEtat} onSupprimerTemplateEtat={onSupprimerTemplateEtat} onAjouterTemplateCompteurScene={onAjouterTemplateCompteurScene} onModifierTemplateCompteurScene={onModifierTemplateCompteurScene} onDupliquerTemplateCompteurScene={onDupliquerTemplateCompteurScene} onSupprimerTemplateCompteurScene={onSupprimerTemplateCompteurScene} onAjouterTemplateEtatScene={onAjouterTemplateEtatScene} onModifierTemplateEtatScene={onModifierTemplateEtatScene} onDupliquerTemplateEtatScene={onDupliquerTemplateEtatScene} onSupprimerTemplateEtatScene={onSupprimerTemplateEtatScene} onImporterTemplates={onImporterTemplates} templatePersonnageId={templatePersonnageId} templatePersonnageOuvert={templatePersonnageOuvert} onFermerEditionTemplatePersonnage={onFermerEditionTemplatePersonnage} onDemanderChangementDepuisTemplatePersonnage={onDemanderChangementDepuisTemplatePersonnage} onTemplatePanelOpenChange={onTemplatePanelOpenChange} />}</main></div>;
}
