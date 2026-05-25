import { useEffect, useState } from 'react';
import { activeGlobalTrackerThresholds, globalThresholdValue, normalizeGlobalThresholds } from '../../domain/globalTracker.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const COMPTEUR_GLOBAL_PAR_DEFAUT = {
  enabled: false,
  name: 'Menace',
  mode: 'clock',
  current: 0,
  max: 10,
  auto: false,
  thresholds: [],
  running: false,
  startedAt: null,
  elapsedMs: 0,
};

const MODES_TEMPS_REEL = new Set(['stopwatch', 'timer']);
const thresholdColors = [
  ['neutral', 'Neutre'],
  ['green', 'Vert calme'],
  ['amber', 'Ambre'],
  ['red', 'Rouge sourd'],
  ['blue', 'Bleu'],
  ['violet', 'Violet'],
];
const thresholdOperators = [
  ['gte', '>='],
  ['lte', '<='],
  ['gt', '>'],
  ['lt', '<'],
  ['eq', '='],
];
const thresholdBases = [
  ['fixed', 'Fixe'],
  ['percent', '%'],
  ['fromMax', 'Max -'],
];

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

function SeuilsGlobauxActifs({ seuils }) {
  if (!seuils.length) return null;
  return <span className="global-threshold-chip-row">{seuils.slice(0, 2).map((seuil, index) => <span className={`threshold-chip threshold-${seuil.color || 'neutral'}`} key={`${seuil.label}-${index}`}>{seuil.label}</span>)}</span>;
}

export function EditeurSeuilsCompteurScene({ compteur, onModifier }) {
  const seuils = normalizeGlobalThresholds(compteur.thresholds);
  const mode = compteur.mode || 'clock';
  const tempsReel = estTempsReel(compteur);
  const aide = mode === 'timer'
    ? 'Pour un minuteur, les seuils lisent le temps restant en secondes.'
    : mode === 'stopwatch'
      ? 'Pour un chronometre, les seuils lisent le temps ecoule en secondes.'
      : mode === 'counter'
        ? 'Pour un compteur, les seuils lisent la valeur courante. Le maximum sert aux modes % et Max -.'
        : 'Pour une horloge, les seuils lisent la progression entre 0 et le maximum.';
  const modifier = (index, patch) => onModifier({ thresholds: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onModifier({ thresholds: [...seuils, { value: 0, label: '', color: 'neutral', operator: mode === 'timer' ? 'lte' : 'gte', basis: 'fixed' }] });
  const supprimer = (index) => onModifier({ thresholds: seuils.filter((_, position) => position !== index) });

  return (
    <div className="threshold-editor global-threshold-editor">
      <div className="line-count-row"><label>Seuils du compteur</label><button className="small-btn" onClick={ajouter}>+ seuil</button></div>
      <p className="muted compact-help">{aide}</p>
      {seuils.map((seuil, index) => (
        <div className="threshold-edit-row has-basis" key={index}>
          <select className="threshold-operator-select" value={seuil.operator || (mode === 'timer' ? 'lte' : 'gte')} onChange={(event) => modifier(index, { operator: event.target.value })}>{thresholdOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <select className="threshold-basis-select" value={seuil.basis || 'fixed'} onChange={(event) => modifier(index, { basis: event.target.value })}>{thresholdBases.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} onChange={(event) => modifier(index, { value: Number(event.target.value) })} />
          <select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(event) => modifier(index, { color: event.target.value })}>{thresholdColors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)}>x</button>
          <input className="threshold-label-input" value={seuil.label || ''} placeholder="Texte affiche" onChange={(event) => modifier(index, { label: event.target.value })} />
          <span className="threshold-warning">valeur cible : {globalThresholdValue(compteur, seuil)}{tempsReel ? ' s' : ''}</span>
        </div>
      ))}
    </div>
  );
}

export function CompteurGlobal({ compteur, onChanger, onToggleTemps, animationTick }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!compteur?.enabled || !estTempsReel(compteur) || !compteur.running) return undefined;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [compteur?.enabled, compteur?.mode, compteur?.running]);

  if (!compteur?.enabled) return null;
  const seuils = activeGlobalTrackerThresholds(compteur);
  if (estTempsReel(compteur)) {
    const temps = etatTempsReel(compteur);
    return (
      <div className={`global-mini realtime ${compteur.running ? 'auto-active' : ''} ${temps.termine ? 'cycle-complete' : ''}`}>
        <div className="global-mini-main">
          <span>{compteur.name || (compteur.mode === 'timer' ? 'Minuteur' : 'Chrono')}</span>
          <SeuilsGlobauxActifs seuils={seuils} />
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
        <SeuilsGlobauxActifs seuils={seuils} />
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

export function FenetreCompteurGlobal({ compteur, sceneCounterTemplates = [], onModifier, onChanger, onFermer }) {
  const [templateId, setTemplateId] = useState(sceneCounterTemplates[0]?.id || '');
  const courant = { ...COMPTEUR_GLOBAL_PAR_DEFAUT, ...(compteur || {}) };
  const modifier = (valeur) => onModifier({ ...courant, ...valeur });
  const tempsReel = estTempsReel(courant);
  const temps = tempsReel ? etatTempsReel(courant) : null;
  const minutesMinuteur = Math.max(1, Math.round(Number(courant.max || 60) / 60));
  const templateChoisi = sceneCounterTemplates.find((template) => template.id === templateId) || null;
  const demarrer = () => modifier({ running: true, startedAt: Date.now() });
  const pause = () => modifier({ running: false, startedAt: null, elapsedMs: tempsEcoule(courant) });
  const resetTemps = () => modifier({ running: false, startedAt: null, elapsedMs: 0 });
  const appliquerTemplate = () => {
    if (!templateChoisi?.counter) return;
    onModifier({ ...templateChoisi.counter, running: false, startedAt: null, elapsedMs: 0 });
  };
  useEffect(() => {
    if (!templateId && sceneCounterTemplates[0]?.id) setTemplateId(sceneCounterTemplates[0].id);
    if (templateId && !sceneCounterTemplates.some((template) => template.id === templateId)) setTemplateId(sceneCounterTemplates[0]?.id || '');
  }, [sceneCounterTemplates, templateId]);

  return (
    <Fenetre title="Compteur de scène" onClose={onFermer}>
      <div className="stack">
        {sceneCounterTemplates.length > 0 && (
          <div className="template-picker-row">
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} aria-label="Template de compteur de scene">
              {sceneCounterTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <button className="small-btn" onClick={appliquerTemplate} disabled={!templateChoisi}>Utiliser</button>
          </div>
        )}
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
        <details className="advanced-options" open>
          <summary>Seuils</summary>
          <EditeurSeuilsCompteurScene compteur={courant} onModifier={modifier} />
        </details>
      </div>
    </Fenetre>
  );
}
