import { useMemo, useState } from 'react';
import { Sheet } from './common.jsx';

function groupedTemplates(templates) {
  return [...templates].sort((a, b) => `${a.category}/${a.name}`.localeCompare(`${b.category}/${b.name}`));
}

export function AddCharacterSheet({ templates = [], onClose, onCreateBlank, onCreateFromTemplate }) {
  const orderedTemplates = useMemo(() => groupedTemplates(templates), [templates]);
  const [mode, setMode] = useState(orderedTemplates.length ? 'template' : 'blank');
  const [templateId, setTemplateId] = useState(orderedTemplates[0]?.id || '');
  const [placement, setPlacement] = useState('init');
  const [initiative, setInitiative] = useState(1);

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
        <label className="field">Source<select value={mode} onChange={(event) => setMode(event.target.value)}><option value="blank">Fiche vierge</option>{orderedTemplates.length > 0 && <option value="template">Template</option>}</select></label>
        {mode === 'template' && <label className="field">Template<select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>{orderedTemplates.map((template) => <option key={template.id} value={template.id}>{template.category} · {template.name}</option>)}</select></label>}
        <div className="grid2">
          <label className="field">Placement<select value={placement} onChange={(event) => setPlacement(event.target.value)}><option value="init">En initiative</option><option value="reserve">Hors initiative</option></select></label>
          {placement === 'init' && <label className="field">Initiative<input type="number" inputMode="numeric" value={initiative} onChange={(event) => setInitiative(event.target.value)} /></label>}
        </div>
        <p className="muted" style={{ margin: 0, fontSize: 12 }}>La fiche s’ouvrira ensuite pour ajuster les détails avant de continuer la scène.</p>
        <div className="grid2">
          <button className="primary" onClick={submit} disabled={mode === 'template' && !templateId}>Créer</button>
          <button className="small-btn" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </Sheet>
  );
}
