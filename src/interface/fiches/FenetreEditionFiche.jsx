import { useState } from 'react';
import { colorNames, participantKinds, trackerTypeLabels } from '../../constants.js';
import { boxGroups, boxVisualRank, clone, colors, isVisible, newTracker, sortBoxGroups, symbols, uid } from '../../logic.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreConfirmationSuppression } from '../dialogues/FenetreConfirmationSuppression.jsx';
import { normaliserInfoRapide, normaliserInfosRapides, serialiserInfosRapides } from './InfosRapides.jsx';

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

function bornerNiveaux(valeur) {
  return Math.max(1, Math.min(5, entierPositif(valeur, 1)));
}

function normaliserGroupesCases(suivi) {
  const niveaux = bornerNiveaux(suivi.fillLevels || 1);
  return boxGroups(suivi).map((groupe) => ({
    ...groupe,
    id: groupe.id || uid('g'),
    label: groupe.label || 'Groupe',
    rows: (groupe.rows || []).map((ligne) => ({
      ...ligne,
      id: ligne.id || uid('r'),
      label: ligne.label || 'Ligne',
      marks: (ligne.marks?.length ? ligne.marks : [0]).map((marque) => Math.max(0, Math.min(niveaux, nombreOuDefaut(marque, 0)))),
    })),
    initialRows: groupe.initialRows || (groupe.rows || []).map((ligne) => ({ marks: ligne.marks || [] })),
  }));
}

function normaliserFiche(brouillon) {
  return {
    ...brouillon,
    stats: serialiserInfosRapides(brouillon.stats),
    initiative: nombreOuDefaut(brouillon.initiative, 0),
    departage: brouillon.departage === '' ? '' : nombreOuDefaut(brouillon.departage, 0),
    trackers: (brouillon.trackers || []).map((suivi) => {
      if (suivi.type === 'boxes') {
        return {
          ...suivi,
          type: 'boxes',
          boxMode: 'sorted',
          fillLevels: bornerNiveaux(suivi.fillLevels || 1),
          groups: normaliserGroupesCases(suivi),
          rows: [],
        };
      }
      return {
        ...suivi,
        current: nombreOuDefaut(suivi.current, 0),
        max: suivi.max === null ? null : entierPositif(suivi.max, 1),
        min: suivi.min === null ? null : nombreOuDefaut(suivi.min, 0),
        step: entierPositif(suivi.step, 1),
      };
    }),
  };
}

function retirerCase(marques = []) {
  return marques.length > 1 ? marques.slice(0, -1) : marques;
}

function ajouterCase(marques = []) {
  return [...marques, 0];
}

