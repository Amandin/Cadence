import { useState } from 'react';
import { isVisible } from '../logic.js';
import { Avatar, Status } from './common.jsx';
import { Tracker } from './Tracker.jsx';

export function ReserveCard({ participant, onJoin, onOpen, onTracker, onDeleteTracker, onAddStatus, onRemoveStatus }) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleTrackers = (participant.trackers || []).filter(isVisible);

  return (
    <div className={`card reserve-card ${collapsed ? 'collapsed' : ''}`} data-participant-id={participant.id}>
      <div className="card-head">
        <button className="icon-btn collapse-btn" onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{collapsed ? '⌄' : '⌃'}</button>
        <button className="card-main" onClick={onOpen}>
          <Avatar participant={participant} />
          <div className="info">
            <strong>{participant.name}</strong>
            <div className="muted">{participant.description}</div>
          </div>
        </button>
        <button className="small-btn" onClick={onJoin}>Rejoindre init</button>
      </div>
      {!collapsed && (
        <div className="trackers">
          {visibleTrackers.map((tracker) => (
            <Tracker key={tracker.id} tracker={tracker} onChange={(next) => onTracker(tracker.id, next)} onDelete={() => onDeleteTracker(tracker.id)} />
          ))}
          <div className="statuses">
            {participant.statuses?.map((status) => <Status key={status.id} status={status} onRemove={() => onRemoveStatus(status.id)} />)}
            <button className="small-btn" onClick={onAddStatus}>+ état</button>
          </div>
        </div>
      )}
    </div>
  );
}
