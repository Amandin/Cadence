import { Status, Sheet } from './common.jsx';
import { Tracker } from './Tracker.jsx';

export function ParticipantSheet({ participant, onClose, onEdit, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus, onNote }) {
  return <Sheet title={participant.name} onClose={onClose}><p>{participant.description}</p><div className="grid2"><button className="primary" onClick={onEdit}>Modifier</button><button className="small-btn" onClick={onClose}>Fermer</button></div><h3>Suivis</h3><div className="stack">{participant.trackers.map((tracker) => <Tracker key={tracker.id} tracker={tracker} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} />)}</div><h3>États</h3><div className="statuses">{participant.statuses?.map((s) => <Status key={s.id} status={s} onRemove={() => onRemoveStatus(s.id)} />)}<button className="small-btn" onClick={onAddStatus}>+ état</button></div><label className="field">Note<textarea value={participant.note || ''} onChange={(e) => onNote(e.target.value)} /></label></Sheet>;
}
