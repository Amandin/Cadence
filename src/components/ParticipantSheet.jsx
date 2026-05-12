import { Status, Sheet } from './common.jsx';
import { Tracker } from './Tracker.jsx';

export function ParticipantSheet({ participant, onClose, onEdit, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus, onNote }) {
  const toggleVisible = (tracker) => onTracker(tracker.id, { ...tracker, visible: tracker.visible === false });
  const eye = (tracker) => <button className={`eye-toggle ${tracker.visible !== false ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleVisible(tracker); }} aria-label={tracker.visible === false ? 'Afficher sur la fichette' : 'Masquer sur la fichette'}>◉</button>;

  return <Sheet title={participant.name} onClose={onClose}><p>{participant.description}</p><div className="grid2"><button className="primary" onClick={onEdit}>Modifier</button><button className="small-btn" onClick={onClose}>Fermer</button></div><h3>Suivis</h3><div className="stack">{participant.trackers.map((tracker) => <div className={`tracker-sheet-row ${tracker.visible === false ? 'hidden-on-card' : ''}`} key={tracker.id}><Tracker tracker={tracker} beforeTitle={eye(tracker)} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} /></div>)}</div><h3>États</h3><div className="statuses">{participant.statuses?.map((s) => <Status key={s.id} status={s} onRemove={() => onRemoveStatus(s.id)} />)}<button className="small-btn" onClick={onAddStatus}>+ état</button></div><label className="field">Note<textarea value={participant.note || ''} onChange={(e) => onNote(e.target.value)} /></label></Sheet>;
}
