import { useState } from 'react';
import { hasTriggeredClock, isVisible } from '../logic.js';
import { Avatar, Status, colorToAccent } from './common.jsx';
import { Tracker } from './Tracker.jsx';

function hasOperationalContent(participant, visibleTrackers) {
  return visibleTrackers.length > 0 || (participant.statuses || []).length > 0;
}

export function ParticipantCard({ participant, active, onOpen, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus, onLeaveInit }) {
  const [collapsed, setCollapsed] = useState(false);
  const triggered = hasTriggeredClock(participant);
  const visibleTrackers = participant.trackers.filter(isVisible);
  const operational = hasOperationalContent(participant, visibleTrackers);
  const shouldLeaveInit = !operational;

  return <article data-participant-id={participant.id} className={`card ${active ? 'active' : ''} ${triggered ? 'triggered' : ''} ${collapsed ? 'collapsed' : ''}`} style={{ '--accent': colorToAccent(participant.color) }}><div className="card-head"><button className="icon-btn collapse-btn" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{collapsed ? '⌄' : '⌃'}</button><button className="card-main" onClick={onOpen}><Avatar participant={participant} /><div className="info"><div className="name-line"><strong>{participant.name}</strong>{active && <span className="chip">Tour actif</span>}{triggered && <span className="chip hot">À résoudre</span>}{shouldLeaveInit && <span className="chip hot">Aucun suivi</span>}</div><div className="muted">{participant.description}</div><div className="name-line" style={{ marginTop: 6 }}><span className="chip">{participant.kind}</span><span className="chip">Init {participant.initiative}</span>{participant.stats?.map((s) => <span className="chip" key={s}>{s}</span>)}</div></div></button><button className={`small-btn ${shouldLeaveInit ? 'suggested' : ''}`} onClick={onLeaveInit}>{shouldLeaveInit ? 'Sortir de l’initiative' : 'Quitter l’init'}</button></div><div className="trackers">{visibleTrackers.map((tracker) => <Tracker key={tracker.id} tracker={tracker} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} />)}<div className="statuses">{participant.statuses?.map((s) => <Status key={s.id} status={s} onRemove={() => onRemoveStatus(s.id)} />)}<button className="small-btn" onClick={onAddStatus}>+ état</button></div></div></article>;
}
