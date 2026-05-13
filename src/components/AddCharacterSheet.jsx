import { useMemo, useState } from 'react';
import { Sheet } from './common.jsx';

function groupedTemplates(templates) {
  return [...templates].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
}

function uniqueCategories(templates) {
  return [...new Set(templates.map((template) => template.category).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function AddCharacterSheet({ templates = [], onClose, onCreateBlank, onCreateFromTemplate }) {
  const orderedTemplates = useMemo(() => groupedTemplates(templates), [templates]);
  const categories = useMemo(() => uniqueCategories(orderedTemplates), [orderedTemplates]);
  const [mode, setMode] = useState(orderedTemplates.length ? 'template' : 'blank');
  const [category, setCategory] = useState(categories[0] || '');
  const categoryTemplates = orderedTemplates.filter((template) => template.category === category);
  const [templateId, setTemplateId] = useState(categoryTemplates[0]?.id || '');
  const [placement, setPlacement] = useState('init');
  const [initiative, setInitiative] = useState(1);

  const selectCategory = (nextCategory) => {
    const nextTemplates = orderedTemplates.filter((template) => template.category === nextCategory);
    setCategory(nextCategory);
    setTemplateId(nextTemplates[0]?.id || '');
  };

  const submit = () => {
    const options = {
      placement,
      initiative: placement === 'init' ? Number(initiative) : null,
    };
    if (mode === 'template') onCreateFromTemplate(templateId, options);
    else onCreateBlank(options);
  };

  return (
    <Sheet title="Ajouter un personnage" onClose={onClose}>
      <div className="stack">
        <div className="grid2">
          <button className={`choice ${mode === 'blank' ? 'selected' : ''}`} onClick={() => setMode('blank')}>Fiche vierge</button>
          <button className={`choice ${mode === 'template' ? 'selected' : ''}`} disabled={orderedTemplates.length === 0} onClick={() => setMode('template')}>Template</button>
        </div>
        {mode === 'template' && <div className="grid2">
          <label className="field">Catégorie<select value={category} onChange={(event) => selectCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label className="field">Template<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{categoryTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select></label>
        </div>}
        <div className="grid2">
          <button className={`choice ${placement === 'init' ? 'selected' : ''}`} onClick={() => setPlacement('init')}>En initiative</button>
          <button className={`choice ${placement === 'reserve' ? 'selected' : ''}`} onClick={() => setPlacement('reserve')}>Hors initiative</button>
        </div>
        {placement === 'init' && <label className="field">Initiative<input type="number" inputMode="numeric" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>}
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>La fiche s’ouvrira ensuite pour ajuster les détails avant de continuer la scène.</p>
        <div className="grid2">
          <button className="primary" onClick={submit} disabled={mode === 'template' && !templateId}>Créer</button>
          <button className="small-btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </Sheet>
  );
}
