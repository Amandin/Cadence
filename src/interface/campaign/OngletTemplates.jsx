import { useEffect, useMemo, useRef, useState } from 'react';

function grouperTemplates(templates = [], categories = []) {
  const groupes = categories.map((categorie) => ({ categorie, templates: [] }));
  const trouverOuCreerGroupe = (categorie) => {
    const nom = categorie || 'Sans catégorie';
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
      <input value={nom} placeholder="Nouvelle catégorie" onChange={(event) => setNom(event.target.value)} />
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
    <div className="template-category-head">
      <div className="flexible-section-title"><span>{groupe.categorie}</span><strong>{groupe.templates.length}</strong></div>
      <div className="compact-arrows template-category-actions">
        <button className="small-btn" onClick={() => onAjouterTemplateCategorie(groupe.categorie)}>+ template</button>
        <button className="small-btn" onClick={() => setRenommage(true)}>Renommer</button>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, -1)} disabled={index <= 0}>↑</button>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, 1)} disabled={index >= total - 1}>↓</button>
        <button className="danger-btn mini-danger" onClick={() => onSupprimerCategorie(groupe.categorie)} disabled={groupe.templates.length > 0}>Suppr.</button>
      </div>
    </div>
  );
}

export function OngletTemplates({ categories = [], templates = [], onAjouterTemplateCategorie, onAjouterCategorie, onRenommerCategorie, onSupprimerCategorie, onDeplacerCategorie, onChangerCategorieTemplate, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate, onImporterTemplates }) {
  const groupes = useMemo(() => grouperTemplates(templates, categories), [categories, templates]);
  const importInputRef = useRef(null);
  const choisirFichier = () => importInputRef.current?.click();
  const importerFichier = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onImporterTemplates(file);
  };

  return (
    <div className="stack hub-section panel">
      <div className="hub-section-head">
        <h3>Templates</h3>
        <button className="small-btn" onClick={choisirFichier}>Importer depuis une autre campagne</button>
        <input ref={importInputRef} type="file" accept=".cad,.json,application/json" style={{ display: 'none' }} onChange={importerFichier} />
      </div>
      <p className="muted compact-help">Les templates servent de fiches modèles. Crée un modèle dans une catégorie, puis modifie sa fiche.</p>
      <NouvelleCategorieTemplate onAjouterCategorie={onAjouterCategorie} />
      {groupes.map((groupe, index) => (
        <section className="hub-template-group" key={groupe.categorie}>
          <EnteteCategorieTemplate groupe={groupe} index={index} total={groupes.length} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onRenommerCategorie={onRenommerCategorie} onSupprimerCategorie={onSupprimerCategorie} onDeplacerCategorie={onDeplacerCategorie} />
          {groupe.templates.length === 0 ? (
            <div className="empty-section panel">Aucun template dans cette catégorie.</div>
          ) : (
            <div className="stack">
              {groupe.templates.map((template) => (
                <div className="restore-row hub-row" key={template.id}>
                  <span><strong>{template.name}</strong><small>{template.participant?.kind || 'Personnage'}</small></span>
                  <select value={template.category} onChange={(event) => onChangerCategorieTemplate(template.id, event.target.value)} aria-label="Catégorie du template">
                    {categories.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
                  </select>
                  <div className="compact-arrows">
                    <button className="small-btn" onClick={() => onEditerTemplate(template.id)}>Modifier</button>
                    <button className="small-btn" onClick={() => onDupliquerTemplate(template.id)}>Dupliquer</button>
                    <button className="danger-btn mini-danger" onClick={() => onSupprimerTemplate(template.id)}>Suppr.</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
