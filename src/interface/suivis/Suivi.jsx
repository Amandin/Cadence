import { useEffect, useRef, useState } from 'react';
import { activeThresholds, applyDelta, boxGroups, boxVisualRank, cycleBoxMark, isTriggeredClock, sortBoxGroups } from '../../logic.js';

function TitreSuivi({ titre, avantTitre, suffixe = null }) {
  return <span className="tracker-title">{avantTitre}{titre}{suffixe}</span>;
}

const thresholdGlowColors = {
  neutral: '#94a3b8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

function styleSeuils(seuils) {
  if (!seuils.length) return {};
  return {
    '--threshold-a': thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
    '--threshold-b': thresholdGlowColors[seuils[1]?.color] || thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
  };
}

function SeuilsActifs({ seuils }) {
  if (!seuils.length) return null;
  return <span className="threshold-chip-row">{seuils.map((seuil, index) => <span className={`threshold-chip threshold-${seuil.color || 'neutral'}`} key={`${seuil.label}-${index}`}>{seuil.label}</span>)}</span>;
}

function IconeMetronome({ fige = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="metronome-icon">
      <path d="M8 21h8l-2.4-14h-3.2L8 21Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="M12 7V3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <path d={fige ? 'M12 13V7' : 'M12 12l4-3'} fill="none" stroke="currentColor" strokeWidth={fige ? '2.1' : '2.8'} strokeLinecap="round" />
      <path d="M9.4 18h5.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Suivi({ suivi, onModifier, onSupprimer, avantTitre = null, couleur = 'slate' }) {
  const [deltaOuvert, setDeltaOuvert] = useState(false);
  const [delta, setDelta] = useState('');
  const champDeltaRef = useRef(null);
  const declenche = isTriggeredClock(suivi);
  const seuils = activeThresholds(suivi) || [];
  const classeSeuils = seuils.length ? 'threshold-glow' : '';
  const styleSeuil = styleSeuils(seuils);
  const accepteDelta = suivi.type === 'bar';
  const cyclesPuces = Number(suivi.cycles ?? suivi.cyclesInitial ?? 0) || 0;
  const suffixePuces = (suivi.type === 'points' || suivi.type === 'dots') && suivi.limitMode === 'loop'
    ? <span className={`title-counter color-${couleur || 'slate'}`}>{cyclesPuces}</span>
    : null;
  const estPuces = suivi.type === 'points' || suivi.type === 'dots';
  const modifier = (valeur) => onModifier({ ...suivi, ...valeur });
  const appliquerPas = (direction) => suivi.type !== 'boxes' && onModifier(applyDelta(suivi, direction * Number(suivi.step || 1)));
  const ouvrirDelta = () => setDeltaOuvert((ouvert) => !ouvert);
  const appliquerDeltaManuel = () => { onModifier(applyDelta(suivi, Number(delta))); setDelta(''); setDeltaOuvert(false); };
  const cocherCase = (groupeId, ligneId, index) => {
    const groups = boxGroups(suivi).map((groupe) => groupe.id !== groupeId ? groupe : {
      ...groupe,
      rows: groupe.rows.map((ligne) => ligne.id !== ligneId ? ligne : {
        ...ligne,
        marks: ligne.marks.map((valeur, i) => i === index ? cycleBoxMark(valeur, suivi.fillLevels || 5) : valeur),
      }),
    });
    modifier({ groups: sortBoxGroups(groups), rows: undefined, boxMode: 'sorted' });
  };

  useEffect(() => {
    if (!deltaOuvert) return;
    requestAnimationFrame(() => champDeltaRef.current?.focus());
  }, [deltaOuvert]);

  if (suivi.type === 'clock') {
    return <div className={`tracker ${classeSeuils} ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={styleSeuil}><div className="tracker-top clock-top"><div className="clock-title-zone"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} /><SeuilsActifs seuils={seuils} />{suivi.frozen && <span className="chip">fige</span>}{declenche && <span className="chip hot">A resoudre</span>}</div><div className="clock-inline"><button onClick={() => appliquerPas(-1)}>-</button><HorlogeSuivi suivi={suivi} /><button onClick={() => appliquerPas(1)}>+</button></div><button className={`freeze-btn ${suivi.frozen ? 'active' : ''}`} onClick={() => modifier({ frozen: !suivi.frozen })} title={suivi.frozen ? 'Degeler cette horloge' : 'Figer cette horloge'} aria-label={suivi.frozen ? 'Degeler cette horloge' : 'Figer cette horloge'}><IconeMetronome fige={!!suivi.frozen} /></button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>Relancer a 0</button><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
  }

  if (suivi.type === 'boxes') {
    return <div className="tracker"><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} /></div><CasesSuivi suivi={suivi} cocher={cocherCase} /></div>;
  }

  if (suivi.type === 'number') {
    return <div className={`tracker ${classeSeuils} ${declenche ? 'triggered' : ''}`} style={styleSeuil}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} /><SeuilsActifs seuils={seuils} />{declenche && <span className="chip hot">A resoudre</span>}</div><CompteursSuivi suivi={suivi} onModifier={modifier} />{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
  }

  return <div className={`tracker ${classeSeuils} ${declenche ? 'triggered' : ''}`} style={styleSeuil}><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={suffixePuces} /><SeuilsActifs seuils={seuils} />{declenche && <span className="chip hot">A resoudre</span>}</div>{accepteDelta && deltaOuvert && <div className="delta-pop"><input ref={champDeltaRef} type="number" inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && appliquerDeltaManuel()} placeholder="+50" /><button onClick={appliquerDeltaManuel}>OK</button></div>}<div className={`controls ${estPuces ? 'points-controls' : ''}`}><button onClick={() => appliquerPas(-1)}>-</button><div>{suivi.type === 'bar' && <BarreSuivi suivi={suivi} onDelta={ouvrirDelta} />}{suivi.type === 'points' && <PointsSuivi suivi={suivi} onModifier={modifier} />}{suivi.type === 'dots' && <PointsSuivi suivi={suivi} onModifier={modifier} />}</div><button onClick={() => appliquerPas(1)}>+</button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: 0 })}>Relancer a 0</button><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
}

function BarreSuivi({ suivi, onDelta }) {
  const max = Number(suivi.max || 1), min = Number(suivi.min ?? 0), courant = Number(suivi.current || 0), amplitude = Math.max(1, max - min);
  const ratio = Math.max(0, Math.min(1, (courant - min) / amplitude));
  const exces = Math.max(0, courant - max);
  const manqueValeur = Math.max(0, min - courant);
  const depassement = exces / Math.max(1, amplitude + exces);
  const manque = manqueValeur / Math.max(1, amplitude + manqueValeur);
  const classeRemplissage = courant / max <= .25 ? 'danger' : courant / max <= .5 ? 'warn' : '';

  return <><div className="delta"><button onClick={onDelta}>+/-</button></div><div className="bar-bg"><div className={`bar-fill ${classeRemplissage}`} style={{ width: `${ratio * 100}%` }} />{depassement > 0 && <div className="bar-over" style={{ width: `${Math.min(100, Math.max(8, depassement * 100))}%` }} />}{manque > 0 && <div className="bar-under" style={{ width: `${Math.min(100, Math.max(8, manque * 100))}%` }} />}</div><div className="muted" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 3 }}><span>{min}</span><span>{courant}/{max}</span><span>+/-{suivi.step || 1}</span></div></>;
}

function PointsSuivi({ suivi, onModifier }) {
  const max = Math.max(1, Number(suivi.max || 1));
  return <div className="points-wrap"><div className="dots">{Array.from({ length: max }).map((_, i) => <button key={i} className={`dot ${i < suivi.current ? 'on' : ''}`} onClick={() => onModifier({ current: i + 1 === suivi.current ? i : i + 1 })} />)}</div></div>;
}

function CompteursSuivi({ suivi, onModifier }) {
  const step = Math.max(1, Number(suivi.step || 1));
  const compteurs = [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0, size: suivi.counterSize || 'compact' }, ...(Array.isArray(suivi.counters) ? suivi.counters : [])];
  const changer = (compteur, direction) => {
    const delta = direction * step;
    if (compteur.id === '__main') return onModifier(applyDelta(suivi, delta));
    return onModifier({ counters: (suivi.counters || []).map((item) => item.id === compteur.id ? { ...item, current: Number(item.current || 0) + delta } : item) });
  };

  return <div className="counter-grid">{compteurs.map((compteur) => <div className={`counter-unit counter-size-${compteur.size || 'compact'}`} key={compteur.id}><button className="counter-edge" onClick={() => changer(compteur, -1)}>-</button><div className="counter-tile"><span>{compteur.label || 'Compteur'}</span><strong>{compteur.current ?? 0}</strong></div><button className="counter-edge" onClick={() => changer(compteur, 1)}>+</button></div>)}</div>;
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
  return <div className="boxes grouped-boxes">{boxGroups(suivi).map((groupe) => <div className="box-group" key={groupe.id}>{groupe.rows.map((ligne, rowIndex) => <div className="box-row" key={ligne.id}><div className="box-label">{rowIndex === 0 ? groupe.label : ''}</div><div className="boxes">{ligne.marks.map((valeur, i) => <button key={i} className={`box mark-${boxVisualRank(valeur, max)} ${boxVisualRank(valeur, max) >= 5 ? 'full' : ''}`} onClick={() => cocher(groupe.id, ligne.id, i)} aria-label={`${groupe.label} ${ligne.label} case ${i + 1}`} />)}</div><div className="box-label right">{ligne.label}</div></div>)}</div>)}</div>;
}
