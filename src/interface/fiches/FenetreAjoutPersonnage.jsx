import { useEffect, useMemo, useState } from 'react';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

function trierTemplates(templates) {
  return [...templates].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`, 'fr'));
}

function listerCategories(categories, templates) {
  const connues = categories?.length ? categories : [];
  const utilisees = templates.map((template) => template.category).filter(Boolean);
  return [...new Set([...connues, ...utilisees])].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function FenetreAjoutPersonnage({ templates = [], categories = [], onFermer, onCreerVierge, onCreerDepuisTemplate }) {
  const templatesTries = useMemo(() => trierTemplates(templates), [templates]);
  const categoriesDisponibles = useMemo(() => listerCategories(categories, templatesTries), [categories, templatesTries]);
  const [mode, setMode] = useState(templatesTries.length ? 'template' : 'blank');
  const [categorie, setCategorie] = useState(categoriesDisponibles[0] || '');
  const templatesCategorie = templatesTries.filter((template) => template.category === categorie);
  const [templateId, setTemplateId] = useState(templatesCategorie[0]?.id || '');
  const [placement, setPlacement] = useState('init');
  const [initiative, setInitiative] = useState(1);

  useEffect(() => {
    if (categoriesDisponibles.includes(categorie)) return;
    setCategorie(categoriesDisponibles[0] || '');
  }, [categorie, categoriesDisponibles]);

  useEffect(() => {
    if (templatesCategorie.some((template) => template.id === templateId)) return;
    setTemplateId(templatesCategorie[0]?.id || '');
  }, [templateId, templatesCategorie]);

  const choisirCategorie = (nouvelleCategorie) => {
    const prochainsTemplates = templatesTries.filter((template) => template.category === nouvelleCategorie);
    setCategorie(nouvelleCategorie);
    setTemplateId(prochainsTemplates[0]?.id || '');
  };

  const creerPersonnage = () => {
    const options = {
      placement,
      initiative: placement === 'init' ? Number(initiative) : null,
    };
    if (mode === 'template') onCreerDepuisTemplate(templateId, options);
    else onCreerVierge(options);
  };

  const categorieVide = mode === 'template' && categorie && templatesCategorie.length === 0;

  return (
    <Fenetre title="Ajouter un personnage" onClose={onFermer}>
      <div className="stack">
        <div className="grid2">
          <button className={`choice ${mode === 'blank' ? 'selected' : ''}`} onClick={() => setMode('blank')}>Fiche vierge</button>
          <button className={`choice ${mode === 'template' ? 'selected' : ''}`} disabled={templatesTries.length === 0} onClick={() => setMode('template')}>Template</button>
        </div>
        {mode === 'template' && <div className="grid2">
          <label className="field">Catégorie<select value={categorie} onChange={(event) => choisirCategorie(event.target.value)}>{categoriesDisponibles.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Template<select value={templateId} onChange={(event) => setTemplateId(event.target.value)} disabled={templatesCategorie.length === 0}>{templatesCategorie.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        </div>}
        {categorieVide && <p className="muted" style={{ margin: 0, fontSize: 12 }}>Cette catégorie existe dans le Hub, mais ne contient encore aucun template.</p>}
        <div className="grid2">
          <button className={`choice ${placement === 'init' ? 'selected' : ''}`} onClick={() => setPlacement('init')}>En initiative</button>
          <button className={`choice ${placement === 'reserve' ? 'selected' : ''}`} onClick={() => setPlacement('reserve')}>En réserve</button>
        </div>
        {placement === 'init' && <label className="field">Initiative<input type="number" inputMode="numeric" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>}
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>La fiche s’ouvrira ensuite pour ajuster les détails avant de continuer la scène.</p>
        <div className="grid2">
          <button className="primary" onClick={creerPersonnage} disabled={mode === 'template' && !templateId}>Créer</button>
          <button className="small-btn" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}
