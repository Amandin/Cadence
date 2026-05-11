import { useState } from 'react';
import { applyDelta, boxSymbol, cycleBoxMark, isTriggeredClock } from '../logic.js';

export function Tracker({ tracker, onChange, onDelete }) {
  const [deltaOpen, setDeltaOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const triggered = isTriggeredClock(tracker);
  const canDelta = tracker.type === 'bar' || tracker.type === 'number';
  const patch = (value) => onChange({ ...tracker, ...value });
  const step = (direction) => tracker.type !== 'boxes' && onChange(applyDelta(tracker, direction * Number(tracker.step || 1)));
  const applyManual = () => { onChange(applyDelta(tracker, Number(delta))); setDelta(''); setDeltaOpen(false); };
  const mark = (rowId, index) => patch({ rows: tracker.rows.map((row) => row.id !== rowId ? row : { ...row, marks: row.marks.map((v, i) => i === index ? cycleBoxMark(v, tracker.fillLevels || 3) : v) }) });

  return <div className={`tracker ${triggered ? 'triggered' : ''}`}><div className="tracker-top"><span>{tracker.name}</span>{tracker.auto && <span className="chip">auto</span>}{triggered && <span className="chip hot">À résoudre</span>}</div>{canDelta && deltaOpen && <div className="delta-pop"><input value={delta} onChange={(e) => setDelta(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyManual()} placeholder="+50" /><button onClick={applyManual}>OK</button></div>}<div className="controls"><button onClick={() => step(-1)}>−</button><div>{tracker.type === 'bar' && <Bar tracker={tracker} onDelta={() => setDeltaOpen(!deltaOpen)} />}{tracker.type === 'dots' && <Dots tracker={tracker} onChange={patch} />}{tracker.type === 'clock' && <Clock tracker={tracker} onChange={patch} />}{tracker.type === 'boxes' && <Boxes tracker={tracker} mark={mark} />}{tracker.type === 'number' && <><div className="delta"><button onClick={() => setDeltaOpen(!deltaOpen)}>+/-</button></div><div className="panel" style={{ borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900 }}>{tracker.current}</div></>}</div><button onClick={() => step(1)}>+</button></div>{triggered && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => patch({ current: 0 })}>Relancer à 0</button><button className="danger-btn" onClick={onDelete}>Supprimer</button></div>}</div>;
}

function Bar({ tracker, onDelta }) {
  const max = Number(tracker.max || 1), min = Number(tracker.min ?? 0), current = Number(tracker.current || 0), span = Math.max(1, max - min);
  const ratio = Math.max(0, Math.min(1, (current - min) / span));
  const over = Math.max(0, current - max) / Math.max(1, max), under = Math.max(0, min - current) / Math.max(1, Math.abs(min) || max);
  const fillClass = current / max <= .25 ? 'danger' : current / max <= .5 ? 'warn' : '';

  return <><div className="delta"><button onClick={onDelta}>+/-</button></div><div className="bar-bg"><div className={`bar-fill ${fillClass}`} style={{ width: `${ratio * 100}%` }} />{over > 0 && <div className="bar-over" style={{ width: `${Math.min(100, Math.max(8, over * 100))}%` }} />}{under > 0 && <div className="bar-under" style={{ width: `${Math.min(100, Math.max(8, under * 100))}%` }} />}</div><div className="muted" style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginTop:3 }}><span>{min}</span><span>{current}/{max}</span><span>±{tracker.step || 1}</span></div></>;
}

function Dots({ tracker, onChange }) {
  return <div className="dots">{Array.from({ length: tracker.max }).map((_, i) => <button key={i} className={`dot ${i < tracker.current ? 'on' : ''}`} onClick={() => onChange({ current: i + 1 === tracker.current ? i : i + 1 })} />)}</div>;
}

function Clock({ tracker, onChange }) {
  const triggered = isTriggeredClock(tracker);
  return <div className="clock">{Array.from({ length: tracker.max }).map((_, i) => <button key={i} className={`seg ${i < tracker.current ? 'on' : ''} ${triggered ? 'triggered' : ''}`} onClick={() => onChange({ current: i + 1 === tracker.current ? i : i + 1 })} />)}</div>;
}

function Boxes({ tracker, mark }) {
  const max = tracker.fillLevels || 3;
  return <div className="boxes">{tracker.rows.map((row) => <div className="box-row" key={row.id}><div className="box-label">{row.label}</div><div className="boxes">{row.marks.map((value, i) => <button key={i} className={`box ${value >= max ? 'full' : ''}`} onClick={() => mark(row.id, i)}>{boxSymbol(value, max)}</button>)}</div></div>)}</div>;
}
