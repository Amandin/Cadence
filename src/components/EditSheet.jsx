import { useState } from 'react';
import { colorNames, participantKinds, trackerTypeLabels } from '../constants.js';
import { boxVisualRank, clone, colors, isVisible, newTracker, symbols, uid } from '../logic.js';
import { Sheet } from './common.jsx';

function toPositive(value, fallback = 1) {
  if (value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? Math.max(1, next) : fallback;
}

function toNumber(value, fallback = 0) {
  if (value === '') return fallback;
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function normalizeDraft(draft) {
  return {
    ...draft,
    initiative: toNumber(draft.initiative, 0),
    trackers: draft.trackers.map((tracker) => {
      if (tracker.type === 'boxes') return { ...tracker, fillLevels: toPositive(tracker.fillLevels, 5), rows: tracker.rows.map((row) => ({ ...row, marks: row.marks?.length ? row.marks : [0] })) };
      return {
        ...tracker,
        current: toNumber(tracker.current, 0),
        max: tracker.max === null ? null : toPositive(tracker.max, 1),
        min: tracker.min === null ? null : toNumber(tracker.min, 0),
        step: toPositive(tracker.step, 1),
      };
    }),
  };
}

function shrinkMarks(marks = []) {
  return marks.length > 1 ? marks.slice(0, -1) : marks;
}

function growMarks(marks = []) {
  return [...marks, 0];
}

function BoxPreview({ marks, levels }) {
  const max = toPositive(levels, 5);
  return <div className="boxes-preview">{marks.map((value, index) => <span key={index} className={`box preview mark-${boxVisualRank(value, max)} ${boxVisualRank(value, max) >= 5 ? 'full' : ''}`} />)}</div>;
}

function LevelsPreview({ levels }) {
  const max = toPositive(levels, 5);
  const marks = Array.from({ length: max }, (_, index) => index + 1);
  return <div className="levels-preview">{marks.map((value) => <span key={value} className={`box preview mark-${boxVisualRank(value, max)} ${boxVisualRank(value, max) >= 5 ? 'full' : ''}`} />)}</div>;
}

function BoxesEditor({ tracker, onChange }) {
  const rows = tracker.rows?.length ? tracker.rows : [{ id: uid('r'), label: 'Ligne', marks: [0, 0, 0, 0] }];
  const fillLevelsValue = toPositive(tracker.fillLevels, 5);
  const patch = (value) => onChange({ ...tracker, ...value, rows });
  const updateRow = (rowId, updater) => onChange({ ...tracker, rows: rows.map((row) => row.id === rowId ? updater(row) : row) });
  const addRow = () => onChange({ ...tracker, rows: [...rows, { id: uid('r'), label: `Ligne ${rows.length + 1}`, marks: [0, 0, 0, 0] }] });
  const removeRow = (rowId) => onChange({ ...tracker, rows: rows.length > 1 ? rows.filter((row) => row.id !== rowId) : rows });
  const changeLevels = (delta) => patch({ fillLevels: Math.max(1, Math.min(5, fillLevelsValue + delta)) });

  return <div className="box-editor"><div className="line-count-row"><label>Lignes</label><strong>{rows.length}</strong><button className="small-btn" onClick={addRow}>+ ligne</button></div><div className="box-level-row"><span>États par case</span><button className="small-btn" onClick={() => changeLevels(-1)} disabled={fillLevelsValue <= 1}>−</button><LevelsPreview levels={fillLevelsValue} /><button className="small-btn" onClick={() => changeLevels(1)} disabled={fillLevelsValue >= 5}>+</button></div><p className="muted" style={{ marginTop: -2, fontSize: 12 }}>Les niveaux retirés disparaissent dans l’ordre 3, 4, puis 1.</p><div className="stack">{rows.map((row) => <div className="box-edit-row" key={row.id}><div className="box-line-name"><label>Nom de ligne</label><input value={row.label} onChange={(e) => updateRow(row.id, (current) => ({ ...current, label: e.target.value }))} /><button className="small-btn subtle-danger" onClick={() => removeRow(row.id)} disabled={rows.length <= 1}>Suppr.</button></div><div className="box-count-row"><span>Cases</span><button className="small-btn" onClick={() => updateRow(row.id, (current) => ({ ...current, marks: shrinkMarks(current.marks || []) }))} disabled={(row.marks || []).length <= 1}>−</button><BoxPreview marks={row.marks || []} levels={fillLevelsValue} /><button className="small-btn" onClick={() => updateRow(row.id, (current) => ({ ...current, marks: growMarks(current.marks || []) }))}>+</button></div></div>)}</div></div>;
}

function NumberField({ label, value, onChange, allowBlank = false }) {
  return <label className="field">{label}<input type="number" inputMode="numeric" value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? (allowBlank ? '' : '') : Number(e.target.value))} /></label>;
}

