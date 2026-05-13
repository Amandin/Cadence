import { useState } from 'react';
import { Sheet } from './common.jsx';

const NEW_CATEGORY = '__new__';

function guessCategory(participant, categories) {
  if (participant.kind === 'PJ' && categories.includes('PJ')) return 'PJ';
  if (participant.kind === 'Horloge' && categories.includes('Horloge')) return 'Horloge';
  if (participant.kind === 'Opposition' && categories.includes('Créature')) return 'Créature';
  if (participant.kind === 'Autre' && categories.includes('Autre')) return 'Autre';
  return categories.includes('PNJ') ? 'PNJ' : categories[0] || NEW_CATEGORY;
}

export function TemplateSaveSheet({ participant, categories = [], error, onClose, onSave }) {
  const [name, setName] = useState(participant.name || '');
  const [category, setCategory] = useState(() => guessCategory(participant, categories));
  const [newCategory, setNewCategory] = useState('');

  const save = (overwrite = false) => onSave({
    name,
    category: category === NEW_CATEGORY ? '' : category,
    newCategory: category === NEW_CATEGORY ? newCategory : '',
    overwrite,
  });

  return (
    <Sheet title="Enregistrer comme template" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Le template gardera la fiche et ses suivis. Les états temporaires ne seront pas appliqués quand tu l’ajouteras à une scène.
      </p>
      <label className="field">Nom du template<input value={name} onChange={(event) => setName(event.target.value)} placeholder={participant.name || 'Nom du template'} /></label>
      <label className="field">Catégorie<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}<option value={NEW_CATEGORY}>Nouvelle catégorie…</option></select></label>
      {category === NEW_CATEGORY && <label className="field">Nouvelle catégorie<input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nom de catégorie" /></label>}
      {error && <div className={`delete-confirm ${error.kind === 'duplicate' ? 'template-warning' : ''}`}><strong>{error.kind === 'duplicate' ? 'Nom déjà utilisé' : 'Impossible d’enregistrer'}</strong><span className="muted">{error.message}</span>{error.kind === 'duplicate' && <div className="grid2"><button className="danger-btn" onClick={() => save(true)}>Écraser</button><button className="small-btn" onClick={() => setName(`${name} copie`)}>Modifier le nom</button></div>}</div>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => save(false)}>Enregistrer</button>
        <button className="small-btn" onClick={onClose}>Annuler</button>
      </div>
    </Sheet>
  );
}
