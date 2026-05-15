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
    <div className="flexible-section-title template-category-title">
      <strong>{groupe.templates.length}</strong>
      <span className="template-category-label">{groupe.categorie}</span>
      <div className="compact-arrows template-category-actions">
        <button className="small-btn" onClick={() => onAjouterTemplateCategorie(groupe.categorie)}>+ template</button>
        <button className="small-btn" onClick={() => setRenommage(true)}>Renommer</button>
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
          <select className="template-category-select" value={template.category} onChange={changerCategorie} onBlur={() => setCategorieOuverte(false)} aria-label="Catégorie du template">
            {categories.map((categorie) => <option key={categorie} value={categorie}>{categorie}</option>)}
          </select>
        ) : (
          <button className="small-btn discreet-template-category" onClick={() => setCategorieOuverte(true)} title={`Catégorie : ${template.category}`}>Cat.</button>
        )}
        <button className="small-btn" onClick={() => onEditerTemplate(template.id)}>Modifier</button>
        <button className="small-btn" onClick={() => onDupliquerTemplate(template.id)}>Dupliquer</button>
        {suppressionVisible ? (
          <button className="danger-btn mini-danger template-delete-confirm" onClick={() => onSupprimerTemplate(template.id)}>Suppr.</button>
        ) : (
          <button className="small-btn template-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={`Afficher la suppression de ${template.name}`}>×</button>
        )}
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
                <LigneTemplate
                  key={template.id}
                  template={template}
                  categories={categories}
                  onChangerCategorieTemplate={onChangerCategorieTemplate}
                  onEditerTemplate={onEditerTemplate}
                  onDupliquerTemplate={onDupliquerTemplate}
                  onSupprimerTemplate={onSupprimerTemplate}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
