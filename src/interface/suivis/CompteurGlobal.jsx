import { useEffect, useRef, useState } from 'react';
import { activeGlobalTrackerThresholds, elapsedGlobalTrackerMs, globalThresholdValue, globalTrackerTimerState, normalizeGlobalThresholds } from '../../domain/globalTracker.js';
import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

const COMPTEUR_GLOBAL_PAR_DEFAUT = {
  enabled: false,
  name: t('trackers.global.defaultName'),
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
  ['neutral', 'trackers.global.thresholds.color.neutral'],
  ['green', 'trackers.global.thresholds.color.green'],
  ['amber', 'trackers.global.thresholds.color.amber'],
  ['red', 'trackers.global.thresholds.color.red'],
  ['blue', 'trackers.global.thresholds.color.blue'],
  ['violet', 'trackers.global.thresholds.color.violet'],
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
const thresholdOperatorsByMode = {
  timer: [
    ['lte', '<='],
    ['lt', '<'],
  ],
  stopwatch: [
    ['gte', '>='],
    ['gt', '>'],
  ],
};
const thresholdBases = {
  timer: [
    ['fixed', 'trackers.global.thresholds.basis.fixed'],
    ['percent', 'trackers.global.thresholds.basis.percent'],
  ],
};
const thresholdScopes = [
  ['current', 'trackers.global.thresholds.scope.current'],
  ['loops', 'trackers.global.thresholds.scope.loops'],
];
const soundChoices = [
  ['none', 'trackers.global.thresholds.sound.none'],
  ['beep', 'trackers.global.thresholds.sound.beep'],
  ['chime', 'trackers.global.thresholds.sound.chime'],
  ['alarm', 'trackers.global.thresholds.sound.alarm'],
  ['custom', 'trackers.global.thresholds.sound.custom'],
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

function uniteTemps(valeur, singulier, pluriel) {
  return t(valeur === 1 ? singulier : pluriel);
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

function operateursSeuil(mode, scope = 'current') {
  if (scope === 'loops') return thresholdOperatorsByMode.stopwatch;
  return thresholdOperatorsByMode[mode] || thresholdOperators;
}

function operateurSeuilValide(mode, scope, operator) {
  const operateurs = operateursSeuil(mode, scope);
  return operateurs.some(([value]) => value === operator) ? operator : operateurs[0][0];
}

function libelleCibleSeuil(compteur, seuil) {
  if (compteur.mode !== 'timer') return '';
  if (seuil.scope === 'loops') {
    return t('trackers.global.thresholds.target.loop', { value: seuil.value, suffix: Number(seuil.value) > 1 ? 's' : '' });
  }
  const cible = globalThresholdValue(compteur, seuil);
  if (seuil.basis === 'percent') return t('trackers.global.thresholds.target.percent', { value: seuil.value, target: cible });
  return t('trackers.global.thresholds.target.fixed', { target: cible });
}

function ChampsTemps({ totalSecondes, onChanger, prefixe = '' }) {
  const temps = convertirSecondesEnTemps(totalSecondes);
  const changerMinutes = (event) => onChanger(totalSecondesDepuisTemps(event.target.value, temps.secondes));
  const changerSecondes = (event) => onChanger(totalSecondesDepuisTemps(temps.minutes, event.target.value));
  return (
    <div className="time-pair-fields">
      <label className="field">{prefixe}{uniteTemps(temps.minutes, 'trackers.global.unit.minute', 'trackers.global.unit.minutes')}<input type="number" inputMode="numeric" min="0" value={temps.minutes} onChange={changerMinutes} /></label>
      <label className="field">{prefixe}{uniteTemps(temps.secondes, 'trackers.global.unit.second', 'trackers.global.unit.seconds')}<input type="number" inputMode="numeric" min="0" value={temps.secondes} onChange={changerSecondes} /></label>
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
      {valeur !== 'none' && <button className="small-btn" type="button" onClick={() => jouerSonSuiviGlobal({ soundId: valeur, soundUrl })}>{t('trackers.global.thresholds.sound.test')}</button>}
      {valeur === 'custom' && <input type="file" accept="audio/*" onChange={lireFichier} />}
    </div>
  );
}

export function EditeurSeuilsCompteurScene({ compteur, onModifier }) {
  const seuils = normalizeGlobalThresholds(compteur.thresholds).map((seuil) => ({ ...seuil, operator: operateurSeuilValide(compteur.mode || 'clock', seuil.scope || 'current', seuil.operator) }));
  const mode = compteur.mode || 'clock';
  const bases = thresholdBases[mode] || [];
  const afficherBase = bases.length > 0;
  const afficherCible = mode === 'timer';
  const afficherScope = (mode === 'clock' || mode === 'timer') && compteur.limitMode === 'loop';
  const afficherSon = mode === 'timer' || mode === 'stopwatch';
  const aide = mode === 'timer'
    ? t('trackers.global.thresholds.help.timer')
    : mode === 'stopwatch'
      ? t('trackers.global.thresholds.help.stopwatch')
      : mode === 'counter'
        ? t('trackers.global.thresholds.help.counter')
        : t('trackers.global.thresholds.help.clock');
  const modifier = (index, patch) => onModifier({ thresholds: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onModifier({ thresholds: [...seuils, { value: 0, label: '', color: 'neutral', operator: operateurSeuilValide(mode, 'current', ''), basis: 'fixed', scope: 'current', sound: false, soundId: 'beep', soundUrl: '' }] });
  const supprimer = (index) => onModifier({ thresholds: seuils.filter((_, position) => position !== index) });

  return (
    <div className="threshold-editor global-threshold-editor">
      <div className="line-count-row"><label>{t('trackers.global.thresholds.label')}</label></div>
      <p className="muted compact-help">{aide}</p>
      {seuils.map((seuil, index) => (
        <div className={`threshold-edit-row ${afficherScope ? 'has-target' : ''} ${afficherBase && (seuil.scope || 'current') !== 'loops' ? 'has-basis' : ''}`} key={index}>
          <button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)}>x</button>
          <div className="threshold-numeric-row">
            {afficherScope && <select className="threshold-target-select" value={seuil.scope || 'current'} onChange={(event) => modifier(index, { scope: event.target.value, basis: event.target.value === 'loops' ? 'fixed' : seuil.basis, operator: operateurSeuilValide(mode, event.target.value, seuil.operator) })}>{thresholdScopes.map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}</select>}
            <select className="threshold-operator-select" value={operateurSeuilValide(mode, seuil.scope || 'current', seuil.operator)} onChange={(event) => modifier(index, { operator: event.target.value })}>{operateursSeuil(mode, seuil.scope || 'current').map(([value]) => <option key={value} value={value}>{value === 'gte' ? '>=' : value === 'lte' ? '<=' : value === 'gt' ? '>' : value === 'lt' ? '<' : '='}</option>)}</select>
            {afficherBase && (seuil.scope || 'current') !== 'loops' && <select className="threshold-basis-select" value={seuil.basis || 'fixed'} onChange={(event) => modifier(index, { basis: event.target.value })}>{bases.map(([value, labelKey]) => <option key={value} value={value}>{t(labelKey)}</option>)}</select>}
            {(mode === 'timer' || mode === 'stopwatch') && (seuil.basis || 'fixed') === 'fixed' && (seuil.scope || 'current') !== 'loops'
              ? <ChampsTemps totalSecondes={seuil.value ?? 0} onChanger={(value) => modifier(index, { value })} />
              : <input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} onChange={(event) => modifier(index, { value: Number(event.target.value) })} />}
          </div>
          <div className="threshold-label-row">
            <div className="threshold-label-stack">
              <input className="threshold-label-input" value={seuil.label || ''} placeholder={t('trackers.global.thresholds.placeholder')} onChange={(event) => modifier(index, { label: event.target.value })} />
              {afficherCible && <span className="threshold-warning">{libelleCibleSeuil(compteur, seuil)}</span>}
            </div>
            <select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(event) => modifier(index, { color: event.target.value })}>{thresholdColors.map(([value, labelKey]) => <option key={value} value={value} style={thresholdOptionStyles[value]}>{t(labelKey)}</option>)}</select>
          </div>
          {afficherSon && <div className="threshold-sound-toggle">
            <span>{t('trackers.global.thresholds.sound.label')}</span>
            <SelecteurSon
              soundId={seuil.sound ? seuil.soundId || 'beep' : 'none'}
              soundUrl={seuil.soundUrl || ''}
              onChanger={(patch) => modifier(index, { ...patch, sound: patch.soundId !== 'none', soundId: patch.soundId === 'none' ? 'beep' : patch.soundId })}
            />
          </div>}
        </div>
      ))}
      <div className="threshold-add-row"><button className="small-btn" onClick={ajouter}>{t('trackers.global.thresholds.add')}</button></div>
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
          <span>{compteur.name || (compteur.mode === 'timer' ? t('trackers.global.defaultTimer') : t('trackers.global.defaultStopwatch'))}</span>
          <SeuilsGlobauxActifs seuils={seuilsAffiches} />
          <button
            className={`clock-face global-clock realtime-clock ${compteur.mode === 'stopwatch' ? 'counter-mode' : ''} ${temps.termine ? 'cycle-complete' : ''}`}
            style={{ '--clock-progress': `${temps.progression * 360}deg` }}
            onClick={onToggleTemps}
            aria-label={compteur.running ? t('trackers.global.realtimePause') : t('trackers.global.realtimeResume')}
          >
            <span>{temps.affichage}</span>
          </button>
          {temps.depasse && <em className="overflow-badge">{t('trackers.global.realtimeLate')}</em>}
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
        <span>{compteur.name || t('trackers.global.defaultName')}</span>
        <SeuilsGlobauxActifs seuils={seuilsAffiches} />
        <div
          className={`clock-face global-clock ${compteur.mode === 'counter' ? 'counter-mode' : ''} ${cycleExact ? 'cycle-complete' : ''} ${deborde ? 'overflowing' : ''}`}
          style={{ '--clock-progress': `${progression * 360}deg`, '--overflow-progress': `${ratioDebordement * 360}deg` }}
          aria-label={t('trackers.global.realtimeLabel')}
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

export function FenetreCompteurGlobal({ compteur, sceneCounterTemplates = [], onModifier, onChanger, onFermer, onSaveTemplate }) {
  const [templateId, setTemplateId] = useState(sceneCounterTemplates[0]?.id || '');
  const [templateMessage, setTemplateMessage] = useState('');
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
    setTemplateMessage('');
  };
  const enregistrerTemplate = () => {
    const template = onSaveTemplate?.(courant);
    if (template) {
      setTemplateId(template.id);
      setTemplateMessage(t('templates.editor.saved', { name: template.name }));
    }
  };
  useEffect(() => {
    if (!templateId && sceneCounterTemplates[0]?.id) setTemplateId(sceneCounterTemplates[0].id);
    if (templateId && !sceneCounterTemplates.some((template) => template.id === templateId)) setTemplateId(sceneCounterTemplates[0]?.id || '');
  }, [sceneCounterTemplates, templateId]);

  return (
    <Fenetre title={t('trackers.global.title')} onClose={onFermer}>
      <div className="stack">
        {sceneCounterTemplates.length > 0 && (
          <div className="template-picker-row">
            <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} aria-label={t('trackers.global.templateLabel')}>
              {sceneCounterTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
            </select>
            <button className="small-btn" onClick={appliquerTemplate} disabled={!templateChoisi}>{t('common.use')}</button>
          </div>
        )}
        <label className="row"><input type="checkbox" checked={!!courant.enabled} onChange={(event) => modifier({ enabled: event.target.checked })} /> {t('trackers.global.visibleHeader')}</label>
        <label className="field">{t('common.name')}<input value={courant.name || ''} onChange={(event) => modifier({ name: event.target.value })} placeholder={t('trackers.global.defaultName')} /></label>
        <div className="grid2">
          <label className="field">{t('trackers.global.mode')}<select value={mode} onChange={(event) => modifier({ mode: event.target.value, running: false, startedAt: null, trigger: ['stopwatch', 'timer'].includes(event.target.value) ? 'realtime' : 'manual' })}><option value="clock">{t('trackers.global.mode.clock')}</option><option value="counter">{t('trackers.global.mode.counter')}</option><option value="stopwatch">{t('trackers.global.mode.stopwatch')}</option><option value="timer">{t('trackers.global.mode.timer')}</option></select></label>
          {estCompteur && <label className="field">{t('trackers.global.value')}<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {estHorloge && <label className="field">{t('trackers.global.valueCurrent')}<input type="number" inputMode="numeric" value={courant.current ?? 0} onChange={(event) => modifier({ current: event.target.value === '' ? 0 : Number(event.target.value) })} /></label>}
          {estMinuteur && <ChampsTemps prefixe={t('trackers.global.durationPrefix')} totalSecondes={courant.max ?? 60} onChanger={(value) => modifier({ max: Math.max(1, value) })} />}
        </div>
        {estHorloge && <label className="field">{t('trackers.global.segments')}<input type="number" inputMode="numeric" min="1" value={courant.max ?? 10} onChange={(event) => modifier({ max: Math.max(1, Number(event.target.value) || 1) })} /></label>}
        {estHorloge && <div className="grid2">
          <label className="field">{t('trackers.global.direction')}<select value={courant.direction || 'progression'} onChange={(event) => modifier({ direction: event.target.value })}><option value="progression">{t('trackers.global.direction.progression')}</option><option value="countdown">{t('trackers.global.direction.countdown')}</option></select></label>
          <label className="field">{t('trackers.global.advanceWhen')}<select value={courant.trigger || (courant.auto ? 'round' : 'manual')} onChange={(event) => modifier({ trigger: event.target.value, auto: event.target.value === 'round' })}><option value="manual">{t('trackers.global.trigger.manual')}</option><option value="round">{t('trackers.global.trigger.round')}</option>{courant.trigger === 'phase' && <option value="phase" disabled>{t('trackers.global.trigger.legacyPhase')}</option>}</select></label>
        </div>}
        {estHorloge && courant.trigger === 'phase' && <p className="rule-warning">{t('trackers.global.trigger.legacyHelp')}</p>}
        {estHorloge && <label className="field">{t('trackers.global.limit')}<select value={courant.limitMode || 'clamp'} onChange={(event) => modifier({ limitMode: event.target.value })}><option value="clamp">{t('trackers.global.limit.clamp')}</option><option value="overflow">{t('trackers.global.limit.overflow')}</option><option value="loop">{t('trackers.global.limit.loop')}</option><option value="restart">{t('trackers.global.limit.restart')}</option></select></label>}
        {estHorloge && courant.limitMode === 'loop' && <div className="grid2"><label className="field">{t('trackers.global.loop.total')}<input type="number" inputMode="numeric" value={courant.total ?? courant.current ?? 0} onChange={(event) => modifier({ total: Math.max(0, Number(event.target.value) || 0) })} /></label><label className="field">{t('trackers.global.loop.count')}<input type="number" inputMode="numeric" value={courant.loops ?? 0} onChange={(event) => modifier({ loops: Math.max(0, Number(event.target.value) || 0) })} /></label></div>}
        {estMinuteur && <label className="field">{t('trackers.global.timer.label')}<select value={courant.limitMode || 'clamp'} onChange={(event) => modifier({ limitMode: event.target.value })}><option value="clamp">{t('trackers.global.limit.clamp')}</option><option value="restart">{t('trackers.global.limit.restart')}</option><option value="loop">{t('trackers.global.limit.loop')}</option><option value="overflow">{t('trackers.global.limit.overflow')}</option></select></label>}
        {estMinuteur && <div className="threshold-sound-toggle completion-sound-toggle">
          <span>{t('trackers.global.timer.completeSound')}</span>
          <SelecteurSon
            soundId={courant.soundOnComplete ? courant.completeSoundId || 'beep' : 'none'}
            soundUrl={courant.completeSoundUrl || ''}
            onChanger={(patch) => modifier({ soundOnComplete: patch.soundId !== 'none', completeSoundId: patch.soundId === 'none' ? 'beep' : patch.soundId, completeSoundUrl: patch.soundUrl || '' })}
          />
        </div>}
        {tempsReel && <div className="timer-control-panel">
          <strong>{temps.affichage}</strong>
          {estChronometre && <p className="muted compact-help">{t('trackers.global.timer.elapsedHelp')}</p>}
          <div className="grid2">
            <button className="primary" onClick={courant.running ? pause : demarrer}>{courant.running ? t('trackers.global.actions.pause') : courant.elapsedMs > 0 ? t('trackers.global.actions.resume') : t('trackers.global.actions.start')}</button>
            <button className="small-btn" onClick={resetTemps}>{t('trackers.global.actions.reset')}</button>
          </div>
        </div>}
        <details className="advanced-options" open>
          <summary>{t('trackers.global.thresholds.summary')}</summary>
          <EditeurSeuilsCompteurScene compteur={courant} onModifier={modifier} />
        </details>
        {onSaveTemplate && <button className="small-btn" onClick={enregistrerTemplate}>{t('templates.editor.sceneCounter.saveCurrent')}</button>}
        {templateMessage && <p className="export-feedback">{templateMessage}</p>}
        <button className="primary" onClick={onFermer}>{t('trackers.global.actions.validate')}</button>
      </div>
    </Fenetre>
  );
}
