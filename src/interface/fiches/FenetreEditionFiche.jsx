import { useState } from 'react';
import { colorNames, defaultPhaseCount, participantKinds, phaseActionModes, trackerTypeLabels } from '../../constants.js';
import { normaliserCreneauxAction } from '../../domain/initiative.js';
import { initiativeValueForMode, normalizeInitiativeTextOrder } from '../../domain/initiativeTextOrder.js';
import { boxBlocks, boxVisualRank, clone, colors, cycleBoxMark, isBoxesTracker, isNumericTracker, isPointsTracker, isVisible, newTracker, normalizeBoxTracker, normalizeThresholds, normalizeTrackerThresholds, resetTracker, sortBoxBlocks, symbols, thresholdValue, uid } from '../../logic.js';
import { instantiateTrackerTemplate } from '../../templates.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreConfirmationSuppression } from '../dialogues/FenetreConfirmationSuppression.jsx';
import { IconeOeilMystiqueFerme, IconeOeilMystiqueOuvert } from '../icones/IconesOeilMystique.jsx';
import { ChampInitiative } from '../initiative/ChampInitiative.jsx';
import { EditeurPhasesParticipant, normaliserPhaseActions } from '../initiative/EditeurPhasesParticipant.jsx';
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
  ['gt', '>'],
  ['lt', '<'],
  ['eq', '='],
];

const thresholdBases = [
  ['fixed', 'Fixe'],
  ['percent', '%'],
  ['fromMax', 'Max -'],
];

const thresholdOptionStyles = {
  neutral: { backgroundColor: '#e2e8f0', color: '#334155' },
  green: { backgroundColor: '#dcfce7', color: '#166534' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  red: { backgroundColor: '#fee2e2', color: '#991b1b' },
  blue: { backgroundColor: '#dbeafe', color: '#1e40af' },
  violet: { backgroundColor: '#ede9fe', color: '#5b21b6' },
};

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

function texteCreneauxAction(participant) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length ? participant.actionSlots : [{ initiative: participant.initiative ?? 0 }];
  return slots.map((slot) => slot.initiative ?? 0).join(' / ');
}

function brouillonCreneauxAction(participant) {
  const slots = Array.isArray(participant.actionSlots) && participant.actionSlots.length ? participant.actionSlots : [{ initiative: participant.initiative ?? 0 }];
  return slots.map((slot, index) => ({
    id: slot.id || `slot-${index + 1}`,
    initiative: slot.initiative ?? participant.initiative ?? 0,
  }));
}

function lireCreneauxAction(texte, fallback = 0) {
  const valeurs = String(texte || '').match(/-?\d+(?:[.,]\d+)?/g)?.map((valeur) => Number(valeur.replace(',', '.'))).filter(Number.isFinite) || [];
  const initiatives = valeurs.length ? valeurs : [nombreOuDefaut(fallback, 0)];
  return initiatives
    .sort((a, b) => b - a)
    .map((initiative, index) => ({ id: `slot-${index + 1}`, initiative, order: index }));
}

function normaliserCreneauxDepuisBrouillon(brouillon, initiativeTextOrder, multipleActionSlots = true) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const slotsSource = Array.isArray(brouillon._actionSlotsDraft) && brouillon._actionSlotsDraft.length
    ? brouillon._actionSlotsDraft
    : lireCreneauxAction(brouillon._actionSlotsInput, brouillon.initiative);
  const slots = multipleActionSlots ? slotsSource : slotsSource.slice(0, 1);
  const fallback = brouillon.initiative ?? slots[0]?.initiative ?? 0;
  return normaliserCreneauxAction({
    ...brouillon,
    initiative: initiativeValueForMode(fallback, textConfig),
    actionSlots: slots.map((slot, index) => ({
      id: slot.id || `slot-${index + 1}`,
      initiative: initiativeValueForMode(slot.initiative, textConfig, fallback),
      order: index,
    })),
  }, { initiativeTextOrder: textConfig, multipleActionSlots }).map((slot, index) => ({ id: `slot-${index + 1}`, initiative: slot.initiative, order: index }));
}

