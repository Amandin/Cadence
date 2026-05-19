import { useEffect, useState } from 'react';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const COMPTEUR_GLOBAL_PAR_DEFAUT = {
  enabled: false,
  name: 'Menace',
  mode: 'clock',
  current: 0,
  max: 10,
  auto: false,
  running: false,
  startedAt: null,
  elapsedMs: 0,
};

const MODES_TEMPS_REEL = new Set(['stopwatch', 'timer']);

function estTempsReel(compteur) {
  return MODES_TEMPS_REEL.has(compteur?.mode);
}

function tempsEcoule(compteur, now = Date.now()) {
  const base = Math.max(0, Number(compteur.elapsedMs || 0));
  if (!compteur.running || !compteur.startedAt) return base;
  return base + Math.max(0, now - Number(compteur.startedAt));
}

function formaterTemps(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const secondes = total % 60;
  return `${minutes}:${String(secondes).padStart(2, '0')}`;
}

function etatTempsReel(compteur, now = Date.now()) {
  const ecoule = tempsEcoule(compteur, now);
  if (compteur.mode === 'timer') {
    const duree = Math.max(1, Number(compteur.max || 60)) * 1000;
    return {
      affichage: formaterTemps(Math.max(0, duree - ecoule)),
      progression: Math.min(1, ecoule / duree),
      termine: ecoule >= duree,
      ecoule,
    };
  }
  return { affichage: formaterTemps(ecoule), progression: 0, termine: false, ecoule };
}

function calculerEtatCompteur(compteur) {
  const maximum = Math.max(1, Number(compteur.max || 10));
  const valeur = Math.max(0, Number(compteur.current || 0));
  const deborde = valeur > maximum;
  const excedent = Math.max(0, valeur - maximum);
  const resteDebordement = excedent % maximum;
  const ratioDebordement = deborde ? (resteDebordement === 0 ? 1 : resteDebordement / maximum) : 0;
  const cyclesComplets = deborde ? Math.floor(valeur / maximum) : 0;
  const cycleExact = valeur >= maximum && valeur % maximum === 0;
  const progression = deborde ? 1 : Math.min(1, valeur / maximum);

  return { maximum, valeur, deborde, ratioDebordement, cyclesComplets, cycleExact, progression };
}

function BoutonPasCompteur({ pas, onChanger, children }) {
  return <button onClick={(event) => { event.stopPropagation(); onChanger(pas); }}>{children}</button>;
}

export function CompteurGlobal({ compteur, onChanger, onToggleTemps, animationTick }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!compteur?.enabled || !estTempsReel(compteur) || !compteur.running) return undefined;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [compteur?.enabled, compteur?.mode, compteur?.running]);

  if (!compteur?.enabled) return null;
  if (estTempsReel(compteur)) {
    const temps = etatTempsReel(compteur);
    return (
      <div className={`global-mini realtime ${compteur.running ? 'auto-active' : ''} ${temps.termine ? 'cycle-complete' : ''}`}>
        <div className="global-mini-main">
          <span>{compteur.name || (compteur.mode === 'timer' ? 'Minuteur' : 'Chrono')}</span>
          <button
            className={`clock-face global-clock realtime-clock ${compteur.mode === 'stopwatch' ? 'counter-mode' : ''} ${temps.termine ? 'cycle-complete' : ''}`}
            style={{ '--clock-progress': `${temps.progression * 360}deg` }}
            onClick={onToggleTemps}
            aria-label={compteur.running ? 'Mettre le temps en pause' : 'Reprendre le temps'}
          >
            <span>{temps.affichage}</span>
          </button>
        </div>
      </div>
    );
  }

  const { maximum, valeur, deborde, ratioDebordement, cyclesComplets, cycleExact, progression } = calculerEtatCompteur(compteur);

  return (
    <div className={`global-mini ${compteur.auto ? 'auto-active' : ''} ${animationTick ? 'auto-tick' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}>
      <BoutonPasCompteur pas={-1} onChanger={onChanger}>−</BoutonPasCompteur>
      <div className="global-mini-main">
        <span>{compteur.name || 'Menace'}</span>
        <div
          className={`clock-face global-clock ${compteur.mode === 'counter' ? 'counter-mode' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}
          style={{ '--clock-progress': `${progression * 360}deg`, '--overflow-progress': `${ratioDebordement * 360}deg` }}
          aria-label="Compteur de scène"
        >
          <span>{valeur}</span>
          {compteur.mode === 'clock' && <small>/{maximum}</small>}
        </div>
        {deborde && <em className="overflow-badge">×{cyclesComplets}</em>}
        {animationTick && <em className="auto-plus">+1</em>}
      </div>
      <BoutonPasCompteur pas={1} onChanger={onChanger}>+</BoutonPasCompteur>
    </div>
  );
}

export function FenetreCompteurGlobal({ compteur, onModifier, onChanger, onFermer }) {
  const courant = { ...COMPTEUR_GLOBAL_PAR_DEFAUT, ...(compteur || {}) };
  const modifier = (valeur) => onModifier({ ...courant, ...valeur });
  const tempsReel = estTempsReel(courant);
  const temps = tempsReel ? etatTempsReel(courant) : null;
  const minutesMinuteur = Math.max(1, Math.round(Number(courant.max || 60) / 60));
  const demarrer = () => modifier({ running: true, startedAt: Date.now() });
  const pause = () => modifier({ running: false, startedAt: null, elapsedMs: tempsEcoule(courant) });
  const resetTemps = () => modifier({ running: false, startedAt: null, elapsedMs: 0 });

  return (
    <Fenetre title="Compteur de scène" onClose={onFermer}>
      <div className="stack">
        <label className="row"><input type="checkbox" checked={!!courant.enabled} onChange={(event) => modifier({ enabled: event.target.checked })} /> actif dans l’entête</label>
        <label className="field">Nom<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder="Menace" /></label>
        <div className="grid2">
          <label className="field">Type<select value={courant.mode || 'clock'} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronomètre</option><option value="timer">Minuteur</option></select></label>
          {!tempsReel && <label className="field">Valeur<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {courant.mode === 'timer' && <label className="field">Durée minutes<input type="number" inputMode="numeric" min="1" value={minutesMinuteur} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) * 60 })} /></label>}
        </div>
        {!tempsReel && <label className="field">Maximum<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {!tempsReel && <label className="row"><input type="checkbox" checked={!!courant.auto} onChange={(event) => modifier({ auto: event.target.checked })} /> avance automatiquement à chaque nouveau round</label>}
        {!tempsReel && <div className="grid2"><button className="small-btn" onClick={() => onChanger(-1)}>−1</button><button className="small-btn" onClick={() => onChanger(1)}>+1</button></div>}
        {tempsReel && <div className="timer-control-panel">
          <strong>{temps.affichage}</strong>
          <div className="grid2">
            <button className="primary" onClick={courant.running ? pause : demarrer}>{courant.running ? 'Pause' : 'Démarrer'}</button>
            <button className="small-btn" onClick={resetTemps}>Reset</button>
          </div>
        </div>}
      </div>
    </Fenetre>
  );
}
