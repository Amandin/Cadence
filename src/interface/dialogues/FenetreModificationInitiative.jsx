import { useState } from 'react';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

export function FenetreModificationInitiative({ participant, initiativeTextOrder, onFermer, onValider }) {
  const [initiative, setInitiative] = useState(String(participant?.initiative ?? ''));
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const valeurValide = initiativeInputIsValid(initiative, textConfig);

  return (
    <Fenetre title={`Modifier l'initiative - ${participant?.name || 'Personnage'}`} onClose={onFermer}>
      <div className="stack">
        <ChampInitiative label="Initiative" valeur={initiative} textConfig={textConfig} onChange={setInitiative} autoFocus />
        <div className="grid2">
          <button className="primary" type="button" disabled={!valeurValide} onClick={() => onValider(initiativeValueForMode(initiative, textConfig))}>Valider</button>
          <button className="small-btn" type="button" onClick={onFermer}>Annuler</button>
        </div>
      </div>
    </Fenetre>
  );
}
