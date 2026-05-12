import { useState } from 'react';
import { templateCategories } from '../templates.js';
import { Sheet } from './common.jsx';

function guessCategory(participant) {
  if (participant.kind === 'PJ') return 'PJ';
  if (participant.kind === 'Horloge') return 'Horloge';
  if (participant.kind === 'Opposition') return 'Créature';
  if (participant.kind === 'Autre') return 'Autre';
  return 'PNJ';
}

export function TemplateSaveSheet({ participant, onClose, onSave }) {
  const [category, setCategory] = useState(() => guessCategory(participant));

  return (
    <Sheet title="Enregistrer comme template" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Le template gardera la fiche et ses suivis. Les états temporaires ne seront pas appliqués quand tu l’ajouteras à une scène.
      </p>
      <div className="field">
        Catégorie
        <div className="choice-row status-duration-row">
          {templateCategories.map((item) => (
            <button key={item} className={`choice ${category === item ? 'selected' : ''}`} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </div>
      </div>
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => onSave(category)}>Enregistrer</button>
        <button className="small-btn" onClick={onClose}>Annuler</button>
      </div>
    </Sheet>
  );
}
