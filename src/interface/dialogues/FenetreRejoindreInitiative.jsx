import { useState } from 'react';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreRejoindreInitiative({ participant, onFermer, onValider }) {
  const [initiative, setInitiative] = useState(String(participant.initiative ?? 1));
  const valeurValide = Number.isFinite(Number(initiative));

  return (
    <Fenetre title={`Rejoindre l’initiative · ${participant.name}`} onClose={onFermer}>
      <label className="field">Initiative<input type="number" inputMode="numeric" value={initiative} onChange={(event) => setInitiative(event.target.value)} autoFocus /></label>
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" disabled={!valeurValide} onClick={() => onValider(Number(initiative))}>Rejoindre</button>
        <button className="small-btn" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
