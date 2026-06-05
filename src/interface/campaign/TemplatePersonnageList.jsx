import { useEffect, useMemo, useState } from 'react';
import { BoutonIconeTemplate } from './TemplateRows.jsx';

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
      <span className="template-category-label template-title-with-action">
        <span>{groupe.categorie}</span>
        <BoutonIconeTemplate className="template-edit-icon" label="Renommer la categorie" onClick={() => setRenommage(true)}>✎</BoutonIconeTemplate>
      </span>
      <div className="compact-arrows template-category-actions">
        <BoutonIconeTemplate label="Ajouter un template" onClick={() => onAjouterTemplateCategorie(groupe.categorie)}>+</BoutonIconeTemplate>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, -1)} disabled={index <= 0}>↑</button>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, 1)} disabled={index >= total - 1}>↓</button>
        {groupe.templates.length === 0 && <button className="danger-btn mini-danger" onClick={() => onSupprimerCategorie(groupe.categorie)}>Suppr.</button>}
      </div>
    </div>
  );
}

function LigneTemplate({ template, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate }) {
  const [suppressionVisible, setSuppressionVisible] = useState(false);

  return (
    <div className="restore-row hub-row template-row">
      <span className="template-row-main">
        <span className="template-title-with-action">
          <strong>{template.name}</strong>
          <BoutonIconeTemplate className="template-edit-icon" label={`Modifier ${template.name}`} onClick={() => onEditerTemplate(template.id)}>✎</BoutonIconeTemplate>
        </span>
        <small>{template.participant?.kind || 'Personnage'}</small>
      </span>
      <div className="compact-arrows template-row-actions">
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

export function OngletTemplatesPersonnages({ categories, templates, onAjouterTemplateCategorie, onAjouterCategorie, onRenommerCategorie, onSupprimerCategorie, onDeplacerCategorie, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate }) {
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
                <LigneTemplate key={template.id} template={template} onEditerTemplate={onEditerTemplate} onDupliquerTemplate={onDupliquerTemplate} onSupprimerTemplate={onSupprimerTemplate} />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