function normaliserFiche(brouillon, initiativeTextOrder, phaseOptions = {}) {
  const { _actionSlotsInput, _actionSlotsDraft, ...fiche } = brouillon;
  const actionSlots = normaliserCreneauxDepuisBrouillon(brouillon, initiativeTextOrder, phaseOptions.multipleActionSlots !== false);
  const phasePatch = phaseOptions.phaseActionMode === phaseActionModes.CHECKED
    ? { phaseActions: normaliserPhaseActions(fiche.phaseActions, phaseOptions.phaseCount) }
    : {};
  return {
    ...fiche,
    ...phasePatch,
    stats: serialiserInfosRapides(fiche.stats),
    initiative: actionSlots[0]?.initiative ?? nombreOuDefaut(fiche.initiative, 0),
    actionSlots,
    departage: fiche.departage === '' ? '' : nombreOuDefaut(fiche.departage, 0),
    trackers: fiche.trackers.map((suivi) => {
      if (isBoxesTracker(suivi)) {
        return normalizeBoxTracker({
          ...suivi,
          fillLevels: entierPositif(suivi.fillLevels, 1),
          resetRule: normaliserResetRule(suivi),
        });
      }
      if (suivi.type === 'number') {
        return {
          ...suivi,
          current: nombreOuDefaut(suivi.current, 0),
          initial: nombreOuDefaut(suivi.initial, suivi.current ?? 0),
          step: entierPositif(suivi.step, 1),
          counterSize: ['compact', 'normal', 'wide'].includes(suivi.counterSize) ? suivi.counterSize : 'compact',
          thresholds: normalizeTrackerThresholds(suivi.type, suivi.thresholds),
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
        thresholds: normalizeTrackerThresholds(suivi.type, suivi.thresholds),
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
    boxBlocks: rule.boxBlocks && typeof rule.boxBlocks === 'object' ? rule.boxBlocks : {},
    minCap: rule.minCap === '' ? '' : rule.minCap ?? '',
    maxCap: rule.maxCap === '' ? '' : rule.maxCap ?? '',
    overflowTrimPercent: nombreOuDefaut(rule.overflowTrimPercent, 0),
    excessReductionPercent: rule.excessReductionPercent === '' ? '' : rule.excessReductionPercent ?? '',
    underflowRecoveryPercent: rule.underflowRecoveryPercent === '' ? '' : rule.underflowRecoveryPercent ?? '',
    rounding: ['nearest', 'floor', 'ceil'].includes(rule.rounding) ? rule.rounding : 'floor',
    amount: entierPositif(rule.amount, 1),
    skipLevels: Array.isArray(rule.skipLevels) ? rule.skipLevels.map(Number).filter((level) => Number.isFinite(level) && level > 0) : [],
    after: ['none', 'zero', 'max', 'initial'].includes(rule.after) ? rule.after : 'none',
  };
}

function ApercuNiveaux({ niveaux }) {
  const maximum = entierPositif(niveaux, 5);
  const marques = Array.from({ length: maximum + 1 }, (_, index) => index);
  return <div className="levels-preview">{marques.map((valeur) => <span key={valeur} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function ChampNombre({ label, valeur, onChange, placeholder = '', className = '' }) {
  return <label className={`field ${className}`.trim()}>{label}<input type="number" inputMode="numeric" value={valeur ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></label>;
}

function creerCasesDepuis(cases = [], total = 1) {
  const ordonnees = [...(cases || [])].sort((a, b) => Number(a.position ?? 0) - Number(b.position ?? 0));
  return Array.from({ length: Math.max(1, total) }, (_, position) => {
    const existante = ordonnees[position];
    return existante ? { ...existante, position } : { id: uid('box'), position, mark: 0, initial: 0 };
  });
}

function EditeurCases({ suivi, onChange, resetOptions = null }) {
  const niveaux = entierPositif(suivi.fillLevels, 1);
  const nomsDefaut = niveaux === 1 ? ['Marque'] : ['Leger', 'Normal', 'Grave', 'Critique', 'Fatal'];
  const libellesNiveaux = Array.from({ length: niveaux }, (_, index) => suivi.levelLabels?.[index] || nomsDefaut[index] || `Niveau ${index + 1}`);
  const suiviNormalise = normalizeBoxTracker({ ...suivi, fillLevels: niveaux });
  const blocs = suiviNormalise.blocks;
  const appliquerBlocs = (blocks) => onChange(sortBoxBlocks({ ...suiviNormalise, blocks }));
  const ajouterBloc = () => {
    const order = blocs.length;
    appliquerBlocs([...blocs, { id: uid('block'), label: `Bloc ${order + 1}`, order, lines: [{ id: uid('line'), label: 'Ligne 1', order: 0, boxes: creerCasesDepuis([], 4) }] }]);
  };
  const modifierBloc = (blocId, modification) => appliquerBlocs(blocs.map((bloc) => bloc.id === blocId ? modification(bloc) : bloc));
  const retirerBloc = (blocId) => appliquerBlocs(blocs.length > 1 ? blocs.filter((bloc) => bloc.id !== blocId) : blocs);
  const ajouterLigne = (blocId) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: [...bloc.lines, { id: uid('line'), label: `Ligne ${bloc.lines.length + 1}`, order: bloc.lines.length, boxes: creerCasesDepuis([], 4) }] }));
  const modifierLigne = (blocId, ligneId, modification) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: bloc.lines.map((ligne) => ligne.id === ligneId ? modification(ligne) : ligne) }));
  const retirerLigne = (blocId, ligneId) => modifierBloc(blocId, (bloc) => ({ ...bloc, lines: bloc.lines.length > 1 ? bloc.lines.filter((ligne) => ligne.id !== ligneId) : bloc.lines }));
  const changerNiveaux = (delta) => {
    const prochain = Math.max(1, Math.min(5, niveaux + delta));
    const labels = Array.from({ length: prochain }, (_, index) => suivi.levelLabels?.[index] || (prochain === 1 ? ['Marque'][index] : ['Leger', 'Normal', 'Grave', 'Critique', 'Fatal'][index]) || `Niveau ${index + 1}`);
    onChange(normalizeBoxTracker({ ...suiviNormalise, fillLevels: prochain, levelLabels: labels, levelPriorities: Array.from({ length: prochain }, (_, index) => suivi.levelPriorities?.[index] || index + 1) }));
  };
  const changerLibelleNiveau = (index, label) => onChange({ ...suivi, levelLabels: libellesNiveaux.map((courant, position) => position === index ? label : courant) });

  return (
    <div className="box-editor">
      <div className="box-level-row">
        <span>Niveaux actifs</span>
        <button className="small-btn" onClick={() => changerNiveaux(-1)} disabled={niveaux <= 1}>-</button>
        <ApercuNiveaux niveaux={niveaux} />
        <button className="small-btn" onClick={() => changerNiveaux(1)} disabled={niveaux >= 5}>+</button>
      </div>
      <div className="line-count-row"><label>Blocs</label><strong>{blocs.length}</strong><button className="small-btn" onClick={ajouterBloc}>+ bloc</button></div>
      <div className="stack">
        {blocs.map((bloc) => (
          <div className="box-block-edit" key={bloc.id}>
            <div className="box-block-edit-head">
              <input value={bloc.label || ''} placeholder="Nom du bloc" onChange={(e) => modifierBloc(bloc.id, (courant) => ({ ...courant, label: e.target.value || 'Bloc' }))} />
              <button className="small-btn" onClick={() => ajouterLigne(bloc.id)}>+ ligne</button>
              <button className="small-btn subtle-danger" onClick={() => retirerBloc(bloc.id)} disabled={blocs.length <= 1}>x</button>
            </div>
            <div className="stack">
              {bloc.lines.map((ligne) => (
                <div className="free-box-edit-line box-line-edit" key={ligne.id}>
                  <input value={ligne.label || ''} placeholder="Nom de ligne" onChange={(e) => modifierLigne(bloc.id, ligne.id, (courante) => ({ ...courante, label: e.target.value || 'Ligne' }))} />
                  <input type="number" inputMode="numeric" min="1" value={(ligne.boxes || []).length || 1} onChange={(e) => modifierLigne(bloc.id, ligne.id, (courante) => ({ ...courante, boxes: creerCasesDepuis(courante.boxes, entierPositif(e.target.value, 1)) }))} />
                  <button className="small-btn subtle-danger" onClick={() => retirerLigne(bloc.id, ligne.id)} disabled={bloc.lines.length <= 1}>x</button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <details className="advanced-options">
        <summary>Options avancees</summary>
        <div className="stack">
          {libellesNiveaux.map((label, index) => <div className="level-visual-row" key={index}><input value={label} onChange={(e) => changerLibelleNiveau(index, e.target.value)} /><span className={`box preview mark-${boxVisualRank(index + 1, niveaux)} ${boxVisualRank(index + 1, niveaux) >= 5 ? 'full' : ''}`} /></div>)}
        </div>
        {resetOptions}
      </details>
    </div>
  );
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

function thresholdOutOfBounds(seuil, suivi, bounds = {}) {
  const valeur = thresholdValue(suivi, seuil);
  if (bounds.min !== null && bounds.min !== '' && bounds.min !== undefined && valeur < Number(bounds.min)) return true;
  if (bounds.max !== null && bounds.max !== '' && bounds.max !== undefined && valeur > Number(bounds.max)) return true;
  return false;
}

function EditeurSeuils({ suivi, onChange, field = 'thresholds', title = 'Seuils texte', bounds = {} }) {
  const seuils = suivi[field]?.length ? suivi[field] : [];
  const choixCompteurs = suivi.type === 'number' ? [{ id: '__main', label: suivi.name || 'Compteur principal' }, ...(suivi.counters || []).map((compteur) => ({ id: compteur.id, label: compteur.label || 'Compteur' }))] : [];
  const seuilsBarre = suivi.type === 'bar' && field === 'thresholds';
  const modifier = (index, patch) => onChange({ [field]: seuils.map((seuil, position) => position === index ? { ...seuil, ...patch } : seuil) });
  const ajouter = () => onChange({ [field]: [...seuils, { value: 0, label: '', color: 'neutral', operator: 'gte', counterId: choixCompteurs[0]?.id || '', basis: seuilsBarre ? 'fixed' : undefined }] });
  const supprimer = (index) => onChange({ [field]: seuils.filter((_, position) => position !== index) });

  return <div className="threshold-editor"><div className="line-count-row"><label>{title}</label><button className="small-btn" onClick={ajouter}>+ seuil</button></div>{seuils.map((seuil, index) => <div className={`threshold-edit-row ${choixCompteurs.length ? 'has-target' : ''} ${seuilsBarre ? 'has-basis' : ''} ${thresholdOutOfBounds(seuil, suivi, bounds) ? 'out-of-bounds' : ''}`} key={index}>{choixCompteurs.length > 0 && <select className="threshold-target-select" value={seuil.counterId || '__main'} onChange={(e) => modifier(index, { counterId: e.target.value })}>{choixCompteurs.map((compteur) => <option key={compteur.id} value={compteur.id}>{compteur.label}</option>)}</select>}<select className="threshold-operator-select" value={seuil.operator || 'gte'} onChange={(e) => modifier(index, { operator: e.target.value })}>{thresholdOperators.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{seuilsBarre && <select className="threshold-basis-select" value={seuil.basis || 'fixed'} onChange={(e) => modifier(index, { basis: e.target.value })}>{thresholdBases.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>}<input className="threshold-value-input" type="number" inputMode="numeric" value={seuil.value ?? 0} onChange={(e) => modifier(index, { value: Number(e.target.value) })} /><select className={`threshold-color-select threshold-${seuil.color || 'neutral'}`} value={seuil.color || 'neutral'} onChange={(e) => modifier(index, { color: e.target.value })}>{thresholdColors.map(([value, label]) => <option key={value} value={value} style={thresholdOptionStyles[value]}>{label}</option>)}</select><button className="small-btn subtle-danger threshold-delete" onClick={() => supprimer(index)}>x</button><input className="threshold-label-input" value={seuil.label || ''} placeholder="Texte affiche" onChange={(e) => modifier(index, { label: e.target.value })} />{seuilsBarre && <span className="threshold-warning">valeur cible : {thresholdValue(suivi, seuil)}</span>}{thresholdOutOfBounds(seuil, suivi, bounds) && <span className="threshold-warning">hors limites</span>}</div>)}</div>;
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
  const blocks = isBoxesTracker(suivi) ? boxBlocks(suivi) : [];
  const autoActif = suivi.autoReset === 'activation';
  const defaultMode = suivi.resetDefaultMode || 'empty';
  const estCompteur = suivi.type === 'number';
  const estBarre = suivi.type === 'bar';
  const estPuces = isPointsTracker(suivi);
  const compteurs = estCompteur ? [{ id: '__main', label: suivi.name || 'Compteur', current: suivi.current ?? 0 }, ...(suivi.counters || [])] : [];
  const normaliserBlocks = (nextBlocks) => sortBoxBlocks({ ...suivi, blocks: nextBlocks }).blocks;
  const modifierInitialBox = (blockId, lineId, boxId) => onChange({
    blocks: normaliserBlocks(blocks.map((block) => block.id !== blockId ? block : {
      ...block,
      lines: block.lines.map((line) => line.id !== lineId ? line : {
        ...line,
        boxes: line.boxes.map((box) => box.id === boxId ? { ...box, initial: cycleBoxMark(box.initial, suivi.fillLevels || 1) } : box),
      }),
    })),
  });
  const patchInitialBoxes = (valeur) => ({
    blocks: normaliserBlocks(blocks.map((block) => ({
      ...block,
      lines: block.lines.map((line) => ({
        ...line,
        boxes: line.boxes.map((box) => ({ ...box, initial: valeur === 'current' ? box.mark : valeur })),
      })),
    }))),
  });
  const presetPatch = (choix) => {
    if (choix === 'current') return isBoxesTracker(suivi) ? patchInitialBoxes('current') : { initial: suivi.current ?? 0, cyclesInitial: suivi.cycles ?? suivi.cyclesInitial ?? 0 };
    if (choix === 'empty') return isBoxesTracker(suivi) ? patchInitialBoxes(0) : { initial: 0, cyclesInitial: 0 };
    return isBoxesTracker(suivi) ? patchInitialBoxes(Number(suivi.fillLevels || 1)) : { initial: suivi.max ?? suivi.current ?? 0 };
  };
  const modifierRegle = (patch) => onChange({ resetRule: { ...rule, ...patch } });
  const modifierRegleCompteur = (id, patch) => modifierRegle({ counterRules: { ...(rule.counterRules || {}), [id]: { ...((rule.counterRules || {})[id] || {}), ...patch } } });
  const modifierRegleBloc = (id, patch) => modifierRegle({ boxBlocks: { ...(rule.boxBlocks || {}), [id]: { ...((rule.boxBlocks || {})[id] || {}), ...patch } } });
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
        {defaultMode === 'custom' && <div className="reset-box-preview">{blocks.map((block) => <div className="reset-box-block" key={block.id}><strong>{block.label}</strong>{block.lines.map((line) => <div className="box-row" key={line.id}><div className="box-label"></div><div className="boxes">{line.boxes.map((box) => <button key={box.id} className={`box mark-${boxVisualRank(box.initial, suivi.fillLevels || 1)} ${boxVisualRank(box.initial, suivi.fillLevels || 1) >= 5 ? 'full' : ''}`} onClick={() => modifierInitialBox(block.id, line.id, box.id)} />)}</div><span className="box-label right">{line.label}</span></div>)}</div>)}</div>}
      </div>
      {switchAuto}
      {autoActif && <div className="box-auto-grid">{blocks.map((block) => {
        const regle = (rule.boxBlocks || {})[block.id] || {};
        const maxLevel = regle.maxLevel ?? suivi.fillLevels ?? 1;
        return <div className="box-auto-row" key={block.id}><strong>{block.label || 'Bloc'}</strong><ChampNombre label="Cases" valeur={regle.amount ?? 1} onChange={(valeur) => modifierRegleBloc(block.id, { amount: valeur })} /><ChampNombre label="Cran" valeur={regle.levels ?? 1} onChange={(valeur) => modifierRegleBloc(block.id, { levels: valeur })} /><label className="field">Coche max<select value={maxLevel} onChange={(e) => modifierRegleBloc(block.id, { maxLevel: Number(e.target.value) })}>{optionsNiveaux.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>;
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
      {autoActif && <><div className="grid2"><ChampNombre label="Valeur additive" valeur={rule.step ?? 0} onChange={(valeur) => modifierRegle({ step: valeur })} /><ChampNombre label="% au-dessus max" valeur={rule.excessReductionPercent ?? ''} placeholder="aucun" onChange={(valeur) => modifierRegle({ excessReductionPercent: valeur, rounding: rule.rounding || 'floor' })} /></div><div className="grid2"><ChampNombre label="% sous minimum" valeur={rule.underflowRecoveryPercent ?? ''} placeholder="aucun" onChange={(valeur) => modifierRegle({ underflowRecoveryPercent: valeur, rounding: rule.rounding || 'floor' })} /><div /></div></>}
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
      {autoActif && <div className="grid2"><ChampNombre label="Pas" valeur={rule.step ?? 1} onChange={(valeur) => modifierRegle({ step: valeur })} /><label className="field">Action<select value={rule.pointsAutoMode || 'default'} onChange={(e) => modifierRegle({ pointsAutoMode: e.target.value })}><option value="default">Revenir a l'etat par defaut</option><option value="increase">Augmenter</option><option value="decrease">Reduire</option></select></label></div>}
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
          {defaultMode === 'custom' && (
            <div className="grid2">
              <ChampNombre label="Valeur" valeur={suivi.initial ?? 0} onChange={(valeur) => onChange({ initial: valeur })} />
              {estPuces && suivi.limitMode === 'loop' && <ChampNombre label="Compteur" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur })} />}
            </div>
          )}
        </div>
      )}
      {estCompteur && <p className="muted tracker-help">Le retour par defaut d'un compteur utilise ses valeurs initiales. Le pas automatique peut etre borne par les limites ci-dessous.</p>}
      <label className="reset-switch">
        <span>Automatique a l'activation</span>
        <input type="checkbox" checked={autoActif} onChange={(e) => onChange({ autoReset: e.target.checked ? 'activation' : 'never', resetRule: { ...rule, mode: 'towardDefault' } })} />
      </label>
      {autoActif && (
        <div className="grid2">
          <ChampNombre label={estPuces ? 'Pas non signe' : rule.stepMode === 'percent' ? 'Pas en %' : 'Pas'} valeur={rule.step ?? 1} onChange={(valeur) => onChange({ resetRule: { ...rule, mode: 'towardDefault', step: valeur } })} />
          {estCompteur && <label className="field">Mode du pas<select value={rule.stepMode || 'flat'} onChange={(e) => onChange({ resetRule: { ...rule, stepMode: e.target.value } })}><option value="flat">Valeur fixe</option><option value="percent">Pourcentage</option></select></label>}
        </div>
      )}
      {autoActif && estCompteur && <div className="grid2"><ChampNombre label="Min optionnel" valeur={rule.minCap ?? ''} placeholder="pas de borne" onChange={(valeur) => onChange({ resetRule: { ...rule, minCap: valeur } })} /><ChampNombre label="Max optionnel" valeur={rule.maxCap ?? ''} placeholder="pas de borne" onChange={(valeur) => onChange({ resetRule: { ...rule, maxCap: valeur } })} /></div>}
      {autoActif && estCompteur && rule.stepMode === 'percent' && <label className="field">Arrondi<select value={rule.rounding || 'nearest'} onChange={(e) => onChange({ resetRule: { ...rule, rounding: e.target.value } })}><option value="nearest">Mathematique</option><option value="floor">Inferieur</option><option value="ceil">Superieur</option></select></label>}
      {autoActif && estBarre && <div className="grid2"><ChampNombre label="% du depassement retire" valeur={rule.overflowTrimPercent ?? 0} onChange={(valeur) => onChange({ resetRule: { ...rule, overflowTrimPercent: valeur } })} /><div /></div>}
    </div>
  );
}

function OptionsParType({ suivi, onChange }) {
  if (suivi.type === 'number') return <><EditeurCompteursMultiples suivi={suivi} onChange={onChange} /><details className="advanced-options"><summary>Options avancees</summary><OptionsReset suivi={suivi} onChange={onChange} /><EditeurSeuils suivi={suivi} onChange={onChange} /></details></>;
  if (suivi.type === 'bar') return <><div className="grid2"><ChampNombre label="Pas" valeur={suivi.step ?? 1} onChange={(valeur) => onChange({ step: valeur })} /><div /></div><div className="grid2"><label className="row"><input type="checkbox" checked={suivi.minAbsolute !== false} onChange={(e) => onChange({ minAbsolute: e.target.checked })} /> bloquer au minimum</label><label className="row"><input type="checkbox" checked={suivi.maxAbsolute !== false} onChange={(e) => onChange({ maxAbsolute: e.target.checked })} /> bloquer au maximum</label></div><details className="advanced-options"><summary>Options avancees</summary><EditeurSeuils suivi={suivi} onChange={onChange} bounds={{ min: suivi.min ?? 0, max: suivi.max }} /><OptionsReset suivi={suivi} onChange={onChange} /></details></>;
  if (isPointsTracker(suivi)) return <><label className="field">Limite<select value={suivi.limitMode || 'clamp'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="clamp">Bloquer au max</option><option value="loop">Boucler avec compteur</option></select></label>{suivi.limitMode === 'loop' && <><div className="grid2"><ChampNombre label="Compteur actuel" valeur={suivi.cycles ?? 0} onChange={(valeur) => onChange({ cycles: valeur })} /><div /></div><div className="grid2"><ChampNombre label="Min compteur" valeur={suivi.cyclesMin ?? ''} placeholder="∞" onChange={(valeur) => onChange({ cyclesMin: valeur })} /><ChampNombre label="Max compteur" valeur={suivi.cyclesMax ?? ''} placeholder="∞" onChange={(valeur) => onChange({ cyclesMax: valeur })} /></div></>}<details className="advanced-options"><summary>Options avancees</summary><OptionsReset suivi={suivi} onChange={onChange} /><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title="Seuils sur les puces" bounds={{ min: suivi.min ?? 0, max: suivi.max }} />{suivi.limitMode === 'loop' && <EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title="Seuils sur le compteur global" bounds={{ min: suivi.cyclesMin, max: suivi.cyclesMax }} />}</details></>;
  if (suivi.type === 'clock') return <><div className="grid2"><ChampNombre label="Valeur initiale" valeur={suivi.initial ?? suivi.current ?? 0} onChange={(valeur) => onChange({ initial: valeur })} /><ChampNombre label="Incrementation" valeur={suivi.step ?? 1} onChange={(valeur) => onChange({ step: valeur })} /></div><label className="field">Terme<select value={suivi.limitMode || 'manual'} onChange={(e) => onChange({ limitMode: e.target.value })}><option value="manual">Manuel</option><option value="increment">Relancer et compter les tours</option><option value="overflow">Depasser avec zone rouge</option></select></label>{suivi.limitMode !== 'manual' && <div className="grid2"><ChampNombre label="Compteur initial" valeur={suivi.cyclesInitial ?? 0} onChange={(valeur) => onChange({ cyclesInitial: valeur, cycles: suivi.cycles ?? valeur })} /><ChampNombre label="Compteur actuel" valeur={suivi.cycles ?? 0} onChange={(valeur) => onChange({ cycles: valeur })} /></div>}<div className="grid2"><label className="row"><input type="checkbox" checked={!!suivi.auto} onChange={(e) => onChange({ auto: e.target.checked })} /> avance auto</label><label className="row"><input type="checkbox" checked={!!suivi.frozen} onChange={(e) => onChange({ frozen: e.target.checked })} /> figee</label></div><details className="advanced-options"><summary>Options avancees</summary><label className="field">Moment d'activation<select value={suivi.autoReset || 'activation'} onChange={(e) => onChange({ autoReset: e.target.value })}><option value="round">Debut du round</option><option value="activation">Activation du personnage</option></select></label><EditeurSeuils suivi={suivi} onChange={onChange} field="currentThresholds" title="Seuils sur l'horloge" bounds={{ min: suivi.min ?? 0, max: suivi.max }} />{suivi.limitMode !== 'manual' && <EditeurSeuils suivi={suivi} onChange={onChange} field="totalThresholds" title="Seuils sur le compteur" />}</details></>;
  return null;
}

export function EditeurSuivi({ suivi, onChange, onDelete }) {
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur });
  const estCases = isBoxesTracker(suivi);
  const estNumerique = isNumericTracker(suivi);

  return <div className="tracker"><div className="tracker-edit-head"><input value={suivi.name} onChange={(e) => modifierSuivi({ name: e.target.value })} aria-label="Nom du suivi" /><select value={suivi.type} aria-label="Type de suivi" onChange={(e) => onChange({ ...newTracker(e.target.value), id: suivi.id, name: suivi.name })}>{Object.entries(trackerTypeLabels).map(([valeur, label]) => <option value={valeur} key={valeur}>{label}</option>)}</select><button className="danger-btn compact-danger" onClick={onDelete}>x</button></div><div className="sub-options-row"><button className="quick-reset-btn text" onClick={() => onChange(resetTracker(suivi, 'initial'))} title="Remettre au depart">Reset</button>{suivi.type === 'number' && <ChampNombre className="compact-step-field" label="Pas" valeur={suivi.step ?? 1} onChange={(valeur) => modifierSuivi({ step: valeur })} />}<ToggleIconeSuivi suivi={suivi} onChange={modifierSuivi} /></div><div className="grid2">{estNumerique && suivi.type !== 'number' && <ChampNombre label="Valeur actuelle" valeur={suivi.current ?? 0} onChange={(valeur) => modifierSuivi({ current: valeur })} />}{estNumerique && suivi.type !== 'number' && <ChampNombre label="Maximum" valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} />}{suivi.type === 'bar' && <ChampNombre label="Minimum" valeur={suivi.min ?? 0} onChange={(valeur) => modifierSuivi({ min: valeur })} />}</div><OptionsParType suivi={suivi} onChange={modifierSuivi} />{estCases && <EditeurCases suivi={suivi} onChange={onChange} resetOptions={<OptionsReset suivi={suivi} onChange={modifierSuivi} />} />}</div>;
}

export function FenetreEditionFiche({ participant, initiativeTextOrder, phaseActionMode, phaseCount = defaultPhaseCount, multipleActionSlots = true, trackerTemplates = [], title = 'Modifier', saveTemplateVisible = true, deleteLabel = 'Supprimer la fiche', onClose, onSave, onDelete, onSaveTemplate }) {
  const textConfig = normalizeInitiativeTextOrder(initiativeTextOrder);
  const modePhasesCochees = phaseActionMode === phaseActionModes.CHECKED;
  const [brouillon, setBrouillon] = useState({ ...clone(participant), phaseActions: modePhasesCochees ? (Array.isArray(participant.phaseActions) ? participant.phaseActions : ['1']) : participant.phaseActions, _actionSlotsInput: texteCreneauxAction(participant), _actionSlotsDraft: multipleActionSlots ? brouillonCreneauxAction(participant) : brouillonCreneauxAction(participant).slice(0, 1), stats: normaliserInfosRapides(participant.stats || []) });
  const [trackerTemplateId, setTrackerTemplateId] = useState(trackerTemplates[0]?.id || '');
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const creneauxActionSource = Array.isArray(brouillon._actionSlotsDraft) && brouillon._actionSlotsDraft.length ? brouillon._actionSlotsDraft : brouillonCreneauxAction(brouillon);
  const creneauxAction = multipleActionSlots ? creneauxActionSource : creneauxActionSource.slice(0, 1);
  const modifierCreneauAction = (index, valeur) => setBrouillon((courant) => ({
    ...courant,
    _actionSlotsDraft: (courant._actionSlotsDraft || brouillonCreneauxAction(courant)).map((slot, position) => position === index ? { ...slot, initiative: valeur } : slot),
  }));
  const ajouterCreneauAction = () => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    const dernier = slots.at(-1)?.initiative ?? courant.initiative ?? 0;
    return { ...courant, _actionSlotsDraft: [...slots, { id: uid('slot'), initiative: dernier }] };
  });
  const retirerCreneauAction = (index) => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    const suivants = slots.filter((_, position) => position !== index);
    return { ...courant, _actionSlotsDraft: suivants.length ? suivants : slots.slice(0, 1) };
  });
  const basculerActionsMultiples = (actif) => setBrouillon((courant) => {
    const slots = courant._actionSlotsDraft || brouillonCreneauxAction(courant);
    if (!actif) return { ...courant, _actionSlotsDraft: slots.slice(0, 1) };
    return { ...courant, _actionSlotsDraft: slots.length > 1 ? slots : [...slots, { id: uid('slot'), initiative: slots[0]?.initiative ?? courant.initiative ?? 0 }] };
  });
  const ajouterSuiviDepuisTemplate = () => {
    const template = trackerTemplates.find((item) => item.id === trackerTemplateId) || trackerTemplates[0];
    const suivi = instantiateTrackerTemplate(template);
    if (!suivi) return;
    setBrouillon((courant) => ({ ...courant, trackers: [...(courant.trackers || []), suivi] }));
  };
  const renduEditionMultiple = (entete, valider, enregistrerCommeTemplate) => (
    <>
      <Fenetre title={title} onClose={onClose} header={entete}>
        <label className="field">Nom<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label>
        <label className="field">Description<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label>
        <div className="grid2">
          <label className="field">Type<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{participantKinds.map((type) => <option key={type}>{type}</option>)}</select></label>
          <ChampInitiative label="Initiative 1" valeur={creneauxAction[0]?.initiative ?? brouillon.initiative ?? 0} textConfig={textConfig} onChange={(valeur) => modifierCreneauAction(0, valeur)} />
        </div>
        {multipleActionSlots && <div className="action-slots-editor">
          <label className="row"><input type="checkbox" checked={creneauxAction.length > 1} onChange={(e) => basculerActionsMultiples(e.target.checked)} /> plusieurs actions</label>
          {creneauxAction.length > 1 && <div className="stack action-slot-list">
            {creneauxAction.slice(1).map((slot, index) => (
              <div className="initiative-action-row" key={slot.id || index}>
                <ChampInitiative label={`Initiative ${index + 2}`} valeur={slot.initiative} textConfig={textConfig} onChange={(valeur) => modifierCreneauAction(index + 1, valeur)} />
                <button className="small-btn subtle-danger" onClick={() => retirerCreneauAction(index + 1)}>x</button>
              </div>
            ))}
            <button className="small-btn" onClick={ajouterCreneauAction}>+ action</button>
          </div>}
        </div>}
        {modePhasesCochees && <EditeurPhasesParticipant phaseActions={brouillon.phaseActions} phaseCount={phaseCount} onChange={(phaseActions) => modifierChamp('phaseActions', phaseActions)} />}
        <div className="grid2"><ChampNombre label="Departage" valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /><div /></div>
        <div className="grid2"><label className="field">Symbole<select value={brouillon.symbol || symbols[0]} onChange={(e) => modifierChamp('symbol', e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}</select></label><label className="field">Couleur<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div>
        <h3>Infos rapides</h3>
        <EditeurInfosRapides stats={brouillon.stats || []} onChange={(stats) => modifierChamp('stats', stats)} />
        <h3>Suivis</h3>
        <div className="stack tracker-list">{brouillon.trackers.map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.filter((item) => item.id !== suivi.id) }))} />)}<button className="primary add-tracker-btn" onClick={() => setBrouillon((courant) => ({ ...courant, trackers: [...courant.trackers, newTracker('bar')] }))}>Ajouter un suivi</button>{trackerTemplates.length > 0 && <div className="template-picker-row"><select value={trackerTemplateId} onChange={(event) => setTrackerTemplateId(event.target.value)}>{trackerTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}</select><button className="small-btn" type="button" onClick={ajouterSuiviDepuisTemplate}>Depuis template</button></div>}</div>
        {saveTemplateVisible && <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>Enregistrer comme template</button>}
        <div className="edit-actions-row" style={{ marginTop: 12 }}><button className="small-btn" onClick={onClose}>Annuler</button><button className="primary" onClick={valider}>Valider</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>{deleteLabel}</button></div>
      </Fenetre>
      {confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}
    </>
  );
  const modifierChamp = (clef, valeur) => setBrouillon((courant) => ({ ...courant, [clef]: valeur }));
  const modifierSuivi = (id, suivant) => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.map((suivi) => suivi.id === id ? suivant : suivi) }));
  const valider = () => onSave(normaliserFiche(brouillon, textConfig, { phaseActionMode, phaseCount, multipleActionSlots }));
  const enregistrerCommeTemplate = () => onSaveTemplate?.(normaliserFiche(brouillon, textConfig, { phaseActionMode, phaseCount, multipleActionSlots }));
  const enteteMultiple = <div className="edit-sheet-header"><h2>{title}</h2><button className="icon-btn validate-edit-btn" onClick={valider} aria-label="Valider les modifications">{'✓'}</button></div>;
  return renduEditionMultiple(enteteMultiple, valider, enregistrerCommeTemplate);
  const entete = <div className="edit-sheet-header"><h2>{title}</h2><button className="icon-btn validate-edit-btn" onClick={valider} aria-label="Valider les modifications">{'✓'}</button></div>;

  return <><Fenetre title={title} onClose={onClose} header={entete}><label className="field">Nom<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label><label className="field">Description<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label><div className="grid2"><label className="field">Type<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{participantKinds.map((type) => <option key={type}>{type}</option>)}</select></label><ChampNombre label="Initiative" valeur={brouillon.initiative} onChange={(valeur) => modifierChamp('initiative', valeur)} /></div><label className="field">Créneaux d'action<input value={brouillon._actionSlotsInput || ''} placeholder="18 / 12 / 6" onChange={(e) => modifierChamp('_actionSlotsInput', e.target.value)} /></label><div className="grid2"><ChampNombre label="Departage" valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /><div /></div><div className="grid2"><label className="field">Symbole<select value={brouillon.symbol || symbols[0]} onChange={(e) => modifierChamp('symbol', e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}</select></label><label className="field">Couleur<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div><h3>Infos rapides</h3><EditeurInfosRapides stats={brouillon.stats || []} onChange={(stats) => modifierChamp('stats', stats)} /><h3>Suivis</h3><div className="stack tracker-list">{brouillon.trackers.map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.filter((item) => item.id !== suivi.id) }))} />)}<button className="primary add-tracker-btn" onClick={() => setBrouillon((courant) => ({ ...courant, trackers: [...courant.trackers, newTracker('bar')] }))}>Ajouter un suivi</button></div>{saveTemplateVisible && <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>Enregistrer comme template</button>}<div className="edit-actions-row" style={{ marginTop: 12 }}><button className="small-btn" onClick={onClose}>Annuler</button><button className="primary" onClick={valider}>Valider</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>{deleteLabel}</button></div></Fenetre>{confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}</>;
}
