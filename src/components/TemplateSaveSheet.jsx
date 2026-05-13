import { useState } from 'react';
import { Sheet } from './common.jsx';

function guessCategory(participant, categories) {
  if (participant.kind === 'PJ' && categories.includes('PJ')) return 'PJ';
  if (participant.kind === 'Horloge' && categories.includes('Horloge')) return 'Horloge';
  if (participant.kind === 'Opposition' && categories.includes('Créature')) return 'Créature';
  if (participant.kind === 'Autre' && categories.includes('Autre')) return 'Autre';
  return categories.includes('PNJ') ? 'PNJ' : categories[0] || '';
}

export function TemplateSaveSheet({ participant, categories = [], error, onClose, onSave }) {
  const [name, setName] = useState(participant.name || '');
  const [categoryMode, setCategoryMode] = useState('existing');
  const [category, setCategory] = useState(() => guessCategory(participant, categories));
  const [newCategory, setNewCategory] = useState('');

  return (
    <Sheet title="Enregistrer comme template" onClose={onClose}>
      <p className="muted" style={{ marginTop: 0 }}>
        Le template gardera la fiche et ses suivis. Les états temporaires ne seront pas appliqués quand tu l’ajouteras à une scène.
      </p>
      <label className="field">Nom du template<input value={name} onChange={(event) => setName(event.target.value)} placeholder={participant.name || 'Nom du template'} /></label>
      <label className="field">Catégorie<select value={categoryMode} onChange={(event) => setCategoryMode(event.target.value)}><option value="existing">Catégorie existante</option><option value="new">Nouvelle catégorie</option></select></label>
      {categoryMode === 'existing'
        ? <label className="field">Choisir<select value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        : <label className="field">Nouvelle catégorie<input value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Nom de catégorie" /></label>}
      {error && <div className="delete-confirm"><strong>Impossible d’enregistrer</strong><span className="muted">{error}</span></div>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => onSave({ name, category, newCategory: categoryMode === 'new' ? newCategory : '' })}>Enregistrer</button>
        <button className="small-btn" onClick={onClose}>Annuler</button>
      </div>
    </Sheet>
  );
}
