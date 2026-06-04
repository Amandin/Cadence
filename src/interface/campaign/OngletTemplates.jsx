import { useEffect, useMemo, useRef, useState } from 'react';
import { trackerTypeLabels } from '../../constants.js';
import { normalizeGlobalTracker } from '../../domain/globalTracker.js';
import { clone, newTracker } from '../../logic.js';
import { Fenetre, MessageChangementTemplate } from '../commun/ComposantsCommuns.jsx';
import { SelecteurImpactEtat } from '../commun/SelecteurImpactEtat.jsx';
import { EditeurSuivi } from '../fiches/FenetreEditionFiche.jsx';
import { EditeurSeuilsCompteurScene } from '../suivis/CompteurGlobal.jsx';

function BoutonIconeTemplate({ label, children, className = '', ...props }) {
  return (
    <button className={`small-btn template-icon-btn ${className}`.trim()} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}

function grouperTemplates(templates = [], categories = []) {
  const groupes = categories.map((categorie) => ({ categorie, templates: [] }));
  const trouverOuCreerGroupe = (categorie) => {
    const nom = categorie || 'Sans categorie';
    const existant = groupes.find((item) => item.categorie === nom);
    if (existant) return existant;
    const nouveau = { categorie: nom, templates: [] };
    groupes.push(nouveau);
    return nouveau;
  };
  [...templates]
    .sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`, 'fr'))
    .forEach((template) => trouverOuCreerGroupe(template.category).templates.push(template));
  return groupes;
}

function NouvelleCategorieTemplate({ onAjouterCategorie }) {
  const [nom, setNom] = useState('');
  const ajouter = () => {
    const result = onAjouterCategorie(nom);
    if (result?.ok) setNom('');
  };

  return (
    <div className="template-new-category">
      <input value={nom} placeholder="Nouvelle categorie" onChange={(event) => setNom(event.target.value)} />
      <button className="small-btn" onClick={ajouter}>Ajouter</button>
    </div>
  );
}

function EnteteCategorieTemplate({ groupe, index, total, onAjouterTemplateCategorie, onRenommerCategorie, onSupprimerCategorie, onDeplacerCategorie }) {
  const [renommage, setRenommage] = useState(false);
  const [nom, setNom] = useState(groupe.categorie);

  useEffect(() => {
    if (renommage) setNom(groupe.categorie);
  }, [groupe.categorie, renommage]);

  const enregistrer = () => {
    const result = onRenommerCategorie(groupe.categorie, nom);
    if (result?.ok) setRenommage(false);
  };

  if (renommage) {
    return (
      <div className="template-category-edit">
        <input value={nom} onChange={(event) => setNom(event.target.value)} />
        <button className="primary" onClick={enregistrer}>OK</button>
        <button className="small-btn" onClick={() => setRenommage(false)}>Annuler</button>
      </div>
    );
  }

  return (
    <div className="flexible-section-title template-category-title">
      <strong>{groupe.templates.length}</strong>
      <span className="template-category-label">{groupe.categorie}</span>
      <div className="compact-arrows template-category-actions">
        <BoutonIconeTemplate label="Ajouter un template" onClick={() => onAjouterTemplateCategorie(groupe.categorie)}>+</BoutonIconeTemplate>
        <BoutonIconeTemplate label="Renommer la categorie" onClick={() => setRenommage(true)}>✎</BoutonIconeTemplate>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, -1)} disabled={index <= 0}>↑</button>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, 1)} disabled={index >= total - 1}>↓</button>
        {groupe.templates.length === 0 && <button className="danger-btn mini-danger" onClick={() => onSupprimerCategorie(groupe.categorie)}>Suppr.</button>}
      </div>
    </div>
  );
}

function LigneTemplate({ template, categories, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate }) {
  const [categorieOuverte, setCategorieOuverte] = useState(false);
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  const changerCategorie = (event) => {
    onChangerCategorieTemplate(template.id, event.target.value);
    setCategorieOuverte(false);
  };

  return (
    <div className="restore-row hub-row template-row">
      <span className="template-row-main"><strong>{template.name}</strong><small>{template.participant?.kind || 'Personnage'}</small></span>
      <div className="compact-arrows template-row-actions">
        {categorieOuverte ? (
          <select className="template-category-select" value={template.category} onChange={changerCategorie} onBlur={() => setCategorieOuverte(false)} aria-label="Categorie du template">
            {categories.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
          </select>
        ) : (
          <button className="small-btn discreet-template-category" onClick={() => setCategorieOuverte(true)} title={`Categorie : ${template.category}`}>Cat.</button>
        )}
        <BoutonIconeTemplate label={`Modifier ${template.name}`} onClick={() => onEditerTemplate(template.id)}>✎</BoutonIconeTemplate>
        <BoutonIconeTemplate label={`Dupliquer ${template.name}`} onClick={() => onDupliquerTemplate(template.id)}>⧉</BoutonIconeTemplate>
        {suppressionVisible ? (
          <button className="danger-btn mini-danger template-delete-confirm" onClick={() => onSupprimerTemplate(template.id)}>Suppr.</button>
        ) : (
          <button className="small-btn template-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${template.name}`}>x</button>
        )}
      </div>
    </div>
  );
}

