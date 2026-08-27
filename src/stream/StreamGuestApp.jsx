import { useEffect, useMemo, useRef, useState } from 'react';
import { streamIndicatorValue } from '../../shared/scene-stream-protocol.js';
import { t } from '../i18n/index.js';
import { applyDelta } from '../logic.js';
import { getCadenceLogo } from '../uiAssets.js';
import { useGuestStream } from './useGuestStream.js';
import './stream.css';

function number(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function boundedCurrent(indicator, current) {
  const min = Number.isFinite(Number(indicator.min)) ? Number(indicator.min) : null;
  const max = Number.isFinite(Number(indicator.max)) ? Number(indicator.max) : null;
  let next = number(current);
  const clampMinimum = indicator.type === 'bar'
    ? indicator.minAbsolute !== false
    : indicator.type !== 'number' && indicator.limitMode !== 'overflow';
  const clampMaximum = indicator.type === 'bar'
    ? indicator.maxAbsolute !== false
    : indicator.type !== 'number' && indicator.limitMode !== 'overflow';
  if (clampMinimum && min != null) next = Math.max(min, next);
  if (clampMaximum && max != null) next = Math.min(max, next);
  return next;
}

function trackerFromIndicator(indicator) {
  const value = indicator.value || {};
  if (indicator.type === 'number') {
    const currents = new Map((value.counters || []).map((counter) => [counter.id, counter.current]));
    return {
      ...indicator,
      current: value.current,
      counters: (indicator.counters || []).map((counter) => ({
        ...counter,
        current: currents.get(counter.id) ?? 0,
      })),
    };
  }
  return {
    ...indicator,
    current: value.current,
    ...(['clock', 'points'].includes(indicator.type) ? { cycles: value.cycles } : {}),
  };
}

function boundedCounterValue(counter, current) {
  let next = number(current);
  if (counter.min != null && Number.isFinite(Number(counter.min))) {
    next = Math.max(Number(counter.min), next);
  }
  if (counter.max != null && Number.isFinite(Number(counter.max))) {
    next = Math.min(Number(counter.max), next);
  }
  return next;
}

function valueAfterDelta(indicator, delta) {
  return streamIndicatorValue(applyDelta(trackerFromIndicator(indicator), delta));
}

function CommittedNumberInput({ value, version, label, disabled, onCommit }) {
  const [draft, setDraft] = useState(String(value ?? 0));
  const [focused, setFocused] = useState(false);
  const baseVersionRef = useRef(version);
  const cancelOnBlurRef = useRef(false);

  useEffect(() => {
    if (!focused) setDraft(String(value ?? 0));
  }, [focused, value]);

  const validate = () => {
    if (cancelOnBlurRef.current) {
      cancelOnBlurRef.current = false;
      setFocused(false);
      setDraft(String(value ?? 0));
      return;
    }
    const next = Number(draft);
    setFocused(false);
    if (!Number.isFinite(next)) {
      setDraft(String(value ?? 0));
      return;
    }
    if (next !== Number(value)) onCommit(next, baseVersionRef.current);
  };

  return (
    <input
      className="stream-number-input"
      type="number"
      inputMode="decimal"
      aria-label={label}
      value={draft}
      disabled={disabled}
      onFocus={() => {
        cancelOnBlurRef.current = false;
        baseVersionRef.current = version;
        setFocused(true);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={validate}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur();
        if (event.key === 'Escape') {
          cancelOnBlurRef.current = true;
          setDraft(String(value ?? 0));
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function NumericIndicator({ participantId, indicator, onChange }) {
  const current = number(indicator.value?.current);
  const step = Math.max(0.000001, Math.abs(number(indicator.step, 1)));
  const setCurrent = (next, options = {}) => onChange(participantId, indicator, {
    ...indicator.value,
    current: boundedCurrent(indicator, next),
  }, options);
  const changeCurrent = (delta) => onChange(
    participantId,
    indicator,
    valueAfterDelta(indicator, delta),
  );
  const minimum = Number(indicator.min);
  const maximum = Number(indicator.max);
  const hasGauge = indicator.type === 'bar' && Number.isFinite(minimum) && Number.isFinite(maximum) && maximum > minimum;

  return (
    <div className="stream-numeric-indicator">
      {hasGauge && (
        <div className="stream-gauge">
          <input
            type="range"
            min={minimum}
            max={maximum}
            step={step}
            value={Math.max(minimum, Math.min(maximum, current))}
            disabled={!indicator.writable}
            aria-label={indicator.name}
            onChange={(event) => setCurrent(Number(event.target.value))}
          />
          <span>{current} / {maximum}</span>
        </div>
      )}
      <div className="stream-stepper">
        <button type="button" disabled={!indicator.writable} onClick={() => changeCurrent(-step)} aria-label={`Diminuer ${indicator.name}`}>−</button>
        <CommittedNumberInput
          value={current}
          version={indicator.version}
          label={indicator.name}
          disabled={!indicator.writable}
          onCommit={(next, baseVersion) => setCurrent(next, { immediate: true, baseVersion })}
        />
        <button type="button" disabled={!indicator.writable} onClick={() => changeCurrent(step)} aria-label={`Augmenter ${indicator.name}`}>+</button>
      </div>
    </div>
  );
}

function PointsIndicator({ participantId, indicator, onChange }) {
  const maximum = Math.max(1, Math.trunc(number(indicator.max, 5)));
  const current = Math.max(0, Math.trunc(number(indicator.value?.current)));
  const visiblePoints = Math.min(maximum, 30);
  const changeCurrent = (next) => onChange(participantId, indicator, {
    ...indicator.value,
    current: Math.max(0, Math.min(maximum, next)),
  });
  const changeCycle = (delta) => onChange(
    participantId,
    indicator,
    valueAfterDelta(indicator, delta),
  );
  return (
    <div className="stream-points">
      <button type="button" disabled={!indicator.writable} onClick={() => changeCycle(-1)} aria-label={`Diminuer ${indicator.name}`}>−</button>
      <div className="stream-point-list" aria-label={`${indicator.name} : ${current} sur ${maximum}`}>
        {Array.from({ length: visiblePoints }, (_, index) => (
          <button
            type="button"
            className={index < current ? 'is-on' : ''}
            key={index}
            disabled={!indicator.writable}
            aria-pressed={index < current}
            onClick={() => changeCurrent(index + 1 === current ? index : index + 1)}
          />
        ))}
        {maximum > visiblePoints && <span>{current}/{maximum}</span>}
      </div>
      <button type="button" disabled={!indicator.writable} onClick={() => changeCycle(1)} aria-label={`Augmenter ${indicator.name}`}>+</button>
    </div>
  );
}

function NumberIndicator({ participantId, indicator, onChange }) {
  const counterValues = new Map((indicator.value?.counters || []).map((counter) => [counter.id, number(counter.current)]));
  const counters = [
    {
      id: '__main',
      label: indicator.name,
      current: number(indicator.value?.current),
      min: indicator.min,
      max: indicator.max,
    },
    ...(indicator.counters || []).map((counter) => ({ ...counter, current: counterValues.get(counter.id) ?? 0 })),
  ];
  const updateCounter = (counterId, current, options = {}) => {
    const definition = counters.find((counter) => counter.id === counterId);
    const nextCurrent = boundedCounterValue(definition || {}, current);
    const value = counterId === '__main'
      ? { ...indicator.value, current: nextCurrent }
      : {
        ...indicator.value,
        counters: (indicator.value?.counters || []).map((counter) => (
          counter.id === counterId ? { ...counter, current: nextCurrent } : counter
        )),
      };
    onChange(participantId, indicator, value, options);
  };
  return (
    <div className="stream-counter-grid">
      {counters.map((counter) => {
        const step = Math.max(0.000001, Math.abs(number(counter.step ?? indicator.step, 1)));
        return (
          <div className="stream-counter" key={counter.id}>
            <span>{counter.label}</span>
            <div className="stream-stepper">
              <button type="button" disabled={!indicator.writable} onClick={() => updateCounter(counter.id, counter.current - step)} aria-label={`Diminuer ${counter.label}`}>−</button>
              <CommittedNumberInput
                value={counter.current}
                version={indicator.version}
                label={counter.label}
                disabled={!indicator.writable}
                onCommit={(next, baseVersion) => updateCounter(counter.id, next, { immediate: true, baseVersion })}
              />
              <button type="button" disabled={!indicator.writable} onClick={() => updateCounter(counter.id, counter.current + step)} aria-label={`Augmenter ${counter.label}`}>+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BoxesIndicator({ participantId, indicator, onChange }) {
  const marks = new Map((indicator.value?.boxes || []).map((box) => [box.id, number(box.mark)]));
  const maximum = Math.max(1, Math.trunc(number(indicator.fillLevels, 1)));
  const cycle = (boxId) => {
    const value = {
      boxes: (indicator.value?.boxes || []).map((box) => (
        box.id === boxId ? { ...box, mark: (number(box.mark) + 1) % (maximum + 1) } : box
      )),
    };
    onChange(participantId, indicator, value);
  };
  return (
    <div className="stream-box-blocks">
      {(indicator.blocks || []).map((block) => (
        <section key={block.id}>
          {block.label && <h4>{block.label}</h4>}
          {(block.lines || []).map((line) => (
            <div className="stream-box-line" key={line.id}>
              <div>
                {(line.boxes || []).map((box, index) => {
                  const mark = marks.get(box.id) || 0;
                  return (
                    <button
                      type="button"
                      className={`stream-box mark-${mark}`}
                      style={{ '--stream-box-fill': `${(mark / maximum) * 100}%` }}
                      disabled={!indicator.writable}
                      aria-label={`${line.label || indicator.name}, case ${index + 1}`}
                      aria-pressed={mark > 0}
                      key={box.id}
                      onClick={() => cycle(box.id)}
                    />
                  );
                })}
              </div>
              {line.label && <span>{line.label}</span>}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function StreamIndicator({ participantId, indicator, onChange }) {
  return (
    <section className={`stream-indicator ${indicator.writable ? 'is-writable' : 'is-readonly'}`}>
      <header>
        <h3>{indicator.name}</h3>
        <span className="chip">{indicator.writable ? t('stream.guest.editable') : t('stream.guest.readOnly')}</span>
      </header>
      {indicator.type === 'boxes'
        ? <BoxesIndicator participantId={participantId} indicator={indicator} onChange={onChange} />
        : indicator.type === 'number'
          ? <NumberIndicator participantId={participantId} indicator={indicator} onChange={onChange} />
          : indicator.type === 'points'
            ? <PointsIndicator participantId={participantId} indicator={indicator} onChange={onChange} />
            : <NumericIndicator participantId={participantId} indicator={indicator} onChange={onChange} />}
    </section>
  );
}

function ParticipantCard({ participant, active, onOpen }) {
  return (
    <article className={`stream-participant-card ${active ? 'is-active' : ''}`}>
      <button type="button" className="stream-participant-open" onClick={onOpen}>
        <span className={`participant-symbol color-${participant.color || 'slate'}`}>{participant.symbol || '●'}</span>
        <span>
          <strong>{participant.name}</strong>
          <small>{participant.kind}{participant.initiative !== '' ? ` · ${participant.initiative}` : ''}</small>
        </span>
      </button>
      {participant.stats?.length > 0 && <div className="stream-quick-stats">{participant.stats.map((stat, index) => <span className="chip" key={`${stat.label}-${index}`}>{[stat.label, stat.value].filter(Boolean).join(' ')}</span>)}</div>}
      {participant.statuses?.length > 0 && <div className="stream-statuses">{participant.statuses.map((status) => <span className="chip" key={status.id}>{status.name}{status.remaining != null ? ` · ${status.remaining}` : ''}</span>)}</div>}
    </article>
  );
}

function ParticipantSheet({ participant, onChange, onClose }) {
  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return (
    <div className="overlay stream-sheet-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="panel stream-sheet" role="dialog" aria-modal="true" aria-labelledby="stream-sheet-title">
        <header>
          <div>
            <h2 id="stream-sheet-title">{participant.name}</h2>
            <p>{participant.description}</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} aria-label={t('stream.guest.close')}>×</button>
        </header>
        <div className="stream-sheet-body">
          {(participant.indicators || []).map((indicator) => (
            <StreamIndicator participantId={participant.id} indicator={indicator} onChange={onChange} key={indicator.id} />
          ))}
          {!participant.indicators?.length && <p className="muted">{t('stream.guest.readOnly')}</p>}
        </div>
      </section>
    </div>
  );
}

function PollingIndicator({ polling }) {
  const visible = polling?.mode === 'quiescent' || polling?.mode === 'suspended';
  if (!visible) return null;
  const suspended = polling.mode === 'suspended';
  const label = polling.wakePending
    ? t('stream.guest.pollingWaking')
    : suspended ? t('stream.guest.pollingSuspended') : t('stream.guest.pollingQuiescent');
  return (
    <button
      className={`stream-polling-indicator ${suspended ? 'is-suspended' : 'is-quiescent'} ${polling.wakePending ? 'is-waking' : ''}`}
      type="button"
      aria-label={`${label}. ${t('stream.guest.pollingResume')}`}
      title={`${label}. ${t('stream.guest.pollingHint')}`}
      onClick={polling.wake}
      style={{ '--stream-calm-progress': Math.max(0.35, Number(polling.calmProgress || 0)) }}
    >
      <span aria-hidden="true">{suspended ? '\u23F8' : '\u25D4'}</span>
    </button>
  );
}

function SceneHeader({ scene, status, polling }) {
  const round = scene.round < 0 ? t('stream.guest.preparation') : t('stream.guest.round', { round: scene.round });
  return (
    <header className="panel stream-scene-header">
      <div>
        <span className="stream-kicker">{scene.type}</span>
        <h1>{scene.title}</h1>
        <div className="stream-scene-meta">
          <span>{round}</span>
          {scene.phase > 1 && <span>{t('stream.guest.phase', { phase: scene.phase })}</span>}
        </div>
      </div>
      <div className="stream-header-statuses">
        <PollingIndicator polling={polling} />
        <span className={`stream-live-status status-${status}`}><i />{status === 'live' ? t('stream.guest.live') : t('stream.guest.reconnecting')}</span>
      </div>
    </header>
  );
}

export default function StreamGuestApp({ token }) {
  const stream = useGuestStream(token);
  const [selectedId, setSelectedId] = useState('');
  const [dark, setDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  const scene = stream.view?.scene || null;
  const allParticipants = useMemo(() => scene ? [...(scene.participants || []), ...(scene.reserve || [])] : [], [scene]);
  const selected = allParticipants.find((participant) => participant.id === selectedId) || null;

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const update = () => setDark(!!query?.matches);
    query?.addEventListener?.('change', update);
    return () => query?.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    root.dataset.mode = dark ? 'dark' : 'light';
    return () => {
      root.classList.remove('dark');
      delete root.dataset.mode;
    };
  }, [dark]);

  useEffect(() => {
    if (selectedId && !allParticipants.some((participant) => participant.id === selectedId)) setSelectedId('');
  }, [allParticipants, selectedId]);

  const openParticipant = (participantId) => {
    if (selectedId && selectedId !== participantId) void stream.flushAll();
    setSelectedId(participantId);
  };
  const closeParticipant = () => {
    void stream.flushAll();
    setSelectedId('');
  };

  if (stream.status === 'loading') {
    return <main className={`stream-app ${dark ? 'dark' : ''}`}><div className="panel stream-state"><img src={getCadenceLogo(dark)} alt="Cadence" /><p>{t('stream.guest.loading')}</p></div></main>;
  }
  if (stream.status === 'unavailable') {
    return <main className={`stream-app ${dark ? 'dark' : ''}`}><div className="panel stream-state"><img src={getCadenceLogo(dark)} alt="Cadence" /><h1>{t('stream.guest.brand')}</h1><p>{t('stream.guest.unavailable')}</p></div></main>;
  }
  if (stream.status === 'paused') {
    return <main className={`stream-app ${dark ? 'dark' : ''}`}><div className="panel stream-state"><img src={getCadenceLogo(dark)} alt="Cadence" /><h1>{t('stream.guest.brand')}</h1><p>{t('stream.guest.paused')}</p><button className="primary" type="button" onClick={() => window.location.reload()}>{t('stream.guest.retry')}</button></div></main>;
  }
  if (!scene) {
    return <main className={`stream-app ${dark ? 'dark' : ''}`}><div className="panel stream-state"><img src={getCadenceLogo(dark)} alt="Cadence" /><h1>{t('stream.guest.brand')}</h1><p>{stream.status === 'offline' ? t('stream.guest.offline') : t('stream.guest.waiting')}</p></div></main>;
  }

  return (
    <main className={`stream-app ${dark ? 'dark' : ''}`}>
      <nav className="stream-brand"><img src={getCadenceLogo(dark)} alt="Cadence" /><span>{t('stream.guest.brand')}</span></nav>
      <SceneHeader scene={scene} status={stream.status} polling={stream.polling} />
      {stream.status === 'offline' && <p className="stream-network-message" role="status">{t('stream.guest.offline')}</p>}
      {stream.message === 'conflict' && <p className="stream-network-message is-conflict" role="status">{t('stream.guest.conflict')}</p>}
      {stream.message === 'write-error' && <p className="stream-network-message" role="status">{t('stream.guest.writeError')}</p>}
      {stream.message === 'write-refused' && <p className="stream-network-message is-conflict" role="status">{t('stream.guest.writeRefused')}</p>}
      {stream.message === 'rate-limited' && <p className="stream-network-message" role="status">{t('stream.guest.rateLimited')}</p>}
      {scene.globalIndicator && <section className="panel stream-global-indicator"><span>{scene.globalIndicator.name}</span><strong>{scene.globalIndicator.current} / {scene.globalIndicator.max}</strong></section>}
      {scene.statuses?.length > 0 && <div className="stream-statuses scene-statuses">{scene.statuses.map((status) => <span className="chip" key={status.id}>{status.name}{status.remaining != null ? ` · ${status.remaining}` : ''}</span>)}</div>}

      <section className="stream-participant-section">
        <div className="stream-participant-grid">
          {(scene.participants || []).map((participant) => <ParticipantCard participant={participant} active={scene.activeId === participant.id} onOpen={() => openParticipant(participant.id)} key={participant.id} />)}
        </div>
        {!scene.participants?.length && !scene.reserve?.length && <p className="panel stream-empty">{t('stream.guest.noParticipants')}</p>}
      </section>
      {scene.reserve?.length > 0 && <section className="stream-participant-section"><h2>{t('stream.guest.reserve')}</h2><div className="stream-participant-grid">{scene.reserve.map((participant) => <ParticipantCard participant={participant} active={false} onOpen={() => openParticipant(participant.id)} key={participant.id} />)}</div></section>}
      {selected && <ParticipantSheet participant={selected} onChange={stream.changeIndicator} onClose={closeParticipant} />}
    </main>
  );
}
