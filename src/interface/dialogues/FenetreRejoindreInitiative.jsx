import { useState } from 'react';
import { initiativeInputIsValid, initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';

export function FenetreRejoindreInitiative({ participant, initiativeTextOrder, utiliserInitiative = true, onFermer, onValider }) {
  const ancienneInitiative = participant.previousInitiative ?? participant.previousActionSlots?.[0]?.initiative ?? '';
  const [initiative, setInitiative] = useState('');
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const valeurValide = initiativeInputIsValid(initiative, textConfig);

  return (
    <Fenetre title={`Rejoindre l'initiative - ${participant.name}`} onClose={onFermer}>
      {utiliserInitiative ? <ChampInitiative label="Initiative" valeur={initiative} textConfig={textConfig} onChange={setInitiative} autoFocus /> : <p className="muted compact-help">Ce mode souple classe automatiquement les personnages par type puis par nom.</p>}
      {utiliserInitiative && String(ancienneInitiative ?? '').trim() !== '' && <button className="small-btn" type="button" onClick={() => setInitiative(String(ancienneInitiative))}>Reprendre l'ancienne initiative</button>}
      <div className="grid2" style={{ marginTop: 12 }}>
        <button className="primary" disabled={!valeurValide} onClick={() => onValider(initiativeValueForMode(initiative, textConfig))}>Rejoindre</button>
        <button className="small-btn" onClick={onFermer}>Annuler</button>
      </div>
    </Fenetre>
  );
}
