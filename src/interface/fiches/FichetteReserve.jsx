import { useState } from 'react';
import { isVisible } from '../../logic.js';
import { Avatar, Status } from '../../components/common.jsx';
import { Suivi } from '../suivis/Suivi.jsx';

export function FichetteReserve({ participant, onRejoindre, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat }) {
  const [repliee, setRepliee] = useState(false);
  const suivisVisibles = (participant.trackers || []).filter(isVisible);

  return (
    <div className={`card reserve-card ${repliee ? 'collapsed' : ''}`} data-participant-id={participant.id}>
      <div className="card-head">
        <button className="icon-btn collapse-btn" onClick={() => setRepliee((valeur) => !valeur)} aria-label={repliee ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{repliee ? '⌄' : '⌃'}</button>
        <button className="card-main" onClick={onOuvrir}>
          <Avatar participant={participant} />
          <div className="info">
            <strong>{participant.name}</strong>
            <div className="muted">{participant.description}</div>
          </div>
        </button>
        <button className="small-btn" onClick={onRejoindre}>Rejoindre init</button>
      </div>
      {!repliee && (
        <div className="trackers">
          {suivisVisibles.map((suivi) => (
            <Suivi key={suivi.id} suivi={suivi} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />
          ))}
          <div className="statuses">
            {participant.statuses?.map((etat) => <Status key={etat.id} status={etat} onRemove={() => onRetirerEtat(etat.id)} />)}
            <button className="small-btn" onClick={onAjouterEtat}>+ état</button>
          </div>
        </div>
      )}
    </div>
  );
}
