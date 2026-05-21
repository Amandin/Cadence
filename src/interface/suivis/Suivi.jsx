import { useEffect, useRef, useState } from 'react';
import {
  activeThresholds,
  applyDelta,
  boxVisualRank,
  cycleBoxMark,
  isBoxesFreeTracker,
  isBoxesSortedTracker,
  isBoxesTracker,
  isPointsTracker,
  isTriggeredClock,
  sortedMarksForRow,
  trackerBounds,
  trackerDirection,
} from '../../logic.js';

function TitreSuivi({ titre, avantTitre, suffixe = null }) {
  return <span className="tracker-title">{avantTitre}{titre}{suffixe}</span>;
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

function trackerSurfaceClasses(suivi, seuilActif) {
  const couleur = seuilActif?.color || 'neutral';
  return `${suivi.secret ? 'secret-tracker' : ''} ${seuilActif ? `threshold-active threshold-${couleur}` : ''} ${seuilActif && suivi.__secondThresholdColor ? 'threshold-mix' : ''}`;
}

const thresholdBgByColor = {
  neutral: ['rgba(148, 163, 184, .24)', 'rgba(148, 163, 184, .24)'],
  green: ['rgba(21, 128, 61, .26)', 'rgba(74, 222, 128, .26)'],
  amber: ['rgba(180, 83, 9, .28)', 'rgba(251, 191, 36, .27)'],
  red: ['rgba(185, 28, 28, .25)', 'rgba(248, 113, 113, .26)'],
  blue: ['rgba(29, 78, 216, .24)', 'rgba(96, 165, 250, .26)'],
  violet: ['rgba(109, 40, 217, .24)', 'rgba(167, 139, 250, .25)'],
};

export function Suivi({ suivi, onModifier, onSupprimer, avantTitre = null }) {
  const [deltaOuvert, setDeltaOuvert] = useState(false);
  const [delta, setDelta] = useState('');
  const [deltaCible, setDeltaCible] = useState('__main');
  const [pasOuvert, setPasOuvert] = useState(false);
  const [pas, setPas] = useState(String(suivi.step || 1));
  const [casesInversees, setCasesInversees] = useState(false);
  const champDeltaRef = useRef(null);
  const declenche = isTriggeredClock(suivi);
  const seuilsActifs = activeThresholds(suivi) || [];
  const seuilActif = seuilsActifs[0] || null;
  const accepteDelta = suivi.type === 'bar' || suivi.type === 'number';
  const modifier = (valeur) => onModifier({ ...suivi, ...valeur });
  const appliquerPas = (direction) => !isBoxesTracker(suivi) && onModifier(applyDelta(suivi, direction * Number(suivi.step || 1)));
  const ouvrirDelta = (cible = '__main') => { setDeltaCible(cible); setDeltaOuvert((ouvert) => cible === deltaCible ? !ouvert : true); };
  const appliquerDeltaManuel = () => {
    const valeur = Number(delta);
    if (suivi.type === 'number' && deltaCible !== '__main') {
      modifier({ counters: (suivi.counters || []).map((compteur) => compteur.id === deltaCible ? { ...compteur, current: Number(compteur.current || 0) + valeur } : compteur) });
    } else {
      onModifier(applyDelta(suivi, valeur));
    }
    setDelta('');
    setDeltaOuvert(false);
  };
  const changerCase = (valeur) => casesInversees ? Math.max(0, Number(valeur || 0) - 1) : cycleBoxMark(valeur, suivi.fillLevels || 5);
  const cocherCase = (ligneId, index) => modifier({ rows: suivi.rows.map((ligne) => ligne.id !== ligneId ? ligne : { ...ligne, marks: ligne.marks.map((valeur, i) => i === index ? changerCase(valeur) : valeur) }) });
  const validerPas = () => { const valeur = Math.max(1, Number(pas) || 1); modifier({ step: valeur }); setPas(String(valeur)); setPasOuvert(false); };
  const couleurSeuil = seuilActif?.color || 'neutral';
  const secondCouleurSeuil = seuilsActifs[1]?.color || '';
  const marqueSecret = suivi.secret ? <span className="chip secret-chip" title="Secret MJ">{'🥷'}</span> : null;
  const seuilsTitre = suivi.type === 'number' ? [] : seuilsActifs;
  const marqueSeuil = seuilsTitre.length ? <span className="threshold-chip-stack">{seuilsTitre.map((seuil, index) => <span key={`${seuil.counterId || (seuil.total ? 'total' : 'current')}-${index}`} className={`chip threshold-chip threshold-${seuil.color || couleurSeuil}`}>{seuil.label}</span>)}</span> : null;
  const controlePas = <StepControl value={suivi.step || 1} open={pasOuvert} draft={pas} onOpen={() => { setPas(String(suivi.step || 1)); setPasOuvert(true); }} onDraft={setPas} onSave={validerPas} />;
  const seuilDeSurface = suivi.type === 'number' ? null : seuilActif;
  const classes = trackerSurfaceClasses({ ...suivi, __secondThresholdColor: secondCouleurSeuil }, seuilDeSurface);
  const thresholdStyle = seuilDeSurface && secondCouleurSeuil ? { '--threshold-bg-2': thresholdBgByColor[secondCouleurSeuil]?.[0], '--threshold-bg-dark-2': thresholdBgByColor[secondCouleurSeuil]?.[1] } : undefined;
  const suffixeTitre = isPointsTracker(suivi) && suivi.limitMode === 'loop' ? <span className="title-counter">{Number(suivi.cycles ?? suivi.cyclesInitial ?? 0) || 0}</span> : null;
  const resetLabel = suivi.autoReset === 'round' ? 'Reset : nouveau round' : suivi.autoReset === 'activation' ? 'Reset : activation' : '';

  useEffect(() => {
    if (!deltaOuvert) return;
    requestAnimationFrame(() => champDeltaRef.current?.focus());
  }, [deltaOuvert]);

  const autoResetIcon = suivi.autoReset && suivi.autoReset !== 'never' ? <button className={`auto-reset-chip ${suivi.autoResetPaused ? 'paused' : ''}`} onClick={() => modifier({ autoResetPaused: !suivi.autoResetPaused })} title={suivi.autoResetPaused ? 'Relancer l automatisation' : 'Bloquer l automatisation'}><IconeMetronome fige={!!suivi.autoResetPaused} /></button> : null;
  const entete = (extras = null, suffixe = suffixeTitre) => <><div className="tracker-top"><TitreSuivi titre={suivi.name} avantTitre={avantTitre} suffixe={<>{suffixe}{marqueSeuil}</>} /><span className="tracker-top-actions">{autoResetIcon}{extras}{marqueSecret}</span></div>{resetLabel && <div className="auto-reset-note">{resetLabel}</div>}</>;
  const switchCases = <button className={`box-mode-switch ${casesInversees ? 'remove' : 'add'}`} onClick={() => setCasesInversees((value) => !value)}><span>{casesInversees ? '-' : '+'}</span><b>{casesInversees ? 'Retirer' : 'Ajouter'}</b></button>;

  if (suivi.type === 'clock') {
    const compteurTours = suivi.limitMode !== 'manual' ? <span className="title-counter">{Number(suivi.cycles ?? suivi.cyclesInitial ?? 0) || 0}</span> : null;
    const extras = <>{avantTitre && controlePas}<button className={`freeze-btn ${suivi.frozen ? 'active' : ''}`} onClick={() => modifier({ frozen: !suivi.frozen })} title={suivi.frozen ? 'Degeler cette horloge' : 'Figer cette horloge'} aria-label={suivi.frozen ? 'Degeler cette horloge' : 'Figer cette horloge'}><IconeMetronome fige={!!suivi.frozen} /></button></>;
    return <div className={`tracker ${declenche ? 'triggered' : ''} ${suivi.frozen ? 'frozen' : ''} ${classes}`} style={thresholdStyle}>{entete(extras, compteurTours)}<div className="clock-inline"><button onClick={() => appliquerPas(-1)}>-</button><HorlogeSuivi suivi={suivi} /><button onClick={() => appliquerPas(1)}>+</button></div>{declenche && <div className="stack" style={{ marginTop: 8 }}><button className="primary" onClick={() => modifier({ current: Number(suivi.initial ?? 0) })}>Relancer</button><button className="danger-btn" onClick={onSupprimer}>Supprimer</button></div>}</div>;
  }

  if (isBoxesFreeTracker(suivi)) {
    return <div className={`tracker ${classes}`} style={thresholdStyle}>{entete(null, null)}<CasesSuivi suivi={suivi} cocher={cocherCase} /></div>;
  }

  if (isBoxesSortedTracker(suivi)) {
    return <div className={`tracker ${classes}`} style={thresholdStyle}>{entete(switchCases, null)}<CasesTriees suivi={suivi} onChange={modifier} inverse={casesInversees} /></div>;
  }

  if (suivi.type === 'number') {
    return <div className={`tracker ${classes}`} style={thresholdStyle}>{entete(controlePas)}{deltaOuvert && <div className="delta-pop"><input ref={champDeltaRef} type="number" inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && appliquerDeltaManuel()} placeholder="+50" /><button onClick={appliquerDeltaManuel}>OK</button></div>}<CompteurSuivi suivi={suivi} onDelta={ouvrirDelta} onChange={modifier} seuilsActifs={seuilsActifs} /></div>;
  }

  return <div className={`tracker ${declenche ? 'triggered' : ''} ${classes}`} style={thresholdStyle}>{entete(null)}{accepteDelta && deltaOuvert && <div className="delta-pop"><input ref={champDeltaRef} type="number" inputMode="numeric" value={delta} onChange={(event) => setDelta(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && appliquerDeltaManuel()} placeholder="+50" /><button onClick={appliquerDeltaManuel}>OK</button></div>}<div className="controls"><button onClick={() => appliquerPas(-1)}>-</button><div>{suivi.type === 'bar' && <BarreSuivi suivi={suivi} onDelta={() => ouvrirDelta('__main')} stepControl={controlePas} />}{isPointsTracker(suivi) && <PointsSuivi suivi={suivi} onModifier={modifier} />}</div><button onClick={() => appliquerPas(1)}>+</button></div></div>;
}

function StepControl({ value, open, draft, onOpen, onDraft, onSave }) {
  if (open) return <input className="step-input" type="number" inputMode="numeric" value={draft} onChange={(event) => onDraft(event.target.value)} onBlur={onSave} onKeyDown={(event) => event.key === 'Enter' && onSave()} autoFocus />;
  return <button className="step-chip" onClick={onOpen}>+/-{value}</button>;
}

function BarreSuivi({ suivi, onDelta, stepControl }) {
  const { min, max } = trackerBounds(suivi);
  const courant = Number(suivi.current || 0);
  const amplitude = Math.max(1, max - min);
  const ratio = Math.max(0, Math.min(1, (courant - min) / amplitude));
  const zeroRatio = max > 0 ? Math.max(0, Math.min(1, (0 - min) / amplitude)) : 0;
  const depassement = Math.max(0, courant - max) / Math.max(1, Math.abs(max - min));
  const manque = Math.max(0, min - courant) / Math.max(1, Math.abs(max - min));
  const alerteRatio = trackerDirection(suivi) === 'countdown' ? courant / Math.max(1, max) : ratio;
  const classeRemplissage = alerteRatio <= .25 ? 'danger' : alerteRatio <= .5 ? 'warn' : '';
  const sousZero = courant < 0 ? 'below-zero' : '';

  return <><div className={`bar-bg ${sousZero}`} onClick={onDelta} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onDelta()}><span className="zero-mark" style={{ left: `${zeroRatio * 100}%` }}><b>0</b></span><div className={`bar-fill ${classeRemplissage}`} style={{ width: `${ratio * 100}%` }} />{depassement > 0 && <div className="bar-over" style={{ width: `${Math.min(100, Math.max(10, depassement * 100))}%` }}><span>+</span></div>}{manque > 0 && <div className="bar-under" style={{ width: `${Math.min(100, Math.max(10, manque * 100))}%` }}><span>-</span></div>}</div><div className="muted tracker-value-line"><span>{min}</span><span>{courant}/{max}</span>{stepControl}</div></>;
}