function ApercuCases({ marques, niveaux }) {
  const maximum = bornerNiveaux(niveaux);
  return <div className="boxes-preview">{marques.map((valeur, index) => <span key={index} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function ApercuNiveaux({ niveaux }) {
  const maximum = bornerNiveaux(niveaux);
  const marques = Array.from({ length: maximum + 1 }, (_, index) => index);
  return <div className="levels-preview">{marques.map((valeur) => <span key={valeur} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function EditeurCases({ suivi, onChange }) {
  const groupes = normaliserGroupesCases(suivi);
  const niveaux = bornerNiveaux(suivi.fillLevels || 1);
  const modifierSuivi = (patch) => onChange({ ...suivi, ...patch, boxMode: 'sorted', rows: [] });
  const modifierGroupes = (suivants) => modifierSuivi({ groups: sortBoxGroups({ ...suivi, fillLevels: niveaux, groups: suivants }).groups });
  const modifierGroupe = (groupeId, modification) => modifierGroupes(groupes.map((groupe) => groupe.id === groupeId ? modification(groupe) : groupe));
  const ajouterGroupe = () => modifierGroupes([...groupes, { id: uid('g'), label: `Groupe ${groupes.length + 1}`, rows: [{ id: uid('r'), label: 'Ligne 1', marks: [0, 0, 0, 0] }], initialRows: [{ marks: [0, 0, 0, 0] }] }]);
  const retirerGroupe = (groupeId) => modifierGroupes(groupes.length > 1 ? groupes.filter((groupe) => groupe.id !== groupeId) : groupes);
  const ajouterLigne = (groupeId) => modifierGroupe(groupeId, (groupe) => ({ ...groupe, rows: [...groupe.rows, { id: uid('r'), label: `Ligne ${groupe.rows.length + 1}`, marks: [0, 0, 0, 0] }] }));
  const retirerLigne = (groupeId, ligneId) => modifierGroupe(groupeId, (groupe) => ({ ...groupe, rows: groupe.rows.length > 1 ? groupe.rows.filter((ligne) => ligne.id !== ligneId) : groupe.rows }));
  const changerNiveaux = (delta) => modifierSuivi({ fillLevels: Math.max(1, Math.min(5, niveaux + delta)), groups: sortBoxGroups({ ...suivi, fillLevels: Math.max(1, Math.min(5, niveaux + delta)), groups: groupes }).groups });

  return <div className="box-editor"><div className="box-level-row"><span>Niveaux par case</span><button className="small-btn" onClick={() => changerNiveaux(-1)} disabled={niveaux <= 1}>−</button><ApercuNiveaux niveaux={niveaux} /><button className="small-btn" onClick={() => changerNiveaux(1)} disabled={niveaux >= 5}>+</button></div><p className="muted" style={{ marginTop: -2, fontSize: 12 }}>Toutes les cases sont triées. Chaque groupe est trié séparément, de gauche à droite puis de haut en bas.</p><div className="stack">{groupes.map((groupe) => <div className="box-edit-row" key={groupe.id}><div className="box-line-name"><label>Groupe</label><input value={groupe.label} onChange={(e) => modifierGroupe(groupe.id, (courant) => ({ ...courant, label: e.target.value }))} /><button className="small-btn" onClick={() => ajouterLigne(groupe.id)}>+ ligne</button><button className="small-btn subtle-danger" onClick={() => retirerGroupe(groupe.id)} disabled={groupes.length <= 1}>Suppr.</button></div>{groupe.rows.map((ligne) => <div className="box-count-row" key={ligne.id}><input value={ligne.label} onChange={(e) => modifierGroupe(groupe.id, (courant) => ({ ...courant, rows: courant.rows.map((item) => item.id === ligne.id ? { ...item, label: e.target.value } : item) }))} /><button className="small-btn" onClick={() => modifierGroupe(groupe.id, (courant) => ({ ...courant, rows: courant.rows.map((item) => item.id === ligne.id ? { ...item, marks: retirerCase(item.marks || []) } : item) }))} disabled={(ligne.marks || []).length <= 1}>− case</button><ApercuCases marques={ligne.marks || []} niveaux={niveaux} /><button className="small-btn" onClick={() => modifierGroupe(groupe.id, (courant) => ({ ...courant, rows: courant.rows.map((item) => item.id === ligne.id ? { ...item, marks: ajouterCase(item.marks || []) } : item) }))}>+ case</button><button className="small-btn subtle-danger" onClick={() => retirerLigne(groupe.id, ligne.id)} disabled={groupe.rows.length <= 1}>×</button></div>)}</div>)}</div><button className="small-btn" onClick={ajouterGroupe}>+ groupe</button></div>;
}

function ChampNombre({ label, valeur, onChange }) {
  return <label className="field">{label}<input type="number" inputMode="numeric" value={valeur ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></label>;
}

function ChampSelect({ label, valeur, onChange, options }) {
  return <label className="field">{label}<select value={valeur ?? ''} onChange={(e) => onChange(e.target.value)}>{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>;
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

  return <div className="stack quick-stats-editor">{lignes.map((info, index) => <div className={`quick-stat-row ${info.editable ? 'editable' : ''}`} key={index}>{info.editable ? <><input className="quick-stat-label-input" value={info.label} placeholder="Libellé" onChange={(e) => modifier(index, { label: e.target.value })} /><input className="quick-stat-value-input" value={info.value} placeholder="Valeur" onChange={(e) => modifier(index, { value: e.target.value })} /></> : <input value={[info.label, info.value].filter(Boolean).join(' ')} placeholder="CA 21, Attaque +6, Armure lourde…" onChange={(e) => changerTexte(index, e.target.value)} />}<label className="quick-stat-edit-toggle"><input type="checkbox" checked={!!info.editable} onChange={(e) => changerModifiable(index, e.target.checked)} /> valeur modifiable</label><button className="small-btn subtle-danger" onClick={() => supprimer(index)} disabled={lignes.length <= 1 && !info.label && !info.value}>×</button></div>)}<button className="small-btn" onClick={ajouter}>+ info rapide</button></div>;
}

const autoOptions = [['never', 'Jamais'], ['round', 'Début de round'], ['activation', 'Activation']];
const resetOptions = [['initial', 'Initial'], ['zero', 'Zéro'], ['max', 'Maximum'], ['checked', 'Tout coché']];

function EditeurAutomatisation({ suivi, onChange }) {
  const rule = suivi.resetRule || {};
  const patchRule = (patch) => onChange({ ...suivi, resetRule: { ...rule, ...patch } });
  const patchCounterRule = (id, patch) => patchRule({ counterRules: { ...(rule.counterRules || {}), [id]: { ...((rule.counterRules || {})[id] || {}), ...patch } } });
  const groupes = suivi.type === 'boxes' ? normaliserGroupesCases(suivi) : [];
  const reglesGroupes = rule.boxGroups || rule.boxRows || {};
  const patchBoxGroup = (id, patch) => patchRule({ boxGroups: { ...reglesGroupes, [id]: { ...(reglesGroupes[id] || {}), ...patch } } });

  return <details className="tracker-automation" open={suivi.autoReset !== 'never'}><summary>Automatisation</summary><div className="grid2"><ChampSelect label={suivi.type === 'clock' ? 'Avance' : 'Déclencheur'} valeur={suivi.autoReset || 'never'} onChange={(autoReset) => onChange({ ...suivi, autoReset })} options={autoOptions} /><ChampSelect label="Reset manuel" valeur={suivi.resetMode || 'initial'} onChange={(resetMode) => onChange({ ...suivi, resetMode })} options={suivi.type === 'boxes' ? resetOptions : resetOptions.filter(([value]) => value !== 'checked')} /></div><label className="row"><input type="checkbox" checked={!!suivi.autoResetPaused} onChange={(e) => onChange({ ...suivi, autoResetPaused: e.target.checked })} /> automatisation en pause</label>{suivi.type === 'bar' && <div className="grid2"><ChampNombre label="Variation fixe" valeur={rule.step ?? 0} onChange={(step) => patchRule({ step })} /><ChampNombre label="Réduction excès %" valeur={rule.excessReductionPercent ?? ''} onChange={(excessReductionPercent) => patchRule({ excessReductionPercent })} /></div>}{suivi.type === 'points' && <div className="grid2"><ChampSelect label="Mode" valeur={rule.pointsAutoMode || 'towardInitial'} onChange={(pointsAutoMode) => patchRule({ pointsAutoMode: pointsAutoMode === 'towardInitial' ? undefined : pointsAutoMode })} options={[[ 'towardInitial', 'Vers initial' ], [ 'increase', 'Augmenter' ], [ 'decrease', 'Diminuer' ]]} /><ChampNombre label="Pas" valeur={rule.step ?? suivi.step ?? 1} onChange={(step) => patchRule({ step })} /></div>}{suivi.type === 'clock' && <p className="muted" style={{ fontSize: 12 }}>L’horloge avance selon son déclencheur, avec son pas et sa direction.</p>}{suivi.type === 'number' && <div className="stack"><div className="grid2"><ChampSelect label="Mode simple" valeur={rule.stepMode || 'fixed'} onChange={(stepMode) => patchRule({ stepMode })} options={[[ 'fixed', 'Fixe' ], [ 'percent', 'Pourcentage' ]]} /><ChampNombre label="Pas simple" valeur={rule.step ?? suivi.step ?? 1} onChange={(step) => patchRule({ step })} /></div><h4>Règles par compteur</h4><div className="grid2"><ChampNombre label="Principal fixe" valeur={(rule.counterRules || {}).__main?.flat ?? ''} onChange={(flat) => patchCounterRule('__main', { flat })} /><ChampNombre label="Principal %" valeur={(rule.counterRules || {}).__main?.percent ?? ''} onChange={(percent) => patchCounterRule('__main', { percent })} /></div>{(suivi.counters || []).map((compteur) => <div className="grid2" key={compteur.id}><ChampNombre label={`${compteur.label || compteur.id} fixe`} valeur={(rule.counterRules || {})[compteur.id]?.flat ?? ''} onChange={(flat) => patchCounterRule(compteur.id, { flat })} /><ChampNombre label={`${compteur.label || compteur.id} %`} valeur={(rule.counterRules || {})[compteur.id]?.percent ?? ''} onChange={(percent) => patchCounterRule(compteur.id, { percent })} /></div>)}</div>}{suivi.type === 'boxes' && <div className="stack"><p className="muted" style={{ fontSize: 12 }}>Pour chaque groupe : nombre de cases affectées, réduction appliquée, niveau maximum modifiable.</p>{groupes.map((groupe) => <div className="grid2" key={groupe.id}><ChampNombre label={`${groupe.label} : cases`} valeur={reglesGroupes[groupe.id]?.amount ?? 1} onChange={(amount) => patchBoxGroup(groupe.id, { amount })} /><ChampNombre label={`${groupe.label} : réduction`} valeur={reglesGroupes[groupe.id]?.levels ?? 1} onChange={(levels) => patchBoxGroup(groupe.id, { levels })} /><ChampNombre label={`${groupe.label} : niveau max`} valeur={reglesGroupes[groupe.id]?.maxLevel ?? suivi.fillLevels ?? 1} onChange={(maxLevel) => patchBoxGroup(groupe.id, { maxLevel })} /></div>)}</div>}</details>;
}

function EditeurSuivi({ suivi, onChange, onDelete }) {
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur });

  return <div className="tracker"><div className="tracker-edit-head"><input value={suivi.name} onChange={(e) => modifierSuivi({ name: e.target.value })} aria-label="Nom du suivi" /><select value={suivi.type} aria-label="Type de suivi" onChange={(e) => onChange({ ...newTracker(e.target.value), id: suivi.id, name: suivi.name })}>{Object.entries(trackerTypeLabels).map(([valeur, label]) => <option value={valeur} key={valeur}>{label}</option>)}</select><button className="danger-btn compact-danger" onClick={onDelete}>×</button></div><div className="grid2">{suivi.type !== 'boxes' && <ChampNombre label="Valeur" valeur={suivi.current ?? 0} onChange={(valeur) => modifierSuivi({ current: valeur })} />}{suivi.type !== 'number' && suivi.type !== 'boxes' && <ChampNombre label="Maximum" valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} />}{(suivi.type === 'bar' || suivi.type === 'number') && <ChampNombre label="Minimum" valeur={suivi.min ?? 0} onChange={(valeur) => modifierSuivi({ min: valeur })} />}{(suivi.type === 'bar' || suivi.type === 'number' || suivi.type === 'clock' || suivi.type === 'points') && <ChampNombre label="Pas" valeur={suivi.step ?? 1} onChange={(valeur) => modifierSuivi({ step: valeur })} />}</div><label className="row"><input type="checkbox" checked={isVisible(suivi)} onChange={(e) => modifierSuivi({ visible: e.target.checked })} /> visible sur fichette</label>{suivi.type === 'bar' && <div className="grid2"><label className="row"><input type="checkbox" checked={!!suivi.minAbsolute} onChange={(e) => modifierSuivi({ minAbsolute: e.target.checked })} /> min absolu</label><label className="row"><input type="checkbox" checked={!!suivi.maxAbsolute} onChange={(e) => modifierSuivi({ maxAbsolute: e.target.checked })} /> max absolu</label></div>}{suivi.type === 'clock' && <div className="grid2"><ChampSelect label="Direction" valeur={suivi.direction || 'progression'} onChange={(direction) => modifierSuivi({ direction })} options={[[ 'progression', 'Progression' ], [ 'countdown', 'Compte à rebours' ]]} /><label className="row"><input type="checkbox" checked={!!suivi.frozen} onChange={(e) => modifierSuivi({ frozen: e.target.checked })} /> figée</label></div>}{suivi.type === 'boxes' && <EditeurCases suivi={suivi} onChange={onChange} />}<EditeurAutomatisation suivi={suivi} onChange={onChange} /></div>;
}

export function FenetreEditionFiche({ participant, title = 'Modifier', saveTemplateVisible = true, deleteLabel = 'Supprimer la fiche', onClose, onSave, onDelete, onSaveTemplate }) {
  const [brouillon, setBrouillon] = useState({ ...clone(participant), stats: normaliserInfosRapides(participant.stats || []) });
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const modifierChamp = (clef, valeur) => setBrouillon((courant) => ({ ...courant, [clef]: valeur }));
  const modifierSuivi = (id, suivant) => setBrouillon((courant) => ({ ...courant, trackers: (courant.trackers || []).map((suivi) => suivi.id === id ? suivant : suivi) }));
  const valider = () => onSave(normaliserFiche(brouillon));
  const enregistrerCommeTemplate = () => onSaveTemplate?.(normaliserFiche(brouillon));
  const entete = <div className="edit-sheet-header"><h2>{title}</h2><button className="icon-btn validate-edit-btn" onClick={valider} aria-label="Valider les modifications">✓</button></div>;

  return <><Fenetre title={title} onClose={onClose} header={entete}><label className="field">Nom<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label><label className="field">Description<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label><div className="grid2"><label className="field">Type<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{participantKinds.map((type) => <option key={type}>{type}</option>)}</select></label><ChampNombre label="Initiative" valeur={brouillon.initiative} onChange={(valeur) => modifierChamp('initiative', valeur)} /></div><div className="grid2"><ChampNombre label="Départage" valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /><div /></div><div className="grid2"><label className="field">Symbole<select value={brouillon.symbol || symbols[0]} onChange={(e) => modifierChamp('symbol', e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}</select></label><label className="field">Couleur<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div><h3>Infos rapides</h3><EditeurInfosRapides stats={brouillon.stats || []} onChange={(stats) => modifierChamp('stats', stats)} /><h3>Suivis</h3><div className="stack tracker-list">{(brouillon.trackers || []).map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.filter((item) => item.id !== suivi.id) }))} />)}<button className="primary add-tracker-btn" onClick={() => setBrouillon((courant) => ({ ...courant, trackers: [...(courant.trackers || []), newTracker('bar')] }))}>Ajouter un suivi</button></div>{saveTemplateVisible && <button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>Enregistrer comme template</button>}<div className="grid2" style={{ marginTop: 12 }}><button className="primary" onClick={valider}>Valider</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>{deleteLabel}</button></div></Fenetre>{confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}</>;
}