function LigneTemplateSimple({ template, detail, onEditer, onDupliquer, onSupprimer }) {
  const [suppressionVisible, setSuppressionVisible] = useState(false);
  return (
    <div className="restore-row hub-row template-row">
      <span className="template-row-main"><strong>{template.name}</strong><small>{detail}</small></span>
      <div className="compact-arrows template-row-actions">
        <BoutonIconeTemplate label={`Modifier ${template.name}`} onClick={() => onEditer(template.id)}>✎</BoutonIconeTemplate>
        <BoutonIconeTemplate label={`Dupliquer ${template.name}`} onClick={() => onDupliquer(template.id)}>⧉</BoutonIconeTemplate>
        {suppressionVisible ? (
          <button className="danger-btn mini-danger template-delete-confirm" onClick={() => onSupprimer(template.id)}>Suppr.</button>
        ) : (
          <button className="small-btn template-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${template.name}`}>x</button>
        )}
      </div>
    </div>
  );
}

function OngletTemplatesPersonnages({ categories, templates, onAjouterTemplateCategorie, onAjouterCategorie, onRenommerCategorie, onSupprimerCategorie, onDeplacerCategorie, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate }) {
  const groupes = useMemo(() => grouperTemplates(templates, categories), [categories, templates]);
  return (
    <div className="stack">
      <p className="muted compact-help">Les templates de personnages servent de fiches modeles, avec leurs infos rapides et leurs suivis.</p>
      <NouvelleCategorieTemplate onAjouterCategorie={onAjouterCategorie} />
      {groupes.map((groupe, index) => (
        <section className="hub-template-group" key={groupe.categorie}>
          <EnteteCategorieTemplate groupe={groupe} index={index} total={groupes.length} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onRenommerCategorie={onRenommerCategorie} onSupprimerCategorie={onSupprimerCategorie} onDeplacerCategorie={onDeplacerCategorie} />
          {groupe.templates.length === 0 ? (
            <div className="empty-section panel">Aucun template dans cette categorie.</div>
          ) : (
            <div className="stack">
              {groupe.templates.map((template) => (
                <LigneTemplate key={template.id} template={template} categories={categories} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}

function FenetreEditionTemplateSuivi({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nom, setNom] = useState(template?.name || 'Suivi');
  const [brouillon, setBrouillon] = useState(() => clone(template?.tracker || newTracker('bar')));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nom || 'Suivi' }, nom || brouillon.name || 'Suivi');

  return (
    <Fenetre title="Template de suivi" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <EditeurSuivi suivi={brouillon} onChange={setBrouillon} onDelete={onFermer} />
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

function OngletTemplatesSuivis({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces suivis pourront etre ajoutes depuis l'edition d'une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ suivi</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun template de suivi.</div> : templates.map((template) => (
        <LigneTemplateSimple key={template.id} template={template} detail={trackerTypeLabels[template.tracker?.type] || 'Suivi'} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />
      ))}
    </div>
  );
}

function FenetreEditionTemplateEtat({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'Etat');
  const [nom, setNom] = useState(status.name || 'Etat');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const [impact, setImpact] = useState(status.inactive ? 'inactive' : status.limited ? 'limited' : 'normal');
  const [advanceOn, setAdvanceOn] = useState(status.advanceOn === 'round' ? 'round' : 'activation');
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, { id: 'template-status', name: nom || nomTemplate || 'Etat', duration: dureeNettoyee, remaining: dureeNettoyee, loop: dureeNettoyee !== null && boucle, inactive: impact === 'inactive', limited: impact === 'limited', advanceOn, expired: false }, nomTemplate || nom || 'Etat');

  return (
    <Fenetre title="Template d'etat" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l'etat<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <div className="grid2">
          <label className="field">Duree<input type="number" inputMode="numeric" min="1" placeholder="illimitee" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
          <label className="field">Evolution<select value={advanceOn} onChange={(event) => setAdvanceOn(event.target.value)}><option value="activation">Activation</option><option value="round">Début du round</option></select></label>
        </div>
        <SelecteurImpactEtat value={impact} onChange={setImpact} />
        {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

function LigneTemplateSysteme({ template, detail }) {
  return <div className="restore-row hub-row template-row"><span className="template-row-main"><strong>{template.name}</strong><small>{detail}</small></span><span className="chip">Automatise depuis les regles</span></div>;
}

function libelleDureeEtat(status = {}) {
  const impact = status.inactive ? '[!] inactif' : status.limited ? '[~] limite' : '[o] normal';
  const rythme = status.advanceOn === 'round' ? 'round(s)' : 'activation(s)';
  if (status.duration == null) return `${impact} | illimite`;
  return `${impact} | ${status.duration} ${rythme}`;
}

function OngletTemplatesEtats({ templates, onAjouter, onEditer, onDupliquer, onSupprimer }) {
  return (
    <div className="stack">
      <div className="hub-section-head">
        <p className="muted compact-help">Ces etats seront proposes quand tu ajoutes un etat a une fiche.</p>
        <button className="small-btn" onClick={onAjouter}>+ etat</button>
      </div>
      {templates.length === 0 ? <div className="empty-section panel">Aucun template d'etat.</div> : templates.map((template) => template.id === 'status-template-surpris'
        ? <LigneTemplateSysteme key={template.id} template={template} detail={libelleDureeEtat(template.status)} />
        : <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditer} onDupliquer={onDupliquer} onSupprimer={onSupprimer} />)}
    </div>
  );
}

function libelleCompteurScene(compteur = {}) {
  const mode = compteur.mode || 'clock';
  if (mode === 'timer') return `minuteur ${Math.max(1, Math.round(Number(compteur.max || 60) / 60))} min`;
  if (mode === 'stopwatch') return 'chronometre';
  if (mode === 'counter') return `compteur /${compteur.max || 10}`;
  return `horloge ${compteur.max || 6} segments`;
}

function FenetreEditionTemplateEtatScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const status = template?.status || {};
  const [nomTemplate, setNomTemplate] = useState(template?.name || status.name || 'Etat de scene');
  const [nom, setNom] = useState(status.name || 'Etat de scene');
  const [duree, setDuree] = useState(status.duration == null ? '' : String(status.duration));
  const [boucle, setBoucle] = useState(!!status.loop);
  const dureeNettoyee = duree === '' ? null : Math.max(1, Number(duree) || 1);
  const valider = () => onValider(template.id, {
    id: 'template-status',
    name: nom || nomTemplate || 'Etat de scene',
    duration: dureeNettoyee,
    remaining: dureeNettoyee,
    loop: dureeNettoyee !== null && boucle,
    inactive: false,
    limited: false,
    advanceOn: 'round',
    expired: false,
  }, nomTemplate || nom || 'Etat de scene');

  return (
    <Fenetre title="Template d'etat de scene" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom de l'etat<input value={nom} onChange={(event) => setNom(event.target.value)} /></label>
        <label className="field">Duree<input type="number" inputMode="numeric" min="1" placeholder="illimitee" value={duree} onChange={(event) => setDuree(event.target.value)} /></label>
        {dureeNettoyee !== null && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

function FenetreEditionTemplateCompteurScene({ template, switchRequest, onAnnulerChangement, onValiderChangement, onAbandonnerChangement, onFermer, onValider }) {
  const [nomTemplate, setNomTemplate] = useState(template?.name || template?.counter?.name || 'Suivi global');
  const [brouillon, setBrouillon] = useState(() => normalizeGlobalTracker(template?.counter || { enabled: true, name: 'Suivi global', mode: 'clock', current: 0, max: 6, auto: false, thresholds: [] }));
  const tempsReel = ['stopwatch', 'timer'].includes(brouillon.mode);
  const minutesMinuteur = Math.max(1, Math.round(Number(brouillon.max || 60) / 60));
  const modifier = (patch) => setBrouillon((courant) => normalizeGlobalTracker({ ...courant, ...patch }));
  const valider = () => onValider(template.id, { ...brouillon, name: brouillon.name || nomTemplate || 'Suivi global', running: false, startedAt: null, elapsedMs: 0 }, nomTemplate || brouillon.name || 'Suivi global');

  return (
    <Fenetre title="Template de suivi global" className="template-edit-sheet" onClose={onFermer}>
      <div className="stack">
        {switchRequest && <MessageChangementTemplate onAnnuler={onAnnulerChangement} onValider={() => { valider(); onValiderChangement?.(); }} onAbandonner={onAbandonnerChangement} />}
        <label className="field">Nom du template<input value={nomTemplate} onChange={(event) => setNomTemplate(event.target.value)} /></label>
        <label className="field">Nom du compteur<input value={brouillon.name || ''} onChange={(event) => modifier({ name: event.target.value })} /></label>
        <div className="grid2">
          <label className="field">Type<select value={brouillon.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, elapsedMs: 0 })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronometre</option><option value="timer">Minuteur</option></select></label>
          {!tempsReel && <label className="field">Valeur<input type="number" inputMode="numeric" value={brouillon.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {brouillon.mode === 'timer' && <label className="field">Duree minutes<input type="number" inputMode="numeric" min="1" value={minutesMinuteur} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={brouillon.max ?? 6} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {!tempsReel && <label className="row"><input type="checkbox" checked={!!brouillon.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avance automatiquement a chaque nouveau round</label>}
        <details className="advanced-options" open>
          <summary>Seuils</summary>
          <EditeurSeuilsCompteurScene compteur={brouillon} onModifier={modifier} />
        </details>
        <div className="grid2">
          <button className="primary" onClick={valider}>Valider</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}

function OngletTemplatesScene({ counterTemplates, statusTemplates, onAjouterCompteur, onEditerCompteur, onDupliquerCompteur, onSupprimerCompteur, onAjouterEtat, onEditerEtat, onDupliquerEtat, onSupprimerEtat }) {
  return (
    <div className="stack">
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div><h4>Suivis globaux</h4><p className="muted compact-help">Ces templates remplacent ou preparent le suivi global de la scene.</p></div>
          <button className="small-btn" onClick={onAjouterCompteur}>+ compteur</button>
        </div>
        {counterTemplates.length === 0 ? <div className="empty-section panel">Aucun template de suivi global.</div> : counterTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleCompteurScene(template.counter)} onEditer={onEditerCompteur} onDupliquer={onDupliquerCompteur} onSupprimer={onSupprimerCompteur} />
        ))}
      </section>
      <section className="scene-template-group">
        <div className="hub-section-head">
          <div><h4>Etats de scene</h4><p className="muted compact-help">Ces etats sont proposes dans le menu d'ajout d'etat de scene.</p></div>
          <button className="small-btn" onClick={onAjouterEtat}>+ etat</button>
        </div>
        {statusTemplates.length === 0 ? <div className="empty-section panel">Aucun template d'etat de scene.</div> : statusTemplates.map((template) => (
          <LigneTemplateSimple key={template.id} template={template} detail={libelleDureeEtat(template.status)} onEditer={onEditerEtat} onDupliquer={onDupliquerEtat} onSupprimer={onSupprimerEtat} />
        ))}
      </section>
    </div>
  );
}

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
  onChangerCategorieTemplate,
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
      {sousPage === 'personnages' && <OngletTemplatesPersonnages categories={categories} templates={templates} onAjouterTemplateCategorie={ajouterTemplateCategorie} onAjouterCategorie={onAjouterCategorie} onRenommerCategorie={onRenommerCategorie} onSupprimerCategorie={onSupprimerCategorie} onDeplacerCategorie={onDeplacerCategorie} onChangerCategorieTemplate={onChangerCategorieTemplate} onEditerTemplate={ouvrirTemplatePersonnage} onDupliquerTemplate={dupliquerTemplatePersonnage} onSupprimerTemplate={onSupprimerTemplate} />}
      {sousPage === 'suivis' && <OngletTemplatesSuivis templates={trackerTemplates} onAjouter={ajouterSuivi} onEditer={ouvrirSuivi} onDupliquer={onDupliquerTemplateSuivi} onSupprimer={onSupprimerTemplateSuivi} />}
      {sousPage === 'etats' && <OngletTemplatesEtats templates={statusTemplatesAffiches} onAjouter={ajouterEtat} onEditer={ouvrirEtat} onDupliquer={onDupliquerTemplateEtat} onSupprimer={onSupprimerTemplateEtat} />}
      {sousPage === 'scene' && <OngletTemplatesScene counterTemplates={sceneCounterTemplates} statusTemplates={sceneStatusTemplates} onAjouterCompteur={ajouterCompteurScene} onEditerCompteur={ouvrirCompteurScene} onDupliquerCompteur={onDupliquerTemplateCompteurScene} onSupprimerCompteur={onSupprimerTemplateCompteurScene} onAjouterEtat={ajouterEtatScene} onEditerEtat={ouvrirEtatScene} onDupliquerEtat={onDupliquerTemplateEtatScene} onSupprimerEtat={onSupprimerTemplateEtatScene} />}
      {suiviEdite && <FenetreEditionTemplateSuivi template={suiviEdite} switchRequest={changementDemande} onAnnulerChangement={annulerChangement} onValiderChangement={validerEtOuvrir} onAbandonnerChangement={abandonnerEtOuvrir} onFermer={fermerSuivi} onValider={validerSuivi} />}
      {etatEdite && <FenetreEditionTemplateEtat template={etatEdite} switchRequest={changementDemande} onAnnulerChangement={annulerChangement} onValiderChangement={validerEtOuvrir} onAbandonnerChangement={abandonnerEtOuvrir} onFermer={fermerEtat} onValider={validerEtat} />}
      {compteurSceneEdite && <FenetreEditionTemplateCompteurScene template={compteurSceneEdite} switchRequest={changementDemande} onAnnulerChangement={annulerChangement} onValiderChangement={validerEtOuvrir} onAbandonnerChangement={abandonnerEtOuvrir} onFermer={fermerCompteurScene} onValider={validerCompteurScene} />}
      {etatSceneEdite && <FenetreEditionTemplateEtatScene template={etatSceneEdite} switchRequest={changementDemande} onAnnulerChangement={annulerChangement} onValiderChangement={validerEtOuvrir} onAbandonnerChangement={abandonnerEtOuvrir} onFermer={fermerEtatScene} onValider={validerEtatScene} />}
    </div>
  );
}
