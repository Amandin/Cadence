import { useEffect, useRef, useState } from 'react';
import { FenetreEditionTemplateCompteurScene, FenetreEditionTemplateEtat, FenetreEditionTemplateEtatScene, FenetreEditionTemplateSuivi } from './TemplateEditors.jsx';
import { OngletTemplatesPersonnages } from './TemplatePersonnageList.jsx';
import { OngletTemplatesEtats, OngletTemplatesScene, OngletTemplatesSuivis } from './TemplateSections.jsx';

export function OngletTemplates({
  categories = [],
  templates = [],
  trackerTemplates = [],
  statusTemplates = [],
  sceneCounterTemplates = [],
  sceneStatusTemplates = [],
  surpriseImpact = 'limited',
  surpriseAdvanceOn = 'activation',
  onAjouterTemplateCategorie,
  onAjouterCategorie,
  onRenommerCategorie,
  onSupprimerCategorie,
  onDeplacerCategorie,
  onEditerTemplate,
  onDupliquerTemplate,
  onSupprimerTemplate,
  onImporterTemplates,
  onAjouterTemplateSuivi,
  onModifierTemplateSuivi,
  onDupliquerTemplateSuivi,
  onSupprimerTemplateSuivi,
  onAjouterTemplateEtat,
  onModifierTemplateEtat,
  onDupliquerTemplateEtat,
  onSupprimerTemplateEtat,
  onAjouterTemplateCompteurScene,
  onModifierTemplateCompteurScene,
  onDupliquerTemplateCompteurScene,
  onSupprimerTemplateCompteurScene,
  onAjouterTemplateEtatScene,
  onModifierTemplateEtatScene,
  onDupliquerTemplateEtatScene,
  onSupprimerTemplateEtatScene,
  templatePersonnageId = '',
  templatePersonnageOuvert = false,
  onFermerEditionTemplatePersonnage,
  onDemanderChangementDepuisTemplatePersonnage,
  onTemplatePanelOpenChange,
}) {
  const [sousPage, setSousPage] = useState('personnages');
  const [suiviEditeId, setSuiviEditeId] = useState('');
  const [etatEditeId, setEtatEditeId] = useState('');
  const [compteurSceneEditeId, setCompteurSceneEditeId] = useState('');
  const [etatSceneEditeId, setEtatSceneEditeId] = useState('');
  const [changementDemande, setChangementDemande] = useState(null);
  const importInputRef = useRef(null);
  const suiviEdite = trackerTemplates.find((template) => template.id === suiviEditeId) || null;
  const etatEdite = statusTemplates.find((template) => template.id === etatEditeId) || null;
  const compteurSceneEdite = sceneCounterTemplates.find((template) => template.id === compteurSceneEditeId) || null;
  const etatSceneEdite = sceneStatusTemplates.find((template) => template.id === etatSceneEditeId) || null;
  const editeurLocalOuvert = !!(suiviEdite || etatEdite || compteurSceneEdite || etatSceneEdite);
  const statusTemplatesAffiches = statusTemplates.map((template) => template.id !== 'status-template-surpris' ? template : {
    ...template,
    status: { ...template.status, inactive: surpriseImpact === 'inactive', limited: surpriseImpact !== 'inactive', advanceOn: surpriseAdvanceOn === 'round' ? 'round' : 'activation' },
  });
  useEffect(() => {
    if (editeurLocalOuvert) onTemplatePanelOpenChange?.(true);
  }, [editeurLocalOuvert, onTemplatePanelOpenChange]);
  useEffect(() => {
    return () => onTemplatePanelOpenChange?.(false);
  }, [onTemplatePanelOpenChange]);
  const choisirFichier = () => importInputRef.current?.click();
  const importerFichier = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImporterTemplates(file);
  };
  const fermerEditeursLocaux = () => {
    setSuiviEditeId('');
    setEtatEditeId('');
    setCompteurSceneEditeId('');
    setEtatSceneEditeId('');
  };
  const changerSousPage = (prochaine) => {
    if (prochaine === sousPage) return;
    setSousPage(prochaine);
  };
  const demandeDejaOuverte = (demande) => {
    if (!demande) return false;
    if (demande.type === 'personnage') return templatePersonnageId === demande.id;
    if (demande.type === 'suivi') return suiviEditeId === demande.id;
    if (demande.type === 'etat') return etatEditeId === demande.id;
    if (demande.type === 'compteurScene') return compteurSceneEditeId === demande.id;
    if (demande.type === 'etatScene') return etatSceneEditeId === demande.id;
    return false;
  };
  const ouvrirDemande = (demande) => {
    if (!demande) return;
    setChangementDemande(null);
    onTemplatePanelOpenChange?.(true);
    fermerEditeursLocaux();
    onFermerEditionTemplatePersonnage?.();
    if (demande.type === 'personnage') onEditerTemplate(demande.id);
    if (demande.type === 'nouveauPersonnage') onAjouterTemplateCategorie(demande.categorie);
    if (demande.type === 'dupliquerPersonnage') onDupliquerTemplate(demande.id);
    if (demande.type === 'suivi') setSuiviEditeId(demande.id);
    if (demande.type === 'nouveauSuivi') {
      const template = onAjouterTemplateSuivi();
      if (template?.id) setSuiviEditeId(template.id);
    }
    if (demande.type === 'etat') setEtatEditeId(demande.id);
    if (demande.type === 'nouveauEtat') {
      const template = onAjouterTemplateEtat();
      if (template?.id) setEtatEditeId(template.id);
    }
    if (demande.type === 'compteurScene') setCompteurSceneEditeId(demande.id);
    if (demande.type === 'nouveauCompteurScene') {
      const template = onAjouterTemplateCompteurScene();
      if (template?.id) setCompteurSceneEditeId(template.id);
    }
    if (demande.type === 'etatScene') setEtatSceneEditeId(demande.id);
    if (demande.type === 'nouveauEtatScene') {
      const template = onAjouterTemplateEtatScene();
      if (template?.id) setEtatSceneEditeId(template.id);
    }
  };
  const demanderOuOuvrir = (demande) => {
    if (demandeDejaOuverte(demande)) return;
    if (templatePersonnageOuvert) {
      onDemanderChangementDepuisTemplatePersonnage?.({ execute: () => ouvrirDemande(demande) });
      return;
    }
    if (editeurLocalOuvert) {
      setChangementDemande(demande);
      return;
    }
    ouvrirDemande(demande);
  };
  const validerEtOuvrir = () => {
    const demande = changementDemande;
    ouvrirDemande(demande);
  };
  const abandonnerEtOuvrir = () => ouvrirDemande(changementDemande);
  const annulerChangement = () => setChangementDemande(null);
  const fermerSuivi = () => { setSuiviEditeId(''); setChangementDemande(null); };
  const fermerEtat = () => { setEtatEditeId(''); setChangementDemande(null); };
  const fermerCompteurScene = () => { setCompteurSceneEditeId(''); setChangementDemande(null); };
  const fermerEtatScene = () => { setEtatSceneEditeId(''); setChangementDemande(null); };
  const ouvrirTemplatePersonnage = (id) => demanderOuOuvrir({ type: 'personnage', id });
  const ajouterTemplateCategorie = (categorie) => demanderOuOuvrir({ type: 'nouveauPersonnage', categorie });
  const dupliquerTemplatePersonnage = (id) => demanderOuOuvrir({ type: 'dupliquerPersonnage', id });
  const ajouterSuivi = () => demanderOuOuvrir({ type: 'nouveauSuivi' });
  const ouvrirSuivi = (id) => demanderOuOuvrir({ type: 'suivi', id });
  const ajouterEtat = () => demanderOuOuvrir({ type: 'nouveauEtat' });
  const ouvrirEtat = (id) => demanderOuOuvrir({ type: 'etat', id });
  const ajouterCompteurScene = () => demanderOuOuvrir({ type: 'nouveauCompteurScene' });
  const ouvrirCompteurScene = (id) => demanderOuOuvrir({ type: 'compteurScene', id });
  const ajouterEtatScene = () => demanderOuOuvrir({ type: 'nouveauEtatScene' });
  const ouvrirEtatScene = (id) => demanderOuOuvrir({ type: 'etatScene', id });
  const validerSuivi = (id, tracker, nom) => { onModifierTemplateSuivi(id, tracker, nom); setSuiviEditeId(''); setChangementDemande(null); };
  const validerEtat = (id, status, nom) => { onModifierTemplateEtat(id, status, nom); setEtatEditeId(''); setChangementDemande(null); };
  const validerCompteurScene = (id, compteur, nom) => { onModifierTemplateCompteurScene(id, compteur, nom); setCompteurSceneEditeId(''); setChangementDemande(null); };
  const validerEtatScene = (id, status, nom) => { onModifierTemplateEtatScene(id, status, nom); setEtatSceneEditeId(''); setChangementDemande(null); };

  return (
    <div className="stack hub-section panel">
      <div className="hub-section-head">
        <h3>Templates</h3>
        <button className="small-btn" onClick={choisirFichier}>Importer depuis une autre campagne</button>
        <input ref={importInputRef} type="file" accept=".cad,application/json" style={{ display: 'none' }} onChange={importerFichier} />
      </div>
      <div className="template-subtabs">
        <button className={`choice ${sousPage === 'personnages' ? 'selected' : ''}`} onClick={() => changerSousPage('personnages')}>Personnages</button>
        <button className={`choice ${sousPage === 'suivis' ? 'selected' : ''}`} onClick={() => changerSousPage('suivis')}>Suivis</button>
        <button className={`choice ${sousPage === 'etats' ? 'selected' : ''}`} onClick={() => changerSousPage('etats')}>Etats</button>
        <button className={`choice ${sousPage === 'scene' ? 'selected' : ''}`} onClick={() => changerSousPage('scene')}>Scene</button>
      </div>
      {sousPage === 'personnages' && (
        <OngletTemplatesPersonnages
          categories={categories}
          templates={templates}
          onAjouterTemplateCategorie={ajouterTemplateCategorie}
          onAjouterCategorie={onAjouterCategorie}
          onRenommerCategorie={onRenommerCategorie}
          onSupprimerCategorie={onSupprimerCategorie}
          onDeplacerCategorie={onDeplacerCategorie}
          onEditerTemplate={ouvrirTemplatePersonnage}
          onDupliquerTemplate={dupliquerTemplatePersonnage}
          onSupprimerTemplate={onSupprimerTemplate}
        />
      )}
      {sousPage === 'suivis' && (
        <OngletTemplatesSuivis
          templates={trackerTemplates}
          onAjouter={ajouterSuivi}
          onEditer={ouvrirSuivi}
          onDupliquer={onDupliquerTemplateSuivi}
          onSupprimer={onSupprimerTemplateSuivi}
        />
      )}
      {sousPage === 'etats' && (
        <OngletTemplatesEtats
          templates={statusTemplatesAffiches}
          onAjouter={ajouterEtat}
          onEditer={ouvrirEtat}
          onDupliquer={onDupliquerTemplateEtat}
          onSupprimer={onSupprimerTemplateEtat}
        />
      )}
      {sousPage === 'scene' && (
        <OngletTemplatesScene
          counterTemplates={sceneCounterTemplates}
          statusTemplates={sceneStatusTemplates}
          onAjouterCompteur={ajouterCompteurScene}
          onEditerCompteur={ouvrirCompteurScene}
          onDupliquerCompteur={onDupliquerTemplateCompteurScene}
          onSupprimerCompteur={onSupprimerTemplateCompteurScene}
          onAjouterEtat={ajouterEtatScene}
          onEditerEtat={ouvrirEtatScene}
          onDupliquerEtat={onDupliquerTemplateEtatScene}
          onSupprimerEtat={onSupprimerTemplateEtatScene}
        />
      )}
      {suiviEdite && (
        <FenetreEditionTemplateSuivi
          template={suiviEdite}
          switchRequest={changementDemande}
          onAnnulerChangement={annulerChangement}
          onValiderChangement={validerEtOuvrir}
          onAbandonnerChangement={abandonnerEtOuvrir}
          onFermer={fermerSuivi}
          onValider={validerSuivi}
        />
      )}
      {etatEdite && (
        <FenetreEditionTemplateEtat
          template={etatEdite}
          switchRequest={changementDemande}
          onAnnulerChangement={annulerChangement}
          onValiderChangement={validerEtOuvrir}
          onAbandonnerChangement={abandonnerEtOuvrir}
          onFermer={fermerEtat}
          onValider={validerEtat}
        />
      )}
      {compteurSceneEdite && (
        <FenetreEditionTemplateCompteurScene
          template={compteurSceneEdite}
          switchRequest={changementDemande}
          onAnnulerChangement={annulerChangement}
          onValiderChangement={validerEtOuvrir}
          onAbandonnerChangement={abandonnerEtOuvrir}
          onFermer={fermerCompteurScene}
          onValider={validerCompteurScene}
        />
      )}
      {etatSceneEdite && (
        <FenetreEditionTemplateEtatScene
          template={etatSceneEdite}
          switchRequest={changementDemande}
          onAnnulerChangement={annulerChangement}
          onValiderChangement={validerEtOuvrir}
          onAbandonnerChangement={abandonnerEtOuvrir}
          onFermer={fermerEtatScene}
          onValider={validerEtatScene}
        />
      )}
    </div>
  );
}
