import { Sheet } from './common.jsx';

const FALLBACK_TRACKER = {
  enabled: false,
  name: 'Menace',
  mode: 'clock',
  current: 0,
  max: 10,
  auto: false,
};

export function GlobalTracker({ tracker, onStep, onOpen, tick }) {
  if (!tracker?.enabled) return null;

  const max = Math.max(1, Number(tracker.max || 10));
  const current = Math.max(0, Number(tracker.current || 0));
  const overflowing = current > max;
  const overflow = Math.max(0, current - max);
  const overflowRemainder = overflow % max;
  const overflowRatio = overflowing ? (overflowRemainder === 0 ? 1 : overflowRemainder / max) : 0;
  const completedCycles = overflowing ? Math.floor(current / max) : 0;
  const fullCycle = current >= max && current % max === 0;
  const progress = overflowing ? 1 : Math.min(1, current / max);

  return (
    <div className={`global-mini ${tracker.auto ? 'auto-active' : ''} ${tick ? 'auto-tick' : ''} ${fullCycle ? 'cycle-complete' : ''} ${overflowing ? 'overflowing' : ''}`}>
      <button onClick={(event) => { event.stopPropagation(); onStep(-1); }}>−</button>
      <div className="global-mini-main">
        <span>{tracker.name || 'Menace'}</span>
        <button
          className={`clock-face global-clock ${tracker.mode === 'counter' ? 'counter-mode' : ''} ${fullCycle ? 'cycle-complete' : ''} ${overflowing ? 'overflowing' : ''}`}
          style={{ '--clock-progress': `${progress * 360}deg`, '--overflow-progress': `${overflowRatio * 360}deg` }}
          onClick={onOpen}
          aria-label="Gérer le compteur de scène"
        >
          <span>{current}</span>
          {tracker.mode === 'clock' && <small>/{max}</small>}
        </button>
        {overflowing && <em className="overflow-badge">×{completedCycles}</em>}
        {tick && <em className="auto-plus">+1</em>}
      </div>
      <button onClick={(event) => { event.stopPropagation(); onStep(1); }}>+</button>
    </div>
  );
}

export function GlobalTrackerSheet({ tracker, onChange, onStep, onClose }) {
  const current = { ...FALLBACK_TRACKER, ...(tracker || {}) };
  const patch = (value) => onChange({ ...current, ...value });

  return (
    <Sheet title="Compteur de scène" onClose={onClose}>
      <div className="stack">
        <label className="row"><input type="checkbox" checked={!!current.enabled} onChange={(event) => patch({ enabled: event.target.checked })} /> actif dans l’entête</label>
        <label className="field">Nom<input value={current.name || ''} onChange={(event) => patch({ name: event.target.value })} placeholder="Menace" /></label>
        <div className="grid2">
          <label className="field">Type<select value={current.mode || 'clock'} onChange={(event) => patch({ mode: event.target.value })}><option value="clock">Horloge</option><option value="counter">Compteur</option></select></label>
          <label className="field">Valeur<input type="number" inputMode="numeric" value={current.current ?? 0} onChange={(event) => patch({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>
        </div>
        <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={current.max ?? 10} onChange={(event) => patch({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>
        <label className="row"><input type="checkbox" checked={!!current.auto} onChange={(event) => patch({ auto: event.target.checked })} /> avance automatiquement à chaque nouveau round</label>
        <div className="grid2"><button className="small-btn" onClick={() => onStep(-1)}>−1</button><button className="small-btn" onClick={() => onStep(1)}>+1</button></div>
      </div>
    </Sheet>
  );
}
