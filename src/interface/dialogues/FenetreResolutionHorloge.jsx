import { isTriggeredClock } from '../../logic.js';
import { Sheet } from '../../components/common.jsx';

export function FenetreResolutionHorloge({ participants, onFermer, onRelancerHorloge, onSupprimerHorloge }) {
  const horloges = participants.flatMap((participant) => (
    participant.trackers
      .filter(isTriggeredClock)
      .map((suivi) => ({ participant, suivi }))
  ));

  return (
    <Sheet title="Horloge à résoudre" onClose={onFermer}>
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
              <button className="primary" onClick={() => onRelancerHorloge(participant.id, suivi.id)}>Relancer à 0</button>
              <button className="danger-btn" onClick={() => onSupprimerHorloge(participant.id, suivi.id)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
      <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={onFermer}>Fermer</button>
    </Sheet>
  );
}