function PointsSuivi({ suivi, onModifier }) {
  return <div className="dots">{Array.from({ length: suivi.max }).map((_, i) => <button key={i} className={`dot ${i < suivi.current ? 'on' : ''}`} onClick={() => onModifier({ current: i + 1 === suivi.current ? i : i + 1 })} />)}</div>;
}

function CompteurSuivi({ suivi, onDelta, onChange, seuilsActifs = [] }) {
  const compteurs = [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0, size: suivi.counterSize || 'compact' }, ...(Array.isArray(suivi.counters) ? suivi.counters : [])];
  const bouger = (event, compteur, direction) => {
    event.stopPropagation();
    const delta = direction * Number(suivi.step || 1);
    if (compteur.id === '__main') return onChange(applyDelta(suivi, delta));
    onChange({ counters: (suivi.counters || []).map((item) => item.id === compteur.id ? { ...item, current: Number(item.current || 0) + delta } : item) });
  };
  return <div className="counter-grid">{compteurs.map((compteur) => {
    const seuilsCompteur = seuilsActifs.filter((seuil) => (seuil.counterId || '__main') === compteur.id);
    const principal = seuilsCompteur[0];
    const second = seuilsCompteur[1];
    const style = principal && second ? { '--threshold-bg-2': thresholdBgByColor[second.color]?.[0], '--threshold-bg-dark-2': thresholdBgByColor[second.color]?.[1] } : undefined;
    return <div className={`counter-unit counter-size-${compteur.size || 'compact'}`} key={compteur.id}><button className="counter-edge" onClick={(event) => bouger(event, compteur, -1)}>-</button><button className={`counter-tile ${principal ? `threshold-active threshold-${principal.color || 'neutral'}` : ''} ${second ? 'threshold-mix' : ''}`} style={style} onClick={() => onDelta(compteur.id)}><span>{compteur.label || 'Compteur'}</span><strong>{compteur.current ?? 0}</strong></button><button className="counter-edge" onClick={(event) => bouger(event, compteur, 1)}>+</button>{seuilsCompteur.length > 0 && <div className="counter-thresholds">{seuilsCompteur.map((seuil, index) => <span key={`${seuil.label}-${index}`} className={`chip threshold-chip threshold-${seuil.color || 'neutral'}`}>{seuil.label}</span>)}</div>}</div>;
  })}</div>;
}

