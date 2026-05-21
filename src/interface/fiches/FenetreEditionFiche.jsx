import { useState } from 'react';
import { colorNames, participantKinds, trackerTypeLabels } from '../../constants.js';
import { boxVisualRank, clone, colors, cycleBoxMark, isBoxesTracker, isNumericTracker, isPointsTracker, isVisible, newTracker, normalizeThresholds, resetTracker, symbols, uid } from '../../logic.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreConfirmationSuppression } from '../dialogues/FenetreConfirmationSuppression.jsx';
import { IconeOeilMystiqueFerme, IconeOeilMystiqueOuvert } from '../icones/IconesOeilMystique.jsx';
import { normaliserInfoRapide, normaliserInfosRapides, serialiserInfosRapides } from './InfosRapides.jsx';

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
  ['eq', '='],
];

function entierPositif(valeur, defaut = 1) {
  if (valeur === '') return defaut;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? Math.max(1, nombre) : defaut;
}

function nombreOuDefaut(valeur, defaut = 0) {
  if (valeur === '') return defaut;
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function normaliserFiche(brouillon) {
  return {
    ...brouillon,
    stats: serialiserInfosRapides(brouillon.stats),
    initiative: nombreOuDefaut(brouillon.initiative, 0),
    departage: brouillon.departage === '' ? '' : nombreOuDefaut(brouillon.departage, 0),
    trackers: brouillon.trackers.map((suivi) => {
      if (isBoxesTracker(suivi)) {
        return {
          ...suivi,
          fillLevels: entierPositif(suivi.fillLevels, 1),
          rows: (suivi.rows || []).map((ligne) => ({ ...ligne, marks: ligne.marks?.length ? ligne.marks : [0] })),
          resetRule: normaliserResetRule(suivi),
        };
      }
      if (suivi.type === 'number') {
        return {
          ...suivi,
          current: nombreOuDefaut(suivi.current, 0),
          initial: nombreOuDefaut(suivi.initial, suivi.current ?? 0),
          step: entierPositif(suivi.step, 1),
          counterSize: ['compact', 'normal', 'wide'].includes(suivi.counterSize) ? suivi.counterSize : 'compact',
          thresholds: normalizeThresholds(suivi.thresholds),
          resetRule: normaliserResetRule(suivi),
          counters: (suivi.counters || []).map((compteur) => ({
            ...compteur,
            id: compteur.id || uid('counter'),
            label: compteur.label || 'Compteur',
            current: nombreOuDefaut(compteur.current, 0),
            initial: nombreOuDefaut(compteur.initial, compteur.current ?? 0),
            min: compteur.min === '' ? '' : compteur.min ?? '',
            max: compteur.max === '' ? '' : compteur.max ?? '',
            step: entierPositif(compteur.step, 1),
            size: ['compact', 'normal', 'wide'].includes(compteur.size) ? compteur.size : 'normal',
          })),
        };
      }
      const seuilsPuces = isPointsTracker(suivi) ? {
        currentThresholds: normalizeThresholds(suivi.currentThresholds || suivi.thresholds),
        totalThresholds: normalizeThresholds(suivi.totalThresholds),
        cyclesInitial: nombreOuDefaut(suivi.cyclesInitial, 0),
        cyclesMin: suivi.cyclesMin === '' ? null : suivi.cyclesMin,
        cyclesMax: suivi.cyclesMax === '' ? null : suivi.cyclesMax,
      } : {};
      const seuilsHorloge = suivi.type === 'clock' ? {
        currentThresholds: normalizeThresholds(suivi.currentThresholds || suivi.thresholds),
        totalThresholds: normalizeThresholds(suivi.totalThresholds),
      } : {};
      return {
        ...suivi,
        ...seuilsPuces,
        ...seuilsHorloge,
        current: nombreOuDefaut(suivi.current, 0),
        initial: nombreOuDefaut(suivi.initial, suivi.type === 'bar' ? suivi.max ?? suivi.current ?? 0 : 0),
        max: suivi.max === null ? null : entierPositif(suivi.max, 1),
        min: suivi.min === null ? null : nombreOuDefaut(suivi.min, 0),
        step: entierPositif(suivi.step, 1),
        thresholds: normalizeThresholds(suivi.thresholds),
        resetRule: normaliserResetRule(suivi),
      };
    }),
  };
}

function normaliserResetRule(suivi) {
  const rule = suivi.resetRule || {};
  return {
    mode: ['initial', 'zero', 'max', 'checked', 'delta', 'boxDelta', 'towardDefault'].includes(rule.mode) ? rule.mode : 'towardDefault',
    delta: nombreOuDefaut(rule.delta, isBoxesTracker(suivi) ? -1 : 1),
    step: nombreOuDefaut(rule.step, isBoxesTracker(suivi) ? -1 : 1),
    stepMode: rule.stepMode === 'percent' ? 'percent' : 'flat',
    pointsAutoMode: ['increase', 'decrease', 'default'].includes(rule.pointsAutoMode) ? rule.pointsAutoMode : 'default',
    counterRules: rule.counterRules && typeof rule.counterRules === 'object' ? rule.counterRules : {},
    boxRows: rule.boxRows && typeof rule.boxRows === 'object' ? rule.boxRows : {},
    minCap: rule.minCap === '' ? '' : rule.minCap ?? '',
    maxCap: rule.maxCap === '' ? '' : rule.maxCap ?? '',
    overflowTrimPercent: nombreOuDefaut(rule.overflowTrimPercent, 0),
    excessReductionPercent: rule.excessReductionPercent === '' ? '' : rule.excessReductionPercent ?? '',
    rounding: ['nearest', 'floor', 'ceil'].includes(rule.rounding) ? rule.rounding : 'nearest',
    amount: entierPositif(rule.amount, 1),
    skipLevels: Array.isArray(rule.skipLevels) ? rule.skipLevels.map(Number).filter((level) => Number.isFinite(level) && level > 0) : [],
    targetRowId: rule.targetRowId || suivi.rows?.[0]?.id || '',
    after: ['none', 'zero', 'max', 'initial'].includes(rule.after) ? rule.after : 'none',
  };
}

function retirerCase(marques = []) {
  return marques.length > 1 ? marques.slice(0, -1) : marques;
}

function ajouterCase(marques = []) {
  return [...marques, 0];
}

function ApercuCases({ marques, niveaux }) {
  const maximum = entierPositif(niveaux, 5);
  return <div className="boxes-preview">{marques.map((valeur, index) => <span key={index} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function ApercuNiveaux({ niveaux }) {
  const maximum = entierPositif(niveaux, 5);
  const marques = Array.from({ length: maximum + 1 }, (_, index) => index);
  return <div className="levels-preview">{marques.map((valeur) => <span key={valeur} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function ChampNombre({ label, valeur, onChange, placeholder = '' }) {
  return <label className="field">{label}<input type="number" inputMode="numeric" value={valeur ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></label>;
}

function EditeurCases({ suivi, onChange, resetOptions = null }) {
  const lignes = suivi.rows?.length ? suivi.rows : [{ id: uid('r'), label: 'Case 1', marks: [0] }];
  const mode = suivi.boxMode === 'free' ? 'free' : suivi.fillLevels === 1 ? 'sorted1' : 'sorted3';
  const niveaux = entierPositif(suivi.fillLevels, 1);
  const nomsDefaut = niveaux === 1 ? ['Marque'] : ['Leger', 'Normal', 'Grave', 'Critique', 'Fatal'];
  const libellesNiveaux = Array.from({ length: niveaux }, (_, index) => suivi.levelLabels?.[index] || nomsDefaut[index] || `Niveau ${index + 1}`);
  const modifierLigne = (ligneId, modification) => onChange({ ...suivi, rows: lignes.map((ligne) => ligne.id === ligneId ? modification(ligne) : ligne) });
  const ajouterLigne = () => onChange({ ...suivi, rows: [...lignes, { id: uid('r'), label: mode === 'free' ? `Case ${lignes.length + 1}` : `Ligne ${lignes.length + 1}`, marks: mode === 'free' ? [0] : [0, 0, 0] }] });
  const retirerLigne = (ligneId) => onChange({ ...suivi, rows: lignes.length > 1 ? lignes.filter((ligne) => ligne.id !== ligneId) : lignes });
  const changerNiveaux = (delta) => {
    const prochain = Math.max(1, Math.min(5, niveaux + delta));
    const labels = Array.from({ length: prochain }, (_, index) => suivi.levelLabels?.[index] || (prochain === 1 ? ['Marque'][index] : ['Leger', 'Normal', 'Grave', 'Critique', 'Fatal'][index]) || `Niveau ${index + 1}`);
    onChange({ ...suivi, fillLevels: prochain, levelLabels: mode !== 'free' ? labels : suivi.levelLabels, levelPriorities: Array.from({ length: prochain }, (_, index) => suivi.levelPriorities?.[index] || index + 1) });
  };
  const changerMode = (choix) => {
    const boxMode = choix === 'free' ? 'free' : 'sorted';
    const fillLevels = choix === 'sorted1' ? 1 : choix === 'sorted3' ? 3 : 1;
    onChange({
      ...suivi,
      boxMode,
      fillLevels,
      levelLabels: boxMode === 'free' ? [] : (fillLevels === 1 ? ['Marque'] : ['Leger', 'Normal', 'Grave']),
      levelPriorities: boxMode === 'free' ? [] : Array.from({ length: fillLevels }, (_, index) => index + 1),
      rows: boxMode === 'free' ? lignes.map((ligne) => ({ ...ligne, marks: ligne.marks?.length ? ligne.marks : [0] })) : [{ id: uid('r'), label: 'Ligne 1', marks: [0, 0, 0] }],
    });
  };
  const changerLibelleNiveau = (index, label) => onChange({ ...suivi, levelLabels: libellesNiveaux.map((courant, position) => position === index ? label : courant) });

  return <div className="box-editor"><label className="field">Famille de cases<select value={mode} onChange={(e) => changerMode(e.target.value)}><option value="free">Cases libres</option><option value="sorted1">Cases triees simples</option><option value="sorted3">Cases triees 3 niveaux</option></select></label>{mode === 'free' && <><div className="line-count-row"><label>Groupes de cases</label><strong>{lignes.length}</strong><button className="small-btn" onClick={ajouterLigne}>+ groupe</button></div><div className="stack">{lignes.map((ligne) => <div className="free-box-edit-line" key={ligne.id}><input value={ligne.label} placeholder="Nom" onChange={(e) => modifierLigne(ligne.id, (courante) => ({ ...courante, label: e.target.value }))} /><input type="number" inputMode="numeric" min="1" value={(ligne.marks || []).length || 1} onChange={(e) => modifierLigne(ligne.id, (courante) => ({ ...courante, marks: Array.from({ length: entierPositif(e.target.value, 1) }, (_, index) => courante.marks?.[index] || 0) }))} /><button className="small-btn subtle-danger" onClick={() => retirerLigne(ligne.id)} disabled={lignes.length <= 1}>x</button></div>)}</div><details className="advanced-options"><summary>Options avancees</summary><div className="box-level-row"><span>Niveaux de coche</span><button className="small-btn" onClick={() => changerNiveaux(-1)} disabled={niveaux <= 1}>-</button><ApercuNiveaux niveaux={niveaux} /><button className="small-btn" onClick={() => changerNiveaux(1)} disabled={niveaux >= 5}>+</button></div>{resetOptions}</details></>}{mode !== 'free' && <><div className="line-count-row"><label>Lignes du moniteur</label><strong>{lignes.length}</strong><button className="small-btn" onClick={ajouterLigne}>+ ligne</button></div><div className="stack">{lignes.map((ligne) => <div className="free-box-edit-line sorted-line-edit" key={ligne.id}><input value={ligne.label || ''} placeholder="Nom de ligne" onChange={(e) => modifierLigne(ligne.id, (courante) => ({ ...courante, label: e.target.value || 'Ligne' }))} /><input type="number" inputMode="numeric" min="1" value={(ligne.marks || []).length || 1} onChange={(e) => modifierLigne(ligne.id, (courante) => ({ ...courante, marks: Array.from({ length: entierPositif(e.target.value, 1) }, (_, index) => courante.marks?.[index] || 0) }))} /><button className="small-btn subtle-danger" onClick={() => retirerLigne(ligne.id)} disabled={lignes.length <= 1}>x</button></div>)}</div><p className="muted tracker-help">Les lignes se suivent dans une seule jauge. Cadence range les marques selon leur priorite.</p><details className="advanced-options"><summary>Options avancees</summary><label className="row"><input type="checkbox" checked={suivi.globalSort !== false} onChange={(e) => onChange({ ...suivi, globalSort: e.target.checked })} /> trier sur l'ensemble des lignes</label><div className="box-level-row"><span>Niveaux actifs</span><button className="small-btn" onClick={() => changerNiveaux(-1)} disabled={niveaux <= 1}>-</button><ApercuNiveaux niveaux={niveaux} /><button className="small-btn" onClick={() => changerNiveaux(1)} disabled={niveaux >= 5}>+</button></div>{niveaux > 1 && <div className="stack">{libellesNiveaux.map((label, index) => <div className="level-visual-row" key={index}><input value={label} onChange={(e) => changerLibelleNiveau(index, e.target.value)} /><span className={`box preview mark-${boxVisualRank(index + 1, niveaux)} ${boxVisualRank(index + 1, niveaux) >= 5 ? 'full' : ''}`} /></div>)}</div>}{resetOptions}</details></>}</div>;
}

function basculerInfoModifiable(info, modifiable) {
  if (!modifiable) return { label: [info.label, info.value].filter(Boolean).join(' '), value: '', editable: false };
  if (info.value) return { ...info, editable: true };
  return { ...normaliserInfoRapide(info.label), editable: true };
}

function EditeurInfosRapides({ stats = [], onChange }) {
  const lignes = stats.length ? stats : [{ label: '', value: '', editable: false }];
  const modifier = (index, patch) => onChange(lignes.map((info, position) => position === index ? { ...info, ...patch } : info));
  const supprimer = (index) => onChange(lignes.filter((_, position) => position !== index));
  const ajouter = () => onChange([...lignes, { label: '', value: '', editable: false }]);
  const changerTexte = (index, texte) => modifier(index, normaliserInfoRapide(texte));
  const changerModifiable = (index, checked) => onChange(lignes.map((info, position) => position === index ? basculerInfoModifiable(info, checked) : info));

  return <div className="stack quick-stats-editor">{lignes.map((info, index) => <div className={`quick-stat-row ${info.editable ? 'editable' : ''}`} key={index}>{info.editable ? <><input className="quick-stat-label-input" value={info.label} placeholder="Libelle" onChange={(e) => modifier(index, { label: e.target.value })} /><input className="quick-stat-value-input" value={info.value} placeholder="Valeur" onChange={(e) => modifier(index, { value: e.target.value })} /></> : <input value={[info.label, info.value].filter(Boolean).join(' ')} placeholder="CA 21, Attaque +6, Armure lourde..." onChange={(e) => changerTexte(index, e.target.value)} />}<label className="quick-stat-edit-toggle"><input type="checkbox" checked={!!info.editable} onChange={(e) => changerModifiable(index, e.target.checked)} /> valeur modifiable</label><button className="small-btn subtle-danger" onClick={() => supprimer(index)} disabled={lignes.length <= 1 && !info.label && !info.value}>x</button></div>)}<button className="small-btn" onClick={ajouter}>+ info rapide</button></div>;
}

function thresholdOutOfBounds(seuil, bounds = {}) {
  if (bounds.min !== null && bounds.min !== '' && bounds.min !== undefined && seuil.value < Number(bounds.min)) return true;
  if (bounds.max !== null && bounds.max !== '' && bounds.max !== undefined && seuil.value > Number(bounds.max)) return true;
  return false;
}

function EditeurSeuils({ suivi, onChange, field = 'thresholds', title = 'Seuils texte', bounds = {} }) {
  const seuils = suivi[field]?.length ? suivi[field] : [];
  const choixCompteurs = suivi.type === 'number' ? [{ id: '__main', label: suivi.name || 'Compteur principal' }, ...(suivi.counters || []).map((compteur) => ({ id: compteur.id, label: compteur.label || 'Compteur' }))] : [];
  const modifier = (index, patch) => onChange({ [field]: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onChange({ [field]: [...seuils, { value: 0, label: '', color: 'neutral', operator: 'gte', counterId: choixCompteurs[0]?.id || '' }] });
  const supprimer = (index) => onChange({ [field]: seuils.filter((_, position) => position !== index) });

  return <div className="threshold-editor"><div className="line-count-row"><label>{title}</label><button className="small-btn" onClick={ajouter}>+ seuil</button></div>{seuils.map((seuil, index) => <div className={`threshold-edit-row ${choixCompteurs.length ? 'has-target' : ''} ${thresholdOutOfBounds(seuil, bounds) ? 'out-of-bounds' : ''}`} key={index}>{choixCompteurs.length > 0 && <select className="threshold-target-select" value={seuil.counterId || '__main'} onChange={(e) => modifier(index, { counterId: e.target.value })}>{choixCompteurs.map((compteur) => <option key={compteur.id} value={compteur.id}>{compteur.label}</option>)}</select>}<select className="threshold-operator-select" value={seuil.operator || 'gte'} onChange={(e) => modifier(index, { operator: e.target.value })}>{thresholdOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} onChange={(e) => modifier(index, { value: Number(e.target.value) })} /><select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(e) => modifier(index, { color: e.target.value })}>{thresholdColors.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)}>x</button><input className="threshold-label-input" value={seuil.label || ''} placeholder="Texte affiche" onChange={(e) => modifier(index, { label: e.target.value })} />{thresholdOutOfBounds(seuil, bounds) && <span className="threshold-warning">hors limites</span>}</div>)}</div>;
}

function EditeurCompteursMultiples({ suivi, onChange }) {
  const secondaires = suivi.counters || [];
  const compteurs = [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0, initial: suivi.initial ?? 0, min: suivi.min ?? '', max: suivi.max ?? '', size: suivi.counterSize || 'compact' }, ...secondaires];
  const modifier = (id, patch) => id === '__main'
    ? onChange({ ...('label' in patch ? { name: patch.label } : {}), ...('current' in patch ? { current: patch.current } : {}), ...('initial' in patch ? { initial: patch.initial } : {}), ...('min' in patch ? { min: patch.min } : {}), ...('max' in patch ? { max: patch.max } : {}), ...('size' in patch ? { counterSize: patch.size } : {}) })
    : onChange({ counters: secondaires.map((compteur) => compteur.id === id ? { ...compteur, ...patch } : compteur) });
  const ajouter = () => onChange({ counters: [...secondaires, { id: uid('counter'), label: `Compteur ${secondaires.length + 2}`, current: 0, initial: 0 }] });
  const supprimer = (id) => onChange({ counters: secondaires.filter((compteur) => compteur.id !== id) });

  return <div className="threshold-editor"><div className="line-count-row"><label>Compteurs dans ce suivi</label><button className="small-btn" onClick={ajouter}>+ compteur</button></div><div className="counter-edit-grid">{compteurs.map((compteur) => <div className="counter-edit-tile" key={compteur.id}><input value={compteur.label || ''} placeholder="Nom" onChange={(e) => modifier(compteur.id, { label: e.target.value })} /><div className="grid2"><ChampNombre label="Actuel" valeur={compteur.current ?? 0} onChange={(valeur) => modifier(compteur.id, { current: valeur })} /><ChampNombre label="Initial" valeur={compteur.initial ?? 0} onChange={(valeur) => modifier(compteur.id, { initial: valeur })} /></div><div className="grid2"><ChampNombre label="Min" valeur={compteur.min ?? ''} placeholder="-" onChange={(valeur) => modifier(compteur.id, { min: valeur })} /><ChampNombre label="Max" valeur={compteur.max ?? ''} placeholder="+" onChange={(valeur) => modifier(compteur.id, { max: valeur })} /></div><label className="field">Taille<select value={compteur.size || 'compact'} onChange={(e) => modifier(compteur.id, { size: e.target.value })}><option value="compact">Compact</option><option value="normal">Normal</option><option value="wide">Large</option></select></label>{compteur.id !== '__main' && <button className="small-btn subtle-danger" onClick={() => supprimer(compteur.id)}>x</button>}</div>)}</div></div>;
}

function ToggleIconeSuivi({ suivi, onChange }) {
  return <div className="tracker-option-icons"><button className={`eye-toggle ${isVisible(suivi) ? 'active' : 'inactive'}`} onClick={() => onChange({ visible: suivi.visible === false })} title={isVisible(suivi) ? 'Visible sur la fichette' : 'Masque sur la fichette'} type="button">{isVisible(suivi) ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button><button className={`spy-toggle ${suivi.secret ? 'active' : ''}`} onClick={() => onChange({ secret: !suivi.secret })} title="Secret MJ" type="button"><span>{'🥷'}</span><b>Secret</b></button></div>;
}

function OptionsReset({ suivi, onChange }) {
  const rule = suivi.resetRule || {};
  const rows = suivi.rows || [];
  const autoActif = suivi.autoReset === 'activation';
  const defaultMode = suivi.resetDefaultMode || 'empty';
  const estCompteur = suivi.type === 'number';
  const estBarre = suivi.type === 'bar';
  const estPuces = isPointsTracker(suivi);
  const compteurs = estCompteur ? [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0 }, ...(suivi.counters || [])] : [];
  const initialRows = rows.map((row, index) => {
    const initial = suivi.initialRows?.find((item) => item.id === row.id) || suivi.initialRows?.[index];
    return initial ? { ...row, marks: (row.marks || []).map((_, markIndex) => Number(initial.marks?.[markIndex] || 0)) } : { ...row, marks: (row.marks || []).map(() => 0) };
  });
  const modifierInitialRow = (rowId, index) => onChange({ initialRows: initialRows.map((row) => row.id === rowId ? { ...row, marks: (row.marks || []).map((mark, position) => position === index ? cycleBoxMark(mark, suivi.fillLevels || 1) : mark) } : row) });
  const presetPatch = (choix) => {
    if (choix === 'current') return isBoxesTracker(suivi) ? { initialRows: clone(rows) } : { initial: suivi.current ?? 0, cyclesInitial: suivi.cycles ?? suivi.cyclesInitial ?? 0 };
    if (choix === 'empty') return isBoxesTracker(suivi) ? { initialRows: rows.map((row) => ({ ...row, marks: (row.marks || []).map(() => 0) })) } : { initial: 0, cyclesInitial: 0 };
    return isBoxesTracker(suivi) ? { initialRows: rows.map((row) => ({ ...row, marks: (row.marks || []).map(() => Number(suivi.fillLevels || 1)) })) } : { initial: suivi.max ?? suivi.current ?? 0 };
  };
  const modifierRegle = (patch) => onChange({ resetRule: { ...rule, ...patch } });
  const modifierRegleCompteur = (id, patch) => modifierRegle({ counterRules: { ...(rule.counterRules || {}), [id]: { ...((rule.counterRules || {})[id] || {}), ...patch } } });
  const modifierRegleLigne = (id, patch) => modifierRegle({ boxRows: { ...(rule.boxRows || {}), [id]: { ...((rule.boxRows || {})[id] || {}), ...patch } } });
  const switchAuto = <label className={`reset-switch ${autoActif ? 'active' : ''}`}><span>Automatisation</span><input type="checkbox" checked={autoActif} onChange={(e) => onChange({ autoReset: e.target.checked ? 'activation' : 'never', resetRule: { ...rule, mode: 'towardDefault' } })} /></label>;
  const optionsNiveaux = Array.from({ length: Number(suivi.fillLevels || 1) }, (_, index) => ({ value: index + 1, label: suivi.levelLabels?.[index] || ['Leger', 'Normal', 'Grave', 'Critique', 'Fatal'][index] || `Coche ${index + 1}` }));

  if (estCompteur) return (
    <div className="reset-options">
      {switchAuto}
      {autoActif && <div className="counter-auto-grid">{compteurs.map((compteur) => {
        const regle = (rule.counterRules || {})[compteur.id] || {};
        return <div className="counter-auto-row" key={compteur.id}><strong>{compteur.label || 'Compteur'}</strong><ChampNombre label="Ajout" valeur={regle.flat ?? 0} onChange={(valeur) => modifierRegleCompteur(compteur.id, { flat: valeur })} /><ChampNombre label="%" valeur={regle.percent ?? 0} onChange={(valeur) => modifierRegleCompteur(compteur.id, { percent: valeur })} /></div>;
      })}</div>}
    </div>
  );

  if (isBoxesTracker(suivi)) return (
    <div className="reset-options">
      <div className="reset-custom">
        <div className="line-count-row">
          <label>Etat par defaut</label>
          <button className={`small-btn ${defaultMode === 'full' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('full'), resetDefaultMode: 'full' })}>plein</button>
          <button className={`small-btn ${defaultMode === 'empty' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('empty'), resetDefaultMode: 'empty' })}>vide</button>
          <button className={`small-btn ${defaultMode === 'custom' ? 'suggested' : ''}`} onClick={() => onChange({ resetDefaultMode: 'custom' })}>personnalisé</button>
        </div>
        {defaultMode === 'custom' && <div className="reset-box-preview">{initialRows.map((row) => <div className="sorted-monitor-line" key={row.id}><div className="boxes">{(row.marks || []).map((mark, index) => <button key={index} className={`box mark-${boxVisualRank(mark, suivi.fillLevels || 1)} ${boxVisualRank(mark, suivi.fillLevels || 1) >= 5 ? 'full' : ''}`} onClick={() => modifierInitialRow(row.id, index)} />)}</div><span className="box-label">{row.label}</span></div>)}</div>}
      </div>
      {switchAuto}
      {autoActif && <div className="box-auto-grid">{(suivi.boxMode === 'free' ? rows : [{ id: '__all', label: 'Jauge' }]).map((row) => {
        const regle = (rule.boxRows || {})[row.id] || {};
        const maxLevel = regle.maxLevel ?? suivi.fillLevels ?? 1;
        return <div className="box-auto-row" key={row.id}><strong>{row.label || 'Zone'}</strong><ChampNombre label="Cases" valeur={regle.amount ?? 1} onChange={(valeur) => modifierRegleLigne(row.id, { amount: valeur })} /><ChampNombre label="Cran" valeur={regle.levels ?? 1} onChange={(valeur) => modifierRegleLigne(row.id, { levels: valeur })} /><label className="field">Coche max<select value={maxLevel} onChange={(e) => modifierRegleLigne(row.id, { maxLevel: Number(e.target.value) })}>{optionsNiveaux.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>;
      })}</div>}
    </div>
  );

  if (estBarre) return (
    <div className="reset-options">
      <div className="reset-custom">
        <div className="line-count-row">
          <label>Etat par defaut</label>
          <button className={`small-btn ${defaultMode === 'full' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('full'), resetDefaultMode: 'full' })}>max</button>
          <button className={`small-btn ${defaultMode === 'empty' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('empty'), resetDefaultMode: 'empty' })}>zero</button>
          <button className={`small-btn ${defaultMode === 'custom' ? 'suggested' : ''}`} onClick={() => onChange({ resetDefaultMode: 'custom' })}>personnalisé</button>
        </div>
        {defaultMode === 'custom' && <ChampNombre label="Valeur" valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} />}
      </div>
      {switchAuto}
      {autoActif && <div className="grid2"><ChampNombre label="Valeur additive" valeur={rule.step ?? 0} onChange={(valeur) => modifierRegle({ step: valeur })} /><ChampNombre label="% reduction exces" valeur={rule.excessReductionPercent ?? ''} placeholder="aucun" onChange={(valeur) => modifierRegle({ excessReductionPercent: valeur })} /></div>}
    </div>
  );

  if (estPuces) return (
    <div className="reset-options">
      <div className="reset-custom">
        <div className="line-count-row">
          <label>Etat par defaut</label>
          <button className={`small-btn ${defaultMode === 'full' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('full'), resetDefaultMode: 'full' })}>plein</button>
          <button className={`small-btn ${defaultMode === 'empty' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('empty'), resetDefaultMode: 'empty' })}>vide</button>
          <button className={`small-btn ${defaultMode === 'custom' ? 'suggested' : ''}`} onClick={() => onChange({ resetDefaultMode: 'custom' })}>personnalisé</button>
        </div>
        {defaultMode === 'custom' && <div className="grid2"><ChampNombre label="Valeur" valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} />{suivi.limitMode === 'loop' && <ChampNombre label="Compteur" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur })} />}</div>}
      </div>
      {switchAuto}
      {autoActif && <div className="grid2"><ChampNombre label="Pas" valeur={rule.step ?? 1} onChange={(valeur) => modifierRegle({ step: valeur })} /><label className="field">Action<select value={rule.pointsAutoMode || 'default'} onChange={(e) => modifierRegle({ pointsAutoMode: e.target.value })}><option value="default">Revenir a l'etat de depart</option><option value="increase">Augmenter</option><option value="decrease">Reduire</option></select></label></div>}
    </div>
  );

  return (
    <div className="reset-options">
      {!estCompteur && (
        <div className="reset-custom">
          <div className="line-count-row">
            <label>Etat par defaut</label>
            <button className={`small-btn ${defaultMode === 'full' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('full'), resetDefaultMode: 'full' })}>plein</button>
            <button className={`small-btn ${defaultMode === 'empty' ? 'suggested' : ''}`} onClick={() => onChange({ ...presetPatch('empty'), resetDefaultMode: 'empty' })}>vide</button>
            <button className={`small-btn ${defaultMode === 'custom' ? 'suggested' : ''}`} onClick={() => onChange({ resetDefaultMode: 'custom' })}>personnalisé</button>
          </div>
          {estPuces && defaultMode === 'full' && (suivi.max === null || suivi.max === '') && <p className="threshold-warning">definir un maximum pour utiliser plein</p>}
          {estPuces && defaultMode === 'empty' && (suivi.min === null || suivi.min === '') && <p className="threshold-warning">definir un minimum pour utiliser vide</p>}
          {defaultMode === 'custom' && (isBoxesTracker(suivi) ? (
            <div className="reset-box-preview">
              {initialRows.map((row) => <div className="sorted-monitor-line" key={row.id}><div className="boxes">{(row.marks || []).map((mark, index) => <button key={index} className={`box mark-${boxVisualRank(mark, suivi.fillLevels || 1)} ${boxVisualRank(mark, suivi.fillLevels || 1) >= 5 ? 'full' : ''}`} onClick={() => modifierInitialRow(row.id, index)} />)}</div><span className="box-label">{row.label}</span></div>)}
            </div>
          ) : (
            <div className="grid2">
              <ChampNombre label="Valeur" valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} />
              {estPuces && suivi.limitMode === 'loop' && <ChampNombre label="Compteur" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur })} />}
            </div>
          ))}
        </div>
      )}
      {estCompteur && <p className="muted tracker-help">Le retour par defaut d'un compteur utilise ses valeurs initiales. Le pas automatique peut etre borne par les limites ci-dessous.</p>}
      <label className="reset-switch">
        <span>Automatique a l'activation</span>
        <input type="checkbox" checked={autoActif} onChange={(e) => onChange({ autoReset: e.target.checked ? 'activation' : 'never', resetRule: { ...rule, mode: 'towardDefault' } })} />
      </label>
      {autoActif && (
        <div className="grid2">
          <ChampNombre label={estPuces ? 'Pas non signe' : rule.stepMode === 'percent' ? 'Pas en %' : 'Pas'} valeur={rule.step ?? (isBoxesTracker(suivi) ? -1 : 1)} onChange={(valeur) => onChange({ resetRule: { ...rule, mode: 'towardDefault', step: valeur } })} />
          {estCompteur && <label className="field">Mode du pas<select value={rule.stepMode || 'flat'} onChange={(e) => onChange({ resetRule: { ...rule, stepMode: e.target.value } })}><option value="flat">Valeur fixe</option><option value="percent">Pourcentage</option></select></label>}
          {isBoxesTracker(suivi) && <ChampNombre label={suivi.boxMode === 'free' ? 'Cases par groupe' : 'Cases au total'} valeur={rule.amount ?? 1} onChange={(valeur) => onChange({ resetRule: { ...rule, amount: valeur } })} />}
        </div>
      )}
      {autoActif && estCompteur && <div className="grid2"><ChampNombre label="Min optionnel" valeur={rule.minCap ?? ''} placeholder="pas de borne" onChange={(valeur) => onChange({ resetRule: { ...rule, minCap: valeur } })} /><ChampNombre label="Max optionnel" valeur={rule.maxCap ?? ''} placeholder="pas de borne" onChange={(valeur) => onChange({ resetRule: { ...rule, maxCap: valeur } })} /></div>}
      {autoActif && estCompteur && rule.stepMode === 'percent' && <label className="field">Arrondi<select value={rule.rounding || 'nearest'} onChange={(e) => onChange({ resetRule: { ...rule, rounding: e.target.value } })}><option value="nearest">Mathematique</option><option value="floor">Inferieur</option><option value="ceil">Superieur</option></select></label>}
      {autoActif && estBarre && <div className="grid2"><ChampNombre label="% du depassement retire" valeur={rule.overflowTrimPercent ?? 0} onChange={(valeur) => onChange({ resetRule: { ...rule, overflowTrimPercent: valeur } })} /><div /></div>}
      {autoActif && isBoxesTracker(suivi) && <p className="muted tracker-help">{suivi.boxMode === 'free' ? 'Cases libres : chaque groupe avance separement vers son image par defaut.' : 'Cases triees : Cadence corrige la jauge globale dans l ordre des lignes, puis retrie les marques.'} {Number(suivi.fillLevels || 1) > 1 ? 'Avec plusieurs niveaux, une marque descend ou monte d un cran par tic jusqu a rejoindre l etat choisi. Les niveaux exclus ci-dessous ne seront pas regenes automatiquement.' : ''}</p>}
      {autoActif && isBoxesTracker(suivi) && Number(suivi.fillLevels || 1) > 1 && (
        <div className="level-lock-row">
          <span>Niveaux regeneres</span>
          {Array.from({ length: Number(suivi.fillLevels || 1) }, (_, index) => <label key={index}><input type="checkbox" checked={!(rule.skipLevels || []).includes(index + 1)} onChange={(e) => onChange({ resetRule: { ...rule, skipLevels: e.target.checked ? (rule.skipLevels || []).filter((level) => level !== index + 1) : [...(rule.skipLevels || []), index + 1] } })} />{suivi.levelLabels?.[index] || `N${index + 1}`}</label>)}
        </div>
      )}
    </div>
  );
}

function OptionsParType({ suivi, onChange }) {
  if (suivi.type === 'number') return <><div className="option-top-right"><ChampNombre label="Pas" valeur={suivi.step ?? 1} onChange={(valeur) => onChange({ step: valeur })} /></div><EditeurCompteursMultiples suivi={suivi} onChange={onChange} /><details className="advanced-options"><summary>Options avancees</summary><OptionsReset suivi={suivi} onChange={onChange} /><EditeurSeuils suivi={suivi} onChange={onChange} /></details></>;
  if (suivi.type === 'bar') return <><div className="grid2"><label className="row"><input type="checkbox" checked={suivi.minAbsolute !== false} onChange={(e) => onChange({ minAbsolute: e.target.checked })} /> bloquer au minimum</label><label className="row"><input type="checkbox" checked={suivi.maxAbsolute !== false} onChange={(e) => onChange({ maxAbsolute: e.target.checked })} /> bloquer au maximum</label></div><details className="advanced-options"><summary>Options avancees</summary><EditeurSeuils suivi={suivi} onChange={onChange} bounds={{ min: suivi.min ?? 0, max: suivi.max }} /><OptionsReset suivi={suivi} onChange={onChange} /></details></>;
  if (isPointsTracker(suivi)) return <><div className="grid2"><ChampNombre label="Valeur initiale" valeur={suivi.initial ?? suivi.current ?? 0} onChange={(valeur) => onChange({ initial: valeur })} /><label className="field">Limite<select value={suivi.limitMode || 'clamp'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="clamp">Bloquer au max</option><option value="loop">Boucler avec compteur</option></select></label></div>{suivi.limitMode === 'loop' && <><div className="grid2"><ChampNombre label="Compteur initial" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur, cycles: suivi.cycles ?? valeur })} /><ChampNombre label="Compteur actuel" valeur={suivi.cycles ?? 0} onChange={(valeur) => onChange({ cycles: valeur })} /></div><div className="grid2"><ChampNombre label="Min compteur" valeur={suivi.cyclesMin ?? ''} placeholder="∞" onChange={(valeur) => onChange({ cyclesMin: valeur })} /><ChampNombre label="Max compteur" valeur={suivi.cyclesMax ?? ''} placeholder="∞" onChange={(valeur) => onChange({ cyclesMax: valeur })} /></div></>}<details className="advanced-options"><summary>Options avancees</summary><OptionsReset suivi={suivi} onChange={onChange} /><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title="Seuils sur les puces" bounds={{ min: suivi.min ?? 0, max: suivi.max }} />{suivi.limitMode === 'loop' && <EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title="Seuils sur le compteur global" bounds={{ min: suivi.cyclesMin, max: suivi.cyclesMax }} />}</details></>;
  if (suivi.type === 'clock') return <><div className="grid2"><ChampNombre label="Valeur initiale" valeur={suivi.initial ?? suivi.current ?? 0} onChange={(valeur) => onChange({ initial: valeur })} /><ChampNombre label="Incrementation" valeur={suivi.step ?? 1} onChange={(valeur) => onChange({ step: valeur })} /></div><label className="field">Terme<select value={suivi.limitMode || 'manual'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="manual">Manuel</option><option value="increment">Relancer et compter les tours</option><option value="overflow">Depasser avec zone rouge</option></select></label>{suivi.limitMode !== 'manual' && <div className="grid2"><ChampNombre label="Compteur initial" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur, cycles: suivi.cycles ?? valeur })} /><ChampNombre label="Compteur actuel" valeur={suivi.cycles ?? 0} onChange={(valeur) => onChange({ cycles: valeur })} /></div>}<div className="grid2"><label className="row"><input type="checkbox" checked={!!suivi.auto} onChange={(e) => onChange({ auto: e.target.checked })} /> avance auto</label><label className="row"><input type="checkbox" checked={!!suivi.frozen} onChange={(e) => onChange({ frozen: e.target.checked })} /> figee</label></div><details className="advanced-options"><summary>Options avancees</summary><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title="Seuils sur l'horloge" bounds={{ min: suivi.min ?? 0, max: suivi.max }} />{suivi.limitMode !== 'manual' && <EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title="Seuils sur le compteur" />}</details></>;
  return null;
}

function EditeurSuivi({ suivi, onChange, onDelete }) {
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur });
  const estCases = isBoxesTracker(suivi);
  const estNumerique = isNumericTracker(suivi);

  return <div className="tracker"><div className="tracker-edit-head"><input value={suivi.name} onChange={(e) => modifierSuivi({ name: e.target.value })} aria-label="Nom du suivi" /><select value={suivi.type} aria-label="Type de suivi" onChange={(e) => onChange({ ...newTracker(e.target.value), id: suivi.id, name: suivi.name })}>{Object.entries(trackerTypeLabels).map(([valeur, label]) => <option value={valeur} key={valeur}>{label}</option>)}</select><button className="danger-btn compact-danger" onClick={onDelete}>x</button></div><div className="sub-options-row"><button className="quick-reset-btn text" onClick={() => onChange(resetTracker(suivi, 'initial'))} title="Remettre au depart">Reset</button><ToggleIconeSuivi suivi={suivi} onChange={modifierSuivi} /></div><div className="grid2">{estNumerique && <ChampNombre label="Valeur actuelle" valeur={suivi.current ?? 0} onChange={(valeur) => modifierSuivi({ current: valeur })} />}{estNumerique && suivi.type !== 'number' && <ChampNombre label="Maximum" valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} />}{suivi.type === 'bar' && <ChampNombre label="Minimum" valeur={suivi.min ?? 0} onChange={(valeur) => modifierSuivi({ min: valeur })} />}</div><OptionsParType suivi={suivi} onChange={modifierSuivi} />{estCases && <EditeurCases suivi={suivi} onChange={onChange} resetOptions={<OptionsReset suivi={suivi} onChange={modifierSuivi} />} />}</div>;
}

export function FenetreEditionFiche({ participant, title = 'Modifier', saveTemplateVisible = true, deleteLabel = 'Supprimer la fiche', onClose, onSave, onDelete, onSaveTemplate }) {
  const [brouillon, setBrouillon] = useState({ ...clone(participant), stats: normaliserInfosRapides(participant.stats || []) });
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const modifierChamp = (clef, valeur) => setBrouillon((courant) => ({ ...courant, [clef]: valeur }));
  const modifierSuivi = (id, suivant) => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.map((suivi) => suivi.id === id ? suivant : suivi) }));
  const valider = () => onSave(normaliserFiche(brouillon));
  const enregistrerCommeTemplate = () => onSaveTemplate?.(normaliserFiche(brouillon));
  const entete = <div className="edit-sheet-header"><h2>{title}</h2><button className="icon-btn validate-edit-btn" onClick={valider} aria-label="Valider les modifications">{'✓'}</button></div>;

  return <><Fenetre title={title} onClose={onClose} header={entete}><label className="field">Nom<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label><label className="field">Description<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label><div className="grid2"><label className="field">Type<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{participantKinds.map((type) => <option key={type}>{type}</option>)}</select></label><ChampNombre label="Initiative" valeur={brouillon.initiative} onChange={(valeur) => modifierChamp('initiative', valeur)} /></div><div className="grid2"><ChampNombre label="Departage" valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /><div /></div><div className="grid2"><label className="field">Symbole<select value={brouillon.symbol || symbols[0]} onChange={(e) => modifierChamp('symbol', e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}</select></label><label className="field">Couleur<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div><h3>Infos rapides</h3><EditeurInfosRapides stats={brouillon.stats || []} onChange={(stats) => modifierChamp('stats', stats)} /><h3>Suivis</h3><div className="stack tracker-list">{brouillon.trackers.map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.filter((item) => item.id !== suivi.id) }))} />)}<button className="primary add-tracker-btn" onClick={() => setBrouillon((courant) => ({ ...courant, trackers: [...courant.trackers, newTracker('bar')] }))}>Ajouter un suivi</button></div>{saveTemplateVisible && <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>Enregistrer comme template</button>}<div className="edit-actions-row" style={{ marginTop: 12 }}><button className="small-btn" onClick={onClose}>Annuler</button><button className="primary" onClick={valider}>Valider</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>{deleteLabel}</button></div></Fenetre>{confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}</>;
}