function TrackerEditor({ tracker, onChange, onDelete }) {
  const patch = (value) => onChange({ ...tracker, ...value });

  return <div className="tracker"><div className="tracker-edit-head"><input value={tracker.name} onChange={(e) => patch({ name: e.target.value })} aria-label="Nom du suivi" /><select value={tracker.type} aria-label="Type de suivi" onChange={(e) => onChange({ ...newTracker(e.target.value), id: tracker.id, name: tracker.name })}>{Object.entries(trackerTypeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="danger-btn compact-danger" onClick={onDelete}>×</button></div><div className="grid2">{tracker.type !== 'boxes' && <NumberField label="Valeur" value={tracker.current ?? 0} onChange={(value) => patch({ current: value })} />}{tracker.type !== 'number' && tracker.type !== 'boxes' && <NumberField label="Maximum" value={tracker.max ?? 1} onChange={(value) => patch({ max: value })} />}{(tracker.type === 'bar' || tracker.type === 'number') && <NumberField label="Minimum" value={tracker.min ?? 0} onChange={(value) => patch({ min: value })} />}{(tracker.type === 'bar' || tracker.type === 'number') && <NumberField label="Pas" value={tracker.step ?? 1} onChange={(value) => patch({ step: value })} />}</div><label className="row"><input type="checkbox" checked={isVisible(tracker)} onChange={(e) => patch({ visible: e.target.checked })} /> visible sur fichette</label>{tracker.type === 'bar' && <div className="grid2"><label className="row"><input type="checkbox" checked={!!tracker.minAbsolute} onChange={(e) => patch({ minAbsolute: e.target.checked })} /> min absolu</label><label className="row"><input type="checkbox" checked={!!tracker.maxAbsolute} onChange={(e) => patch({ maxAbsolute: e.target.checked })} /> max absolu</label></div>}{tracker.type === 'clock' && <label className="row"><input type="checkbox" checked={!!tracker.auto} onChange={(e) => patch({ auto: e.target.checked })} /> avance automatique</label>}{tracker.type === 'boxes' && <BoxesEditor tracker={tracker} onChange={onChange} />}</div>;
}

export function EditSheet({ participant, onClose, onSave, onDelete }) {
  const [draft, setDraft] = useState(clone(participant));
  const patch = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  const updateTracker = (id, next) => setDraft((d) => ({ ...d, trackers: d.trackers.map((t) => t.id === id ? next : t) }));

  return <Sheet title="Modifier" onClose={onClose}><label className="field">Nom<input value={draft.name} onChange={(e) => patch('name', e.target.value)} /></label><label className="field">Description<textarea value={draft.description || ''} onChange={(e) => patch('description', e.target.value)} /></label><div className="grid2"><label className="field">Type<select value={draft.kind} onChange={(e) => patch('kind', e.target.value)}>{participantKinds.map((k) => <option key={k}>{k}</option>)}</select></label><NumberField label="Initiative" value={draft.initiative} onChange={(value) => patch('initiative', value)} /></div><label className="field">Symbole<div className="statuses">{symbols.map((s) => <button key={s} className="small-btn" onClick={() => patch('symbol', s)}>{s}</button>)}</div></label><label className="field">Couleur<div className="statuses">{colors.map((c) => <button key={c} className="small-btn" onClick={() => patch('color', c)}>{colorNames[c] || c}</button>)}</div></label><h3>Suivis</h3><div className="stack">{draft.trackers.map((tracker) => <TrackerEditor key={tracker.id} tracker={tracker} onChange={(next) => updateTracker(tracker.id, next)} onDelete={() => setDraft((d) => ({ ...d, trackers: d.trackers.filter((t) => t.id !== tracker.id) }))} />)}<button className="primary" onClick={() => setDraft((d) => ({ ...d, trackers: [...d.trackers, newTracker('bar')] }))}>Ajouter un suivi</button></div><div className="grid2" style={{ marginTop: 12 }}><button className="primary" onClick={() => onSave(normalizeDraft(draft))}>Valider</button><button className="danger-btn" onClick={onDelete}>Supprimer la fiche</button></div></Sheet>;
}