function HorlogeSuivi({ suivi }) {
  const max = Math.max(1, Number(suivi.max || 1));
  const min = Number(suivi.min ?? 0);
  const courant = Math.max(min, Number(suivi.current || 0));
  const declenche = isTriggeredClock(suivi);
  const depassement = suivi.limitMode === 'overflow' ? Math.max(0, courant - max) : 0;
  const ratio = trackerDirection(suivi) === 'countdown' ? 1 - ((courant - min) / Math.max(1, max - min)) : courant / max;
  const overRatio = depassement > 0 ? depassement / Math.max(1, courant) : 0;
  const attention = !declenche && ratio >= .5;
  const proche = !declenche && ratio >= .75;
  const progression = Math.max(0, Math.min(1, ratio));

  return <div className={`clock-face ${attention ? 'warning' : ''} ${proche ? 'near' : ''} ${declenche ? 'triggered' : ''} ${depassement ? 'overflowing' : ''} ${suivi.frozen ? 'frozen' : ''}`} style={{ '--clock-progress': `${progression * 360}deg`, '--clock-overflow': `${overRatio * 360}deg` }}><span>{courant}</span><small>{depassement ? `+${depassement}` : `/${max}`}</small></div>;
}

function CasesSuivi({ suivi, cocher }) {
  const max = suivi.fillLevels || 5;
  return <div className="boxes free-boxes">{suivi.rows.map((ligne) => <div className="box-row free-box-row" key={ligne.id}><span className="box-label">{ligne.label}</span><div className="boxes">{ligne.marks.map((valeur, i) => <button key={i} className={`box mark-${boxVisualRank(valeur, max)} ${boxVisualRank(valeur, max) >= 5 ? 'full' : ''}`} onClick={() => cocher(ligne.id, i)} aria-label={`${ligne.label} case ${i + 1}`} />)}</div></div>)}</div>;
}

