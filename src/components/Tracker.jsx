import { useEffect, useRef, useState } from 'react';
import { applyDelta, boxVisualRank, cycleBoxMark, isTriggeredClock } from '../logic.js';

function TrackerTitle({ title, beforeTitle }) {
  return <span className="tracker-title">{beforeTitle}{title}</span>;
}

export function Tracker({ tracker, onChange, onDelete, beforeTitle = null }) {
  const [deltaOpen, setDeltaOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const deltaInputRef = useRef(null);
  const triggered = isTriggeredClock(tracker);
  const canDelta = tracker.type === 'bar' || tracker.type === 'number';
  const patch = (value) => onChange({ ...tracker, ...value });
  const step = (direction) => tracker.type !== 'boxes' && onChange(applyDelta(tracker, direction * Number(tracker.step || 1)));
  const openDelta = () => setDeltaOpen((open) => !open);
  const applyManual = () => { onChange(applyDelta(tracker, Number(delta))); setDelta(''); setDeltaOpen(false); };
  const mark = (rowId, index) => patch({ rows: tracker.rows.map((row) => row.id !== rowId ? row : { ...row, marks: row.marks.map((v, i) => i === index ? cycleBoxMark(v, tracker.fillLevels || 5) : v) }) });

  useEffect(() => {
    if (!deltaOpen) return;
    requestAnimationFrame(() => deltaInputRef.current?.focus());
  }, [deltaOpen]);

  if (tracker.type === 'clock') {
    return <div className={`tracker ${triggered ? 'triggered' : ''}`}><div className="tracker-top with-clock"><TrackerTitle title={tracker.name} beforeTitle={beforeTitle} />{tracker.auto && <span className="chip">auto</span>}{triggered && <span className="chip hot">À résoudre</span>}<div className="clock-inline"><button onClick={() => step(-1)}>−</button><Clock tracker={tracker} /><button onClick={() => step(1)}>+</button></div></div>{triggered && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => patch({ current: 0 })}>Relancer à 0</button><button className="danger-btn" onClick={onDelete}>Supprimer</button></div>}</div>;
  }

  if (tracker.type === 'boxes') {
    return <div className="tracker"><div className="tracker-top"><TrackerTitle title={tracker.name} beforeTitle={beforeTitle} /></div><Boxes tracker={tracker} mark={mark} /></div>;
  }

  return <div className={`tracker ${triggered ? 'triggered' : ''}`}><div className="tracker-top"><TrackerTitle title={tracker.name} beforeTitle={beforeTitle} />{tracker.auto && <span className="chip">auto</span>}{triggered && <span className="chip hot">À résoudre</span>}</div>{canDelta && deltaOpen && <div className="delta-pop"><input ref={deltaInputRef} type="number" inputMode="numeric" value={delta} onChange={(e) => setDelta(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applyManual()} placeholder="+50" /><button onClick={applyManual}>OK</button></div>}<div className="controls"><button onClick={() => step(-1)}>−</button><div>{tracker.type === 'bar' && <Bar tracker={tracker} onDelta={openDelta} />}{tracker.type === 'dots' && <Dots tracker={tracker} onChange={patch} />}{tracker.type === 'number' && <><div className="delta"><button onClick={openDelta}>+/-</button></div><div className="panel" style={{ borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900 }}>{tracker.current}</div></>}</div><button onClick={() => step(1)}>+</button></div>{triggered && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => patch({ current: 0 })}>Relancer à 0</button><button className="danger-btn" onClick={onDelete}>Supprimer</button></div>}</div>;
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

function Clock({ tracker }) {
  const max = Math.max(1, Number(tracker.max || 1));
  const current = Math.max(0, Number(tracker.current || 0));
  const triggered = isTriggeredClock(tracker);
  const ratio = current / max;
  const warning = !triggered && ratio >= .5;
  const near = !triggered && ratio >= .75;
  const progress = Math.max(0, Math.min(1, ratio));

  return <div className={`clock-face ${warning ? 'warning' : ''} ${near ? 'near' : ''} ${triggered ? 'triggered' : ''}`} style={{ '--clock-progress': `${progress * 360}deg` }}><span>{current}</span><small>/{max}</small></div>;
}

function Boxes({ tracker, mark }) {
  const max = tracker.fillLevels || 5;
  return <div className="boxes">{tracker.rows.map((row) => <div className="box-row" key={row.id}><div className="box-label">{row.label}</div><div className="boxes">{row.marks.map((value, i) => <button key={i} className={`box mark-${boxVisualRank(value, max)} ${boxVisualRank(value, max) >= 5 ? 'full' : ''}`} onClick={() => mark(row.id, i)} aria-label={`${row.label} case ${i + 1}`} />)}</div></div>)}</div>;
}
