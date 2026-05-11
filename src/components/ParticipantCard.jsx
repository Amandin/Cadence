import { hasTriggeredClock, isVisible } from '../logic.js';
import { Avatar, Status, colorToAccent } from './common.jsx';
import { Tracker } from './Tracker.jsx';

export function ParticipantCard({ participant, active, onOpen, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus, onLeaveInit }) {
  const triggered = hasTriggeredClock(participant);

  return <article className={`card ${active ? 'active' : ''} ${triggered ? 'triggered' : ''}`} style={{ '--accent': colorToAccent(participant.color) }}><div className="card-head"><button className="card-main" onClick={onOpen}><Avatar participant={participant} /><div className="info"><div className="name-line"><strong>{participant.name}</strong>{active && <span className="chip">Tour actif</span>}{triggered && <span className="chip hot">À résoudre</span>}</div><div className="muted">{participant.description}</div><div className="name-line" style={{ marginTop: 6 }}><span className="chip">{participant.kind}</span><span className="chip">Init {participant.initiative}</span>{participant.stats?.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div></button><button className="small-btn" onClick={onLeaveInit}>Quitter l’init</button></div><div className="trackers">{participant.trackers.filter(isVisible).map((tracker) => <Tracker key={tracker.id} tracker={tracker} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} />)}<div className="statuses">{participant.statuses?.map((s) => <Status key={s.id} status={s} onRemove={() => onRemoveStatus(s.id)} />)}<button className="small-btn" onClick={onAddStatus}>+ état</button></div></div></article>;
}