function CasesTriees({ suivi, onChange, inverse }) {
  const max = suivi.fillLevels || 1;
  const lignes = suivi.rows?.length ? suivi.rows : [{ id: 'sorted', label: 'Jauge', marks: [] }];
  const labels = suivi.levelLabels || [];
  const triGlobal = suivi.globalSort !== false;
  const ranger = (ligne, marks) => sortedMarksForRow(suivi, { ...ligne, marks });
  const redistribuer = (marks) => {
    const ordonnees = triGlobal ? sortedMarksForRow(suivi, { id: 'all', marks }) : marks;
    let curseur = 0;
    return lignes.map((ligne) => {
      const taille = (ligne.marks || []).length;
      const slice = ordonnees.slice(curseur, curseur + taille);
      curseur += taille;
      return { ...ligne, marks: triGlobal ? slice : ranger(ligne, slice) };
    });
  };
  const modifierLigne = (ligneId, marks) => {
    if (!triGlobal) return onChange({ rows: lignes.map((ligne) => ligne.id === ligneId ? { ...ligne, marks: ranger(ligne, marks) } : ligne) });
    const toutes = lignes.flatMap((ligne) => ligne.id === ligneId ? marks : (ligne.marks || []));
    onChange({ rows: redistribuer(toutes) });
  };
  const cocher = (ligne, index) => {
    const marks = sortedMarksForRow(suivi, ligne);
    const prochaines = marks.map((valeur, i) => i === index ? (inverse ? Math.max(0, Number(valeur || 0) - 1) : cycleBoxMark(valeur, max)) : valeur);
    modifierLigne(ligne.id, prochaines);
  };
  const changer = (level, quantity = 1) => {
    const toutes = lignes.flatMap((ligne) => sortedMarksForRow(suivi, ligne));
    let restants = Math.max(1, Number(quantity) || 1);
    while (!inverse && restants > 0 && toutes.some((mark) => !mark)) {
      const position = toutes.findIndex((mark) => !mark);
      toutes[position] = level;
      restants -= 1;
    }
    while (inverse && restants > 0 && toutes.some((mark) => mark === level)) {
      const position = toutes.lastIndexOf(level);
      toutes[position] = 0;
      restants -= 1;
    }
    onChange({ rows: redistribuer(toutes) });
  };

  return <div className="stack sorted-monitor"><div className="sorted-monitor-lines">{lignes.map((ligne) => <div className="sorted-monitor-line" key={ligne.id}><div className="boxes sorted-boxes">{sortedMarksForRow(suivi, ligne).map((valeur, i) => <button key={i} className={`box mark-${boxVisualRank(valeur, max)} ${boxVisualRank(valeur, max) >= 5 ? 'full' : ''}`} onClick={() => cocher(ligne, i)} aria-label={`Case ${i + 1}`} title={valeur ? labels[valeur - 1] || `Niveau ${valeur}` : 'Vide'} />)}</div><span className="box-label">{ligne.label}</span></div>)}</div>{max > 1 && <div className="sorted-add-row">{Array.from({ length: max }).map((_, index) => <button key={index} className="small-btn" onClick={() => changer(index + 1, 1)}>{inverse ? '-' : '+'} {labels[index] || `N${index + 1}`}</button>)}</div>}{max === 1 && <div className="sorted-add-row"><button className="small-btn" onClick={() => changer(1, 1)}>{inverse ? '-' : '+'}</button></div>}</div>;
}
