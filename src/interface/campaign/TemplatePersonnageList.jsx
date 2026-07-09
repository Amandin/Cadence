import { useEffect, useMemo, useState } from 'react';
import { t } from '../../i18n/index.js';
import { uiSymbols } from '../../uiAssets.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { BoutonIconeTemplate } from './TemplateRows.jsx';

function grouperTemplates(templates = [], categories = []) {
  const groupes = categories.map((categorie) => ({ categorie, templates: [] }));
  const trouverOuCreerGroupe = (categorie) => {
    const nom = categorie || t('templates.personnages.uncategorized');
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
      <input value={nom} aria-label={t('templates.personnages.newCategoryPlaceholder')} placeholder={t('templates.personnages.newCategoryPlaceholder')} onChange={(event) => setNom(event.target.value)} />
      <button className="small-btn" onClick={ajouter}>{t('templates.personnages.addCategory')}</button>
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
        <input value={nom} aria-label={t('templates.personnages.renameCategoryAria')} onChange={(event) => setNom(event.target.value)} />
        <button className="primary" onClick={enregistrer}>{t('common.ok')}</button>
        <button className="small-btn" onClick={() => setRenommage(false)}>{t('common.cancel')}</button>
      </div>
    );
  }

  return (
    <div className="flexible-section-title template-category-title">
      <strong>{groupe.templates.length}</strong>
      <span className="template-category-label template-title-with-action">
        <span>{groupe.categorie}</span>
        <BoutonIconeTemplate className="template-edit-icon" label={t('templates.personnages.renameCategoryAria')} onClick={() => setRenommage(true)}><IconeCadence name="edit" /></BoutonIconeTemplate>
      </span>
      <div className="compact-arrows template-category-actions">
        <BoutonIconeTemplate label={t('templates.personnages.addTemplateAria')} onClick={() => onAjouterTemplateCategorie(groupe.categorie)}><IconeCadence name="add" /></BoutonIconeTemplate>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, -1)} disabled={index <= 0} aria-label={t('templates.personnages.moveCategoryUp', { name: groupe.categorie })} title={t('templates.personnages.moveCategoryUp', { name: groupe.categorie })}><IconeCadence name="nextStrong" className="up" /></button>
        <button className="small-btn" onClick={() => onDeplacerCategorie(groupe.categorie, 1)} disabled={index >= total - 1} aria-label={t('templates.personnages.moveCategoryDown', { name: groupe.categorie })} title={t('templates.personnages.moveCategoryDown', { name: groupe.categorie })}><IconeCadence name="nextStrong" className="down" /></button>
        {groupe.templates.length === 0 && <button className="danger-btn mini-danger" onClick={() => onSupprimerCategorie(groupe.categorie)}>{t('common.delete')}</button>}
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
          <BoutonIconeTemplate className="template-edit-icon" label={t('templates.personnages.editAria', { name: template.name })} onClick={() => onEditerTemplate(template.id)}><IconeCadence name="edit" /></BoutonIconeTemplate>
        </span>
        <small>{template.participant?.kind || t('templates.personnages.kindFallback')}</small>
      </span>
      <div className="compact-arrows template-row-actions">
        <BoutonIconeTemplate label={t('templates.personnages.duplicateAria', { name: template.name })} onClick={() => onDupliquerTemplate(template.id)}><IconeCadence name="duplicate" /></BoutonIconeTemplate>
        {suppressionVisible ? (
          <button className="danger-btn mini-danger template-delete-confirm" onClick={() => onSupprimerTemplate(template.id)}>{t('common.delete')}</button>
        ) : (
          <button className="small-btn template-delete-reveal" onClick={() => setSuppressionVisible(true)} aria-label={t('templates.personnages.deleteRevealAria', { name: template.name })}><IconeCadence name="remove" /></button>
        )}
      </div>
    </div>
  );
}

export function OngletTemplatesPersonnages({ categories, templates, onAjouterTemplateCategorie, onAjouterCategorie, onRenommerCategorie, onSupprimerCategorie, onDeplacerCategorie, onEditerTemplate, onDupliquerTemplate, onSupprimerTemplate }) {
  const groupes = useMemo(() => grouperTemplates(templates, categories), [categories, templates]);
  return (
    <div className="stack">
      <p className="muted compact-help">{t('templates.personnages.help')}</p>
      <NouvelleCategorieTemplate onAjouterCategorie={onAjouterCategorie} />
      {groupes.map((groupe, index) => (
        <section className="hub-template-group" key={groupe.categorie}>
          <EnteteCategorieTemplate groupe={groupe} index={index} total={groupes.length} onAjouterTemplateCategorie={onAjouterTemplateCategorie} onRenommerCategorie={onRenommerCategorie} onSupprimerCategorie={onSupprimerCategorie} onDeplacerCategorie={onDeplacerCategorie} />
          {groupe.templates.length === 0 ? (
            <div className="empty-section panel">{t('templates.personnages.empty')}</div>
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
