import { useState } from 'react';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const NOUVELLE_CATEGORIE = '__new__';

function devinerCategorie(participant, categories) {
  if (participant.kind === 'PJ' && categories.includes('PJ')) return 'PJ';
  if (participant.kind === 'Horloge' && categories.includes('Horloge')) return 'Horloge';
  if (participant.kind === 'Opposition' && categories.includes('Créature')) return 'Créature';
  if (participant.kind === 'Autre' && categories.includes('Autre')) return 'Autre';
  return categories.includes('PNJ') ? 'PNJ' : categories[0] || NOUVELLE_CATEGORIE;
}

export function FenetreSauvegardeTemplate({ participant, categories = [], erreur, onFermer, onEnregistrer }) {
  const [nom, setNom] = useState(participant.name || '');
  const [categorie, setCategorie] = useState(() => devinerCategorie(participant, categories));
  const [nouvelleCategorie, setNouvelleCategorie] = useState('');

  const enregistrer = (overwrite = false) => onEnregistrer({
    name: nom,
    category: categorie === NOUVELLE_CATEGORIE ? '' : categorie,
    newCategory: categorie === NOUVELLE_CATEGORIE ? nouvelleCategorie : '',
    overwrite,
  });

  return (
    <Fenetre title="Enregistrer comme modèle" onClose={onFermer}>
      <p className="muted" style={{ marginTop: 0 }}>
        Le modèle gardera la fiche et ses indicateurs. Les états temporaires ne seront pas appliqués quand tu l’ajouteras à une scène.
      </p>
      <label className="field">Nom du modèle<input value={nom} onChange={(event) => setNom(event.target.value)} placeholder={participant.name || 'Nom du modèle'} /></label>
      <label className="field">Catégorie<select value={categorie} onChange={(event) => setCategorie(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}<option value={NOUVELLE_CATEGORIE}>Nouvelle catégorie…</option></select></label>
      {categorie === NOUVELLE_CATEGORIE && <label className="field">Nouvelle catégorie<input value={nouvelleCategorie} onChange={(event) => setNouvelleCategorie(event.target.value)} placeholder="Nom de catégorie" /></label>}
      {erreur && <div className={`delete-confirm ${erreur.kind === 'duplicate' ? 'template-warning' : ''}`}><strong>{erreur.kind === 'duplicate' ? 'Nom déjà utilisé' : 'Impossible d’enregistrer'}</strong><span className="muted">{erreur.message}</span>{erreur.kind === 'duplicate' && <div className="grid2"><button className="danger-btn" onClick={() => enregistrer(true)}>Écraser</button><button className="small-btn" onClick={() => setNom(`${nom} copie`)}>Modifier le nom</button></div>}</div>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={() => enregistrer(false)}>Enregistrer</button>
        <button className="small-btn" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
