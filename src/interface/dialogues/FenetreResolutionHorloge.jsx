import { useState } from 'react';
import { isTriggeredClock } from '../../logic.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreResolutionHorloge({ participants, onFermer, onRelancerHorloge, onSupprimerHorloge }) {
  const [action, setAction] = useState(null);
  const horloges = participants.flatMap((participant) => (
    participant.trackers
      .filter(isTriggeredClock)
      .map((suivi) => ({ participant, suivi }))
  ));

  const marquerAction = (type, participantId, suiviId, callback) => {
    setAction(`${type}-${participantId}-${suiviId}`);
    window.setTimeout(callback, 140);
  };

  return (
    <Fenetre title="Horloge à résoudre" onClose={onFermer}>
      <p className="muted" style={{ marginTop: 0 }}>
        Une horloge est arrivée à son terme. Résous-la avant de continuer le tour.
      </p>
      <div className="stack">
        {horloges.map(({ participant, suivi }) => (
          <div className="tracker triggered" key={`${participant.id}-${suivi.id}`}>
            <div className="tracker-top">
              <span>{participant.name}</span>
              <span className="chip hot">{suivi.name}</span>
            </div>
            <p style={{ margin: '4px 0 10px' }}>{suivi.current}/{suivi.max} segments</p>
            <div className="grid2">
              <button className={`primary resolve-action ${action === `reset-${participant.id}-${suivi.id}` ? 'clicked' : ''}`} onClick={() => marquerAction('reset', participant.id, suivi.id, () => onRelancerHorloge(participant.id, suivi.id))}>Relancer à 0</button>
              <button className={`danger-btn resolve-action ${action === `delete-${participant.id}-${suivi.id}` ? 'clicked' : ''}`} onClick={() => marquerAction('delete', participant.id, suivi.id, () => onSupprimerHorloge(participant.id, suivi.id))}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={onFermer}>Fermer</button>
    </Fenetre>
  );
}
