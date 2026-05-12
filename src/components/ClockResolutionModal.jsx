import { isTriggeredClock } from '../logic.js';
import { Sheet } from './common.jsx';

export function ClockResolutionModal({ participants, onClose, onResetClock, onDeleteClock }) {
  const clocks = participants.flatMap((participant) => participant.trackers.filter(isTriggeredClock).map((tracker) => ({ participant, tracker })));

  return <Sheet title="Horloge à résoudre" onClose={onClose}><p className="muted" style={{ marginTop: 0 }}>Une horloge est arrivée à son terme. Résous-la avant de continuer le tour.</p><div className="stack">{clocks.map(({ participant, tracker }) => <div className="tracker triggered" key={`${participant.id}-${tracker.id}`}><div className="tracker-top"><span>{participant.name}</span><span className="chip hot">{tracker.name}</span></div><p style={{ margin:'4px 0 10px' }}>{tracker.current}/{tracker.max} segments</p><div className="grid2"><button className="primary" onClick={() => onResetClock(participant.id, tracker.id)}>Relancer à 0</button><button className="danger-btn" onClick={() => onDeleteClock(participant.id, tracker.id)}>Supprimer</button></div></div>)}</div><button className="small-btn" style={{ width:'100%', marginTop: 12 }} onClick={onClose}>Fermer</button></Sheet>;
}
