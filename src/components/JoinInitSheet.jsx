import { useState } from 'react';
import { Sheet } from './common.jsx';

export function JoinInitSheet({ participant, onClose, onSave }) {
  const [initiative, setInitiative] = useState(String(participant.initiative ?? 1));
  const valid = Number.isFinite(Number(initiative));

  return <Sheet title={`Rejoindre l’initiative · ${participant.name}`} onClose={onClose}><label className="field">Initiative<input type="number" inputMode="numeric" value={initiative} onChange={(e) => setInitiative(e.target.value)} autoFocus /></label><div className="grid2" style={{ marginTop: 12 }}><button className="primary" disabled={!valid} onClick={() => onSave(Number(initiative))}>Rejoindre</button><button className="small-btn" onClick={onClose}>Annuler</button></div></Sheet>;
}
