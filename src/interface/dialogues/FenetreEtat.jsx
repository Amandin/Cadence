import { useState } from 'react';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const optionsDuree = [
  { label: '∞', value: 'infinite' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
  { label: 'Perso', value: 'custom' },
];

export function FenetreEtat({ participant, onFermer, onValider, defaultAdvanceOn = 'activation', afficherChoixEvolution = true }) {
  const [nom, setNom] = useState('Nouveau');
  const [duree, setDuree] = useState('infinite');
  const [dureePersonnalisee, setDureePersonnalisee] = useState('8');
  const [boucle, setBoucle] = useState(false);
  const [inactif, setInactif] = useState(false);
  const [advanceOn, setAdvanceOn] = useState(defaultAdvanceOn === 'round' ? 'round' : 'activation');

  const dureeFinie = duree !== 'infinite';
  const valeurDuree = duree === 'custom' ? Number(dureePersonnalisee) : Number(duree);
  const dureeValide = !dureeFinie || (Number.isFinite(valeurDuree) && valeurDuree >= 1);
  const peutEnregistrer = nom.trim() && dureeValide;

  const enregistrer = () => {
    const nomNettoye = nom.trim();
    if (!nomNettoye || !dureeValide) return;
    onValider({ name: nomNettoye, duration: dureeFinie ? valeurDuree : null, loop: dureeFinie && boucle, inactive: inactif, advanceOn });
  };

  return (
    <Fenetre title={`Ajouter un état · ${participant.name}`} onClose={onFermer}>
      <div className="status-name-row">
        <label className="field">
          Nom
          <input value={nom} onChange={(event) => setNom(event.target.value)} autoFocus />
        </label>
        <label className={`reset-switch status-inactive-switch ${inactif ? 'active' : ''}`}>
          <span>Rend inactif</span>
          <input type="checkbox" checked={inactif} onChange={(event) => setInactif(event.target.checked)} />
        </label>
      </div>
      <div className="field">
        Durée
        <div className="choice-row status-duration-row">
          {optionsDuree.map((option) => <button key={option.value} className={`choice ${duree === option.value ? 'selected' : ''}`} onClick={() => setDuree(option.value)}>{option.label}</button>)}
        </div>
      </div>
      {duree === 'custom' && <label className="field">Durée personnalisée<input type="number" inputMode="numeric" min="1" value={dureePersonnalisee} onChange={(event) => setDureePersonnalisee(event.target.value)} /></label>}
      {afficherChoixEvolution && <div className="field">Evolution<div className="choice-row status-advance-row"><button className={`choice ${advanceOn === 'activation' ? 'selected' : ''}`} onClick={() => setAdvanceOn('activation')}>Activation</button><button className={`choice ${advanceOn === 'round' ? 'selected' : ''}`} onClick={() => setAdvanceOn('round')}>Nouveau tour</button></div></div>}
      {dureeFinie && <label className="row"><input type="checkbox" checked={boucle} onChange={(event) => setBoucle(event.target.checked)} /> renouveler en boucle</label>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" onClick={enregistrer} disabled={!peutEnregistrer}>Ajouter</button>
        <button className="small-btn" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
