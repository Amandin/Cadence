import { useState } from 'react';
import { Sheet } from './common.jsx';

const durationOptions = [
  { label: '∞', value: 'infinite' },
  { label: '1', value: '1' },
  { label: '2', value: '2' },
  { label: '3', value: '3' },
  { label: '4', value: '4' },
  { label: '5', value: '5' },
  { label: '6', value: '6' },
];

export function StatusSheet({ participant, onClose, onSave }) {
  const [name, setName] = useState('Nouveau');
  const [duration, setDuration] = useState('infinite');
  const [loop, setLoop] = useState(false);

  const finite = duration !== 'infinite';
  const save = () => {
    const cleanName = name.trim();
    if (!cleanName) return;

    onSave({ name: cleanName, duration: finite ? Number(duration) : null, loop: finite && loop });
  };

  return <Sheet title={`Ajouter un état · ${participant.name}`} onClose={onClose}><label className="field">Nom<input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></label><div className="field">Durée<div className="choice-row">{durationOptions.map((option) => <button key={option.value} className={`choice ${duration === option.value ? 'selected' : ''}`} onClick={() => setDuration(option.value)}>{option.label}</button>)}</div></div>{finite && <label className="row"><input type="checkbox" checked={loop} onChange={(e) => setLoop(e.target.checked)} /> renouveler en boucle</label>}<div className="grid2" style={{ marginTop: 12 }}><button className="primary" onClick={save} disabled={!name.trim()}>Ajouter</button><button className="small-btn" onClick={onClose}>Annuler</button></div></Sheet>;
}
