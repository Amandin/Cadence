import { useEffect, useRef, useState } from 'react';
import { applyDelta, boxVisualRank, cycleBoxMark, isTriggeredClock } from '../../logic.js';

function TitreSuivi({ titre, avantTitre }) {
  return <span className="tracker-title">{avantTitre}{titre}</span>;
}

function IconeMetronome() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="metronome-icon">
      <path d="M8 21h8l-2.4-14h-3.2L8 21Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 7V3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M12 12l4-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.4 18h5.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Suivi({ suivi, onModifier, onSupprimer, avantTitre = null }) {
  const [deltaOuvert, setDeltaOuvert] = useState(false);
  const [delta, setDelta] = useState('');
  const champDeltaRef = useRef(null);
  const declenche = isTriggeredClock(suivi);
  const accepteDelta = suivi.type === 'bar' || suivi.type === 'number';
  const modifier = (valeur) => onModifier({ ...suivi, ...valeur });
  const appliquerPas = (direction) => suivi.type !== 'boxes' && onModifier(applyDelta(suivi, direction * Number(suivi.step || 1)));
  const ouvrirDelta = () => setDeltaOuvert((ouvert) => !ouvert);
  const appliquerDeltaManuel = () => { onModifier(applyDelta(suivi, Number(delta))); setDelta(''); setDeltaOuvert(false); };
  const cocherCase = (ligneId, index) => modifier({ rows: suivi.rows.map((ligne) => ligne.id !== ligneId ? ligne : { ...ligne, marks: ligne.marks.map((valeur, i) => i === index ? cycleBoxMark(valeur, suivi.fillLevels || 5) : valeur) }) });

  useEffect(() => {
    if (!deltaOuvert) return;
    requestAnimationFrame(() => champDeltaRef.current?.focus());
  }, [deltaOuvert]);

  if (suivi.type === 'clock') {
    return <div className={`tracker ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`}><div className="tracker-top clock-top"><div className="clock-title-zone"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} />{suivi.auto && <span className="chip">auto</span>}{suivi.frozen && <span className="chip">figé</span>}{declenche && <span className="chip hot">À résoudre</span>}</div><div className="clock-inline"><button onClick={() => appliquerPas(-1)}>−</button><HorlogeSuivi suivi={suivi} /><button onClick={() => appliquerPas(1)}>+</button></div><button className={`freeze-btn ${suivi.frozen ? 'active' : ''}`} onClick={() => modifier({ frozen: !suivi.frozen })} title={suivi.frozen ? 'Dégeler cette horloge' : 'Figer cette horloge'} aria-label={suivi.frozen ? 'Dégeler cette horloge' : 'Figer cette horloge'}><IconeMetronome /></button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>Relancer à 0</button><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
  }

  if (suivi.type === 'boxes') {
    return <div className="tracker"><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} /></div><CasesSuivi suivi={suivi} cocher={cocherCase} /></div>;
  }

  return <div className={`tracker ${declenche ? 'triggered' : ''}`}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} />{suivi.auto && <span className="chip">auto</span>}{declenche && <span className="chip hot">À résoudre</span>}</div>{accepteDelta && deltaOuvert && <div className="delta-pop"><input ref={champDeltaRef} type="number" inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && appliquerDeltaManuel()} placeholder="+50" /><button onClick={appliquerDeltaManuel}>OK</button></div>}<div className="controls"><button onClick={() => appliquerPas(-1)}>−</button><div>{suivi.type === 'bar' && <BarreSuivi suivi={suivi} onDelta={ouvrirDelta} />}{suivi.type === 'dots' && <PointsSuivi suivi={suivi} onModifier={modifier} />}{suivi.type === 'number' && <><div className="delta"><button onClick={ouvrirDelta}>+/-</button></div><div className="panel" style={{ borderRadius: 14, padding: 10, textAlign: 'center', fontWeight: 900 }}>{suivi.current}</div></>}</div><button onClick={() => appliquerPas(1)}>+</button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>Relancer à 0</button><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
}

function BarreSuivi({ suivi, onDelta }) {
  const max = Number(suivi.max || 1), min = Number(suivi.min ?? 0), courant = Number(suivi.current || 0), amplitude = Math.max(1, max - min);
  const ratio = Math.max(0, Math.min(1, (courant - min) / amplitude));
  const depassement = Math.max(0, courant - max) / Math.max(1, max), manque = Math.max(0, min - courant) / Math.max(1, Math.abs(min) || max);
  const classeRemplissage = courant / max <= .25 ? 'danger' : courant / max <= .5 ? 'warn' : '';

  return <><div className="delta"><button onClick={onDelta}>+/-</button></div><div className="bar-bg"><div className={`bar-fill ${classeRemplissage}`} style={{ width: `${ratio * 100}%` }} />{depassement > 0 && <div className="bar-over" style={{ width: `${Math.min(100, Math.max(8, depassement * 100))}%` }} />}{manque > 0 && <div className="bar-under" style={{ width: `${Math.min(100, Math.max(8, manque * 100))}%` }} />}</div><div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3 }}><span>{min}</span><span>{courant}/{max}</span><span>±{suivi.step || 1}</span></div></>;
}

function PointsSuivi({ suivi, onModifier }) {
  return <div className="dots">{Array.from({ length: suivi.max }).map((_, i) => <button key={i} className={`dot ${i < suivi.current ? 'on' : ''}`} onClick={() => onModifier({ current: i + 1 === suivi.current ? i : i + 1 })} />)}</div>;
}

function HorlogeSuivi({ suivi }) {
  const max = Math.max(1, Number(suivi.max || 1));
  const courant = Math.max(0, Number(suivi.current || 0));
  const declenche = isTriggeredClock(suivi);
  const ratio = courant / max;
  const attention = !declenche && ratio >= .5;
  const proche = !declenche && ratio >= .75;
  const progression = Math.max(0, Math.min(1, ratio));

  return <div className={`clock-face ${attention ? 'warning' : ''} ${proche ? 'near' : ''} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={{ '--clock-progress': `${progression * 360}deg` }}><span>{courant}</span><small>/{max}</small></div>;
}

function CasesSuivi({ suivi, cocher }) {
  const max = suivi.fillLevels || 5;
  return <div className="boxes">{suivi.rows.map((ligne) => <div className="box-row" key={ligne.id}><div className="box-label">{ligne.label}</div><div className="boxes">{ligne.marks.map((valeur, i) => <button key={i} className={`box mark-${boxVisualRank(valeur, max)} ${boxVisualRank(valeur, max) >= 5 ? 'full' : ''}`} onClick={() => cocher(ligne.id, i)} aria-label={`${ligne.label} case ${i + 1}`} />)}</div></div>)}</div>;
}
