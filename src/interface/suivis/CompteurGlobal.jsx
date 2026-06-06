import { useEffect, useRef, useState } from 'react';
import { activeGlobalTrackerThresholds, elapsedGlobalTrackerMs, globalThresholdValue, globalTrackerTimerState, normalizeGlobalThresholds } from '../../domain/globalTracker.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const COMPTEUR_GLOBAL_PAR_DEFAUT = {
  enabled: false,
  name: 'Menace',
  mode: 'clock',
  current: 0,
  max: 10,
  direction: 'progression',
  trigger: 'manual',
  limitMode: 'clamp',
  total: 0,
  loops: 0,
  auto: false,
  thresholds: [],
  running: false,
  startedAt: null,
  elapsedMs: 0,
  soundOnComplete: false,
  completeSoundId: 'beep',
  completeSoundUrl: '',
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
const thresholdOptionStyles = {
  neutral: { backgroundColor: '#e2e8f0', color: '#334155' },
  green: { backgroundColor: '#dcfce7', color: '#166534' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  red: { backgroundColor: '#fee2e2', color: '#991b1b' },
  blue: { backgroundColor: '#dbeafe', color: '#1e40af' },
  violet: { backgroundColor: '#ede9fe', color: '#5b21b6' },
};
const thresholdOperators = [
  ['gte', '>='],
  ['lte', '<='],
  ['gt', '>'],
  ['lt', '<'],
  ['eq', '='],
];
const thresholdBases = {
  timer: [
    ['fixed', 'Temps restant'],
    ['percent', '% restant'],
  ],
};
const thresholdScopes = [
  ['current', 'Cycle en cours'],
  ['loops', 'Nombre de boucles'],
];
const soundChoices = [
  ['none', 'Aucun son'],
  ['beep', 'Bip'],
  ['chime', 'Carillon'],
  ['alarm', 'Alerte'],
  ['custom', 'Son personnalise'],
];
const thresholdGlowColors = {
  neutral: '#94a3b8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

function estTempsReel(compteur) {
  return MODES_TEMPS_REEL.has(compteur?.mode);
}

function tempsEcoule(compteur, now = Date.now()) {
  return elapsedGlobalTrackerMs(compteur, now);
}

function formaterTemps(msOuSecondes, { seconds = false, signed = false } = {}) {
  const total = Math.max(0, Math.floor(seconds ? msOuSecondes : msOuSecondes / 1000));
  const minutes = Math.floor(total / 60);
  const secondes = total % 60;
  return `${signed ? '+' : ''}${String(minutes).padStart(signed ? 2 : 1, '0')}:${String(secondes).padStart(2, '0')}`;
}

function convertirSecondesEnTemps(secondes) {
  const total = Math.max(0, Math.floor(Number(secondes) || 0));
  return { minutes: Math.floor(total / 60), secondes: total % 60 };
}

function totalSecondesDepuisTemps(minutes, secondes) {
  return Math.max(0, Math.floor(Number(minutes) || 0) * 60 + Math.floor(Number(secondes) || 0));
}

function jouerSonSuiviGlobal({ soundId = 'beep', soundUrl = '' } = {}) {
  try {
    if (soundId === 'custom' && soundUrl) {
      const audio = new Audio(soundUrl);
      audio.volume = 0.75;
      audio.play?.();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const contexte = new AudioContext();
    const oscillateur = contexte.createOscillator();
    const gain = contexte.createGain();
    const frequences = soundId === 'alarm' ? [660, 440, 660] : soundId === 'chime' ? [660, 880, 1320] : [880];
    oscillateur.type = soundId === 'alarm' ? 'square' : 'sine';
    oscillateur.frequency.value = frequences[0];
    frequences.slice(1).forEach((frequence, index) => {
      oscillateur.frequency.setValueAtTime(frequence, contexte.currentTime + 0.12 * (index + 1));
    });
    gain.gain.setValueAtTime(0.001, contexte.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, contexte.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, contexte.currentTime + (soundId === 'alarm' ? 0.65 : 0.45));
    oscillateur.connect(gain);
    gain.connect(contexte.destination);
    oscillateur.start();
    oscillateur.stop(contexte.currentTime + (soundId === 'alarm' ? 0.7 : 0.5));
    window.setTimeout(() => contexte.close?.(), 900);
  } catch {
    // Le son reste un bonus : l'alerte visuelle porte l'information.
  }
}

function etatTempsReel(compteur, now = Date.now()) {
  if (compteur.mode === 'timer') {
    const etat = globalTrackerTimerState(compteur, now);
    const depasse = compteur.limitMode === 'overflow' && etat.complete;
    const boucle = compteur.limitMode === 'loop';
    return {
      affichage: depasse ? formaterTemps(etat.overrunSeconds, { seconds: true, signed: true }) : formaterTemps(etat.remainingMs),
      progression: etat.progress,
      termine: etat.complete,
      depasse,
      boucle,
      boucles: etat.loops,
      ecoule: etat.elapsedMs,
    };
  }
  const ecoule = tempsEcoule(compteur, now);
  return { affichage: formaterTemps(ecoule), progression: 0, termine: false, ecoule };
}

function calculerEtatCompteur(compteur) {
  const maximum = Math.max(1, Number(compteur.max || 10));
  const valeur = Math.max(0, Number(compteur.current || 0));
  const total = Math.max(0, Number(compteur.total ?? valeur));
  const boucle = compteur.mode === 'clock' && (compteur.limitMode === 'loop' || compteur.limitMode === 'restart');
  const deborde = !boucle && compteur.limitMode === 'overflow' && valeur > maximum;
  const excedent = Math.max(0, boucle ? total - maximum : valeur - maximum);
  const resteDebordement = excedent % maximum;
  const ratioDebordement = deborde ? (resteDebordement === 0 ? 1 : resteDebordement / maximum) : 0;
  const cyclesComplets = Math.max(0, Number(compteur.loops ?? Math.floor((boucle ? total : valeur) / maximum)));
  const cycleExact = valeur >= maximum && valeur % maximum === 0;
  const progression = deborde ? 1 : Math.min(1, valeur / maximum);

  return { maximum, valeur, total, boucle, deborde, ratioDebordement, cyclesComplets, cycleExact, progression };
}

function BoutonPasCompteur({ pas, onChanger, children }) {
  return <button onClick={(event) => { event.stopPropagation(); onChanger(pas); }}>{children}</button>;
}

function SeuilsGlobauxActifs({ seuils }) {
  if (!seuils.length) return null;
  return <span className="global-threshold-chip-row">{seuils.slice(0, 1).map((seuil, index) => <span className={`threshold-chip threshold-${seuil.color || 'neutral'} ${seuil.memorise ? 'threshold-latched' : ''}`} key={`${seuil.label}-${index}`}>{seuil.label}</span>)}</span>;
}

function styleSeuilsGlobaux(seuils) {
  if (!seuils.length) return {};
  return {
    '--threshold-a': thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
    '--threshold-b': thresholdGlowColors[seuils[1]?.color] || thresholdGlowColors[seuils[0]?.color] || thresholdGlowColors.neutral,
  };
}

function cleSeuil(seuil) {
  return `${seuil.scope || 'current'}:${seuil.basis || 'fixed'}:${seuil.operator || ''}:${seuil.value}:${seuil.label || ''}`;
}

function libelleCibleSeuil(compteur, seuil) {
  if (compteur.mode !== 'timer') return '';
  if (seuil.scope === 'loops') return `cible : ${seuil.value} boucle${Number(seuil.value) > 1 ? 's' : ''}`;
  const cible = globalThresholdValue(compteur, seuil);
  if (seuil.basis === 'percent') return `cible : ${seuil.value}% restant (${cible} s)`;
  return `cible : ${cible} s restants`;
}

function ChampsTemps({ totalSecondes, onChanger, prefixe = '' }) {
  const temps = convertirSecondesEnTemps(totalSecondes);
  const changerMinutes = (event) => onChanger(totalSecondesDepuisTemps(event.target.value, temps.secondes));
  const changerSecondes = (event) => onChanger(totalSecondesDepuisTemps(temps.minutes, event.target.value));
  return (
    <div className="time-pair-fields">
      <label className="field">{prefixe}minutes<input type="number" inputMode="numeric" min="0" value={temps.minutes} onChange={changerMinutes} /></label>
      <label className="field">{prefixe}secondes<input type="number" inputMode="numeric" min="0" value={temps.secondes} onChange={changerSecondes} /></label>
    </div>
  );
}

function SelecteurSon({ soundId = 'beep', soundUrl = '', onChanger }) {
  const valeur = soundId || 'beep';
  const lireFichier = (event) => {
    const fichier = event.target.files?.[0];
    if (!fichier) return;
    const lecteur = new FileReader();
    lecteur.onload = () => onChanger({ soundId: 'custom', soundUrl: String(lecteur.result || '') });
    lecteur.readAsDataURL(fichier);
  };
  return (
    <div className="sound-picker">
      <select value={valeur} onChange={(event) => onChanger({ soundId: event.target.value, soundUrl: event.target.value === 'custom' ? soundUrl : '' })}>
        {soundChoices.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {valeur !== 'none' && <button className="small-btn" type="button" onClick={() => jouerSonSuiviGlobal({ soundId: valeur, soundUrl })}>Tester</button>}
      {valeur === 'custom' && <input type="file" accept="audio/*" onChange={lireFichier} />}
    </div>
  );
}

export function EditeurSeuilsCompteurScene({ compteur, onModifier }) {
  const seuils = normalizeGlobalThresholds(compteur.thresholds);
  const mode = compteur.mode || 'clock';
  const bases = thresholdBases[mode] || [];
  const afficherBase = bases.length > 0;
  const afficherCible = mode === 'timer';
  const afficherScope = (mode === 'clock' || mode === 'timer') && compteur.limitMode === 'loop';
  const afficherSon = mode === 'timer' || mode === 'stopwatch';
  const aide = mode === 'timer'
    ? 'Les seuils du minuteur lisent le cycle en cours ou le nombre de boucles si le minuteur boucle.'
    : mode === 'stopwatch'
      ? 'Pour un chronomètre, les seuils lisent le temps écoulé en minutes/secondes.'
      : mode === 'counter'
        ? 'Pour un compteur, les seuils lisent simplement la valeur courante.'
        : 'Pour une horloge, les seuils lisent le cycle en cours ou le nombre de boucles si elle boucle.';
  const modifier = (index, patch) => onModifier({ thresholds: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onModifier({ thresholds: [...seuils, { value: 0, label: '', color: 'neutral', operator: mode === 'timer' ? 'lte' : 'gte', basis: 'fixed', scope: 'current', sound: false, soundId: 'beep', soundUrl: '' }] });
  const supprimer = (index) => onModifier({ thresholds: seuils.filter((_, position) => position !== index) });

  return (
    <div className="threshold-editor global-threshold-editor">
      <div className="line-count-row"><label>Seuils de l’indicateur de scène</label><button className="small-btn" onClick={ajouter}>+ seuil</button></div>
      <p className="muted compact-help">{aide}</p>
      {seuils.map((seuil, index) => (
        <div className={`threshold-edit-row ${afficherScope ? 'has-target' : ''} ${afficherBase && (seuil.scope || 'current') !== 'loops' ? 'has-basis' : ''}`} key={index}>
          <select className="threshold-operator-select" value={seuil.operator || (mode === 'timer' ? 'lte' : 'gte')} onChange={(event) => modifier(index, { operator: event.target.value })}>{thresholdOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          {afficherScope && <select className="threshold-target-select" value={seuil.scope || 'current'} onChange={(event) => modifier(index, { scope: event.target.value, basis: event.target.value === 'loops' ? 'fixed' : seuil.basis, operator: event.target.value === 'loops' && ['lte', 'lt'].includes(seuil.operator) ? 'gte' : seuil.operator })}>{thresholdScopes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
          {afficherBase && (seuil.scope || 'current') !== 'loops' && <select className="threshold-basis-select" value={seuil.basis || 'fixed'} onChange={(event) => modifier(index, { basis: event.target.value })}>{bases.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}
          {(mode === 'timer' || mode === 'stopwatch') && (seuil.basis || 'fixed') === 'fixed' && (seuil.scope || 'current') !== 'loops'
            ? <ChampsTemps totalSecondes={seuil.value ?? 0} onChanger={(value) => modifier(index, { value })} />
            : <input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} onChange={(event) => modifier(index, { value: Number(event.target.value) })} />}
          <select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(event) => modifier(index, { color: event.target.value })}>{thresholdColors.map(([value, label]) => <option key={value} value={value} style={thresholdOptionStyles[value]}>{label}</option>)}</select>
          <button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)}>x</button>
          <input className="threshold-label-input" value={seuil.label || ''} placeholder="Texte affiché" onChange={(event) => modifier(index, { label: event.target.value })} />
          {afficherSon && <div className="threshold-sound-toggle">
            <span>Son</span>
            <SelecteurSon
              soundId={seuil.sound ? seuil.soundId || 'beep' : 'none'}
              soundUrl={seuil.soundUrl || ''}
              onChanger={(patch) => modifier(index, { ...patch, sound: patch.soundId !== 'none', soundId: patch.soundId === 'none' ? 'beep' : patch.soundId })}
            />
          </div>}
          {afficherCible && <span className="threshold-warning">{libelleCibleSeuil(compteur, seuil)}</span>}
        </div>
      ))}
    </div>
  );
}

export function CompteurGlobal({ compteur, onChanger, onToggleTemps, animationTick }) {
  const [tick, setTick] = useState(0);
  const [seuilsMemorises, setSeuilsMemorises] = useState([]);
  const seuilsSonoresJoues = useRef(new Set());
  const minuteurTermineJoue = useRef(false);
  const dernierCycleSonore = useRef(0);
  const seuilsActifs = compteur?.enabled ? activeGlobalTrackerThresholds(compteur) : [];
  const signatureSeuilsActifs = seuilsActifs.map(cleSeuil).join('|');
  const tempsActuel = compteur?.enabled && estTempsReel(compteur) ? etatTempsReel(compteur) : null;

  useEffect(() => {
    if (!compteur?.enabled || !estTempsReel(compteur) || !compteur.running) return undefined;
    const id = window.setInterval(() => setTick((value) => value + 1), 1000);
    return () => window.clearInterval(id);
  }, [compteur?.enabled, compteur?.mode, compteur?.running]);

  useEffect(() => {
    if (!compteur?.enabled) return;
    const now = Date.now();
    setSeuilsMemorises((courants) => {
      const encoreVisibles = courants.filter((seuil) => seuil.visibleUntil > now);
      const prochains = estTempsReel(compteur)
        ? seuilsActifs
          .filter((seuil) => (seuil.operator || '') === 'eq')
          .map((seuil) => ({ ...seuil, visibleUntil: now + 10000 }))
        : [];
      const fusion = [...encoreVisibles];
      prochains.forEach((seuil) => {
        const key = cleSeuil(seuil);
        const index = fusion.findIndex((memo) => cleSeuil(memo) === key);
        if (index >= 0) fusion[index] = seuil;
        else fusion.push(seuil);
      });
      const avant = courants.map((seuil) => `${cleSeuil(seuil)}:${seuil.visibleUntil}`).join('|');
      const apres = fusion.map((seuil) => `${cleSeuil(seuil)}:${seuil.visibleUntil}`).join('|');
      return avant === apres ? courants : fusion;
    });
    seuilsActifs.filter((seuil) => estTempsReel(compteur) && seuil.sound).forEach((seuil) => {
      const key = cleSeuil(seuil);
      if (seuilsSonoresJoues.current.has(key)) return;
      seuilsSonoresJoues.current.add(key);
      jouerSonSuiviGlobal({ soundId: seuil.soundId, soundUrl: seuil.soundUrl });
    });
    const actifs = new Set(seuilsActifs.map(cleSeuil));
    seuilsSonoresJoues.current.forEach((key) => {
      if (!actifs.has(key)) seuilsSonoresJoues.current.delete(key);
    });
  }, [compteur?.enabled, compteur?.mode, compteur?.running, signatureSeuilsActifs, tick]);

  useEffect(() => {
    if (compteur?.mode === 'timer' && tempsActuel?.termine && compteur.soundOnComplete) {
      const cycle = tempsActuel.boucles || 1;
      const repeterParCycle = compteur.limitMode === 'loop' || compteur.limitMode === 'restart';
      const dejaJoue = repeterParCycle ? dernierCycleSonore.current >= cycle : minuteurTermineJoue.current;
      if (!dejaJoue) {
        minuteurTermineJoue.current = true;
        dernierCycleSonore.current = cycle;
        jouerSonSuiviGlobal({ soundId: compteur.completeSoundId, soundUrl: compteur.completeSoundUrl });
      }
    }
    if (compteur?.mode !== 'timer' || !tempsActuel?.termine) {
      minuteurTermineJoue.current = false;
      dernierCycleSonore.current = 0;
    }
  }, [compteur?.mode, compteur?.limitMode, compteur?.soundOnComplete, compteur?.completeSoundId, compteur?.completeSoundUrl, tempsActuel?.termine, tempsActuel?.boucles]);

  const maintenant = Date.now();
  const seuilsAffiches = [
    ...seuilsActifs,
    ...seuilsMemorises.filter((memo) => memo.visibleUntil > maintenant && !seuilsActifs.some((seuil) => cleSeuil(seuil) === cleSeuil(memo))).map((memo) => ({ ...memo, memorise: true })),
  ];
  const classeSeuils = seuilsAffiches.length ? 'threshold-glow' : '';
  const classeCouleurSeuil = seuilsAffiches.length ? `threshold-glow-${seuilsAffiches[0]?.color || 'neutral'}` : '';
  const classeCouleurSecondaire = seuilsAffiches[1] ? `threshold-glow-secondary-${seuilsAffiches[1]?.color || 'neutral'}` : '';
  const styleSeuils = styleSeuilsGlobaux(seuilsAffiches);

  if (!compteur?.enabled) return null;
  if (estTempsReel(compteur)) {
    const temps = tempsActuel;
    return (
      <div className={`global-mini realtime ${classeSeuils} ${classeCouleurSeuil} ${classeCouleurSecondaire} ${compteur.running ? 'auto-active' : ''} ${temps.termine ? 'timer-alert cycle-complete' : ''} ${temps.depasse ? 'overflowing' : ''}`} style={styleSeuils}>
        <div className="global-mini-main">
          <span>{compteur.name || (compteur.mode === 'timer' ? 'Minuteur' : 'Chrono')}</span>
          <SeuilsGlobauxActifs seuils={seuilsAffiches} />
          <button
            className={`clock-face global-clock realtime-clock ${compteur.mode === 'stopwatch' ? 'counter-mode' : ''} ${temps.termine ? 'cycle-complete' : ''}`}
            style={{ '--clock-progress': `${temps.progression * 360}deg` }}
            onClick={onToggleTemps}
            aria-label={compteur.running ? 'Mettre le temps en pause' : 'Reprendre le temps'}
          >
            <span>{temps.affichage}</span>
          </button>
          {temps.depasse && <em className="overflow-badge">retard</em>}
          {compteur.mode === 'timer' && (compteur.limitMode === 'restart' || compteur.limitMode === 'loop') && temps.boucles > 0 && <em className="overflow-badge">x{temps.boucles}</em>}
        </div>
      </div>
    );
  }

  const { maximum, valeur, total, boucle, deborde, ratioDebordement, cyclesComplets, cycleExact, progression } = calculerEtatCompteur(compteur);

  return (
    <div className={`global-mini ${classeSeuils} ${classeCouleurSeuil} ${classeCouleurSecondaire} ${compteur.auto ? 'auto-active' : ''} ${animationTick ? 'auto-tick' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`} style={styleSeuils}>
      <BoutonPasCompteur pas={-1} onChanger={onChanger}>-</BoutonPasCompteur>
      <div className="global-mini-main">
        <span>{compteur.name || 'Menace'}</span>
        <SeuilsGlobauxActifs seuils={seuilsAffiches} />
        <div
          className={`clock-face global-clock ${compteur.mode === 'counter' ? 'counter-mode' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}
          style={{ '--clock-progress': `${progression * 360}deg`, '--overflow-progress': `${ratioDebordement * 360}deg` }}
          aria-label="Indicateur de scène"
        >
          <span>{valeur}</span>
          {compteur.mode === 'clock' && <small>/{maximum}</small>}
        </div>
        {deborde && <em className="overflow-badge">x{cyclesComplets}</em>}
        {animationTick && <em className="auto-plus">+1</em>}
        {boucle && cyclesComplets > 0 && <em className="overflow-badge">x{cyclesComplets}</em>}
        {boucle && <em className="global-total-badge">{total}</em>}
      </div>
      <BoutonPasCompteur pas={1} onChanger={onChanger}>+</BoutonPasCompteur>
    </div>
  );
}

export function FenetreCompteurGlobal({ compteur, sceneCounterTemplates = [], onModifier, onChanger, onFermer }) {
  const [templateId, setTemplateId] = useState(sceneCounterTemplates[0]?.id || '');
  const courant = { ...COMPTEUR_GLOBAL_PAR_DEFAUT, ...(compteur || {}) };
  const modifier = (valeur) => onModifier({ ...courant, ...valeur });
  const mode = courant.mode || 'clock';
  const estCompteur = mode === 'counter';
  const estHorloge = mode === 'clock';
  const estMinuteur = mode === 'timer';
  const estChronometre = mode === 'stopwatch';
  const tempsReel = estTempsReel(courant);
  const temps = tempsReel ? etatTempsReel(courant) : null;
  const templateChoisi = sceneCounterTemplates.find((template) => template.id === templateId) || null;
  const demarrer = () => modifier({ running: true, startedAt: Date.now(), trigger: 'realtime' });
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
    <Fenetre title="Indicateur de scène" onClose={onFermer}>
      <div className="stack">
        {sceneCounterTemplates.length > 0 && (
          <div className="template-picker-row">
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} aria-label="Modèle d’indicateur de scène">
              {sceneCounterTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <button className="small-btn" onClick={appliquerTemplate} disabled={!templateChoisi}>Utiliser</button>
          </div>
        )}
        <label className="row"><input type="checkbox" checked={!!courant.enabled} onChange={(event) => modifier({ enabled: event.target.checked })} /> visible dans l’en-tête</label>
        <label className="field">Nom<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder="Menace" /></label>
        <div className="grid2">
          <label className="field">Type<select value={mode} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, trigger: ['stopwatch', 'timer'].includes(event.target.value) ? 'realtime' : 'manual' })}><option value="clock">Horloge</option><option value="counter">Compteur</option><option value="stopwatch">Chronomètre</option><option value="timer">Minuteur</option></select></label>
          {estCompteur && <label className="field">Valeur<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {estHorloge && <label className="field">Valeur actuelle<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {estMinuteur && <ChampsTemps prefixe="duree " totalSecondes={courant.max ?? 60} onChanger={(value) => modifier({ max: Math.max(1, value) })} />}
        </div>
        {estHorloge && <label className="field">Segments<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {estHorloge && <div className="grid2">
          <label className="field">Sens<select value={courant.direction || 'progression'} onChange={(event) => modifier({ direction: event.target.value })}><option value="progression">Progression</option><option value="countdown">Countdown</option></select></label>
          <label className="field">Quand avancer<select value={courant.trigger || (courant.auto ? 'round' : 'manual')} onChange={(event) => modifier({ trigger: event.target.value, auto: event.target.value === 'round' })}><option value="manual">Manuel</option><option value="round">Nouveau round</option>{courant.trigger === 'phase' && <option value="phase" disabled>Ancien réglage : nouvelle phase</option>}</select></label>
        </div>}
        {estHorloge && courant.trigger === 'phase' && <p className="rule-warning">Ce réglage historique est conservé mais inactif. Les phases ne font plus avancer les horloges.</p>}
        {estHorloge && <label className="field">Limite<select value={courant.limitMode || 'clamp'} onChange={(event) => modifier({ limitMode: event.target.value })}><option value="clamp">Bloquer</option><option value="overflow">Dépasser</option><option value="loop">Boucler</option><option value="restart">Redémarrer</option></select></label>}
        {estHorloge && courant.limitMode === 'loop' && <div className="grid2"><label className="field">Total<input type="number" inputMode="numeric" value={courant.total ?? courant.current ?? 0} onChange={(event) => modifier({ total: Math.max(0, Number(event.target.value) || 0) })} /></label><label className="field">Boucles<input type="number" inputMode="numeric" value={courant.loops ?? 0} onChange={(event) => modifier({ loops: Math.max(0, Number(event.target.value) || 0) })} /></label></div>}
        {estMinuteur && <label className="field">Fin du minuteur<select value={courant.limitMode || 'clamp'} onChange={(event) => modifier({ limitMode: event.target.value })}><option value="clamp">Bloquer</option><option value="restart">Redémarrer</option><option value="loop">Boucler</option><option value="overflow">Dépasser</option></select></label>}
        {estMinuteur && <div className="threshold-sound-toggle completion-sound-toggle">
          <span>Son à la fin</span>
          <SelecteurSon
            soundId={courant.soundOnComplete ? courant.completeSoundId || 'beep' : 'none'}
            soundUrl={courant.completeSoundUrl || ''}
            onChanger={(patch) => modifier({ soundOnComplete: patch.soundId !== 'none', completeSoundId: patch.soundId === 'none' ? 'beep' : patch.soundId, completeSoundUrl: patch.soundUrl || '' })}
          />
        </div>}
        {tempsReel && <div className="timer-control-panel">
          <strong>{temps.affichage}</strong>
          {estChronometre && <p className="muted compact-help">Temps écoulé.</p>}
          <div className="grid2">
            <button className="primary" onClick={courant.running ? pause : demarrer}>{courant.running ? 'Pause' : courant.elapsedMs > 0 ? 'Reprendre' : 'Démarrer'}</button>
            <button className="small-btn" onClick={resetTemps}>Remettre à zéro</button>
          </div>
        </div>}
        <details className="advanced-options" open>
          <summary>Seuils</summary>
          <EditeurSeuilsCompteurScene compteur={courant} onModifier={modifier} />
        </details>
        <button className="primary" onClick={onFermer}>Valider</button>
      </div>
    </Fenetre>
  );
}
