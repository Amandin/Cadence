import { useState } from 'react';
import { colorNames, participantKinds, trackerTypeLabels } from '../../constants.js';
import { boxVisualRank, clone, colors, isVisible, newTracker, symbols, uid } from '../../logic.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { FenetreConfirmationSuppression } from '../dialogues/FenetreConfirmationSuppression.jsx';

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
    initiative: nombreOuDefaut(brouillon.initiative, 0),
    departage: brouillon.departage === '' ? '' : nombreOuDefaut(brouillon.departage, 0),
    trackers: brouillon.trackers.map((suivi) => {
      if (suivi.type === 'boxes') {
        return {
          ...suivi,
          fillLevels: entierPositif(suivi.fillLevels, 5),
          rows: suivi.rows.map((ligne) => ({ ...ligne, marks: ligne.marks?.length ? ligne.marks : [0] })),
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
  const maximum = entierPositif(niveaux, 5);
  return <div className="boxes-preview">{marques.map((valeur, index) => <span key={index} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function ApercuNiveaux({ niveaux }) {
  const maximum = entierPositif(niveaux, 5);
  const marques = Array.from({ length: maximum + 1 }, (_, index) => index);
  return <div className="levels-preview">{marques.map((valeur) => <span key={valeur} className={`box preview mark-${boxVisualRank(valeur, maximum)} ${boxVisualRank(valeur, maximum) >= 5 ? 'full' : ''}`} />)}</div>;
}

function EditeurCases({ suivi, onChange }) {
  const lignes = suivi.rows?.length ? suivi.rows : [{ id: uid('r'), label: 'Ligne', marks: [0, 0, 0, 0] }];
  const niveaux = entierPositif(suivi.fillLevels, 5);
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur, rows: lignes });
  const modifierLigne = (ligneId, modification) => onChange({ ...suivi, rows: lignes.map((ligne) => ligne.id === ligneId ? modification(ligne) : ligne) });
  const ajouterLigne = () => onChange({ ...suivi, rows: [...lignes, { id: uid('r'), label: `Ligne ${lignes.length + 1}`, marks: [0, 0, 0, 0] }] });
  const retirerLigne = (ligneId) => onChange({ ...suivi, rows: lignes.length > 1 ? lignes.filter((ligne) => ligne.id !== ligneId) : lignes });
  const changerNiveaux = (delta) => modifierSuivi({ fillLevels: Math.max(1, Math.min(5, niveaux + delta)) });

  return <div className="box-editor"><div className="line-count-row"><label>Lignes</label><strong>{lignes.length}</strong><button className="small-btn" onClick={ajouterLigne}>+ ligne</button></div><div className="box-level-row"><span>États par case</span><button className="small-btn" onClick={() => changerNiveaux(-1)} disabled={niveaux <= 1}>−</button><ApercuNiveaux niveaux={niveaux} /><button className="small-btn" onClick={() => changerNiveaux(1)} disabled={niveaux >= 5}>+</button></div><p className="muted" style={{ marginTop: -2, fontSize: 12 }}>De gauche à droite : vide, puis les états actifs. Les niveaux retirés disparaissent dans l’ordre 3, 4, puis 1.</p><div className="stack">{lignes.map((ligne) => <div className="box-edit-row" key={ligne.id}><div className="box-line-name"><label>Nom de ligne</label><input value={ligne.label} onChange={(e) => modifierLigne(ligne.id, (courante) => ({ ...courante, label: e.target.value }))} /><button className="small-btn subtle-danger" onClick={() => retirerLigne(ligne.id)} disabled={lignes.length <= 1}>Suppr.</button></div><div className="box-count-row"><span>Cases</span><button className="small-btn" onClick={() => modifierLigne(ligne.id, (courante) => ({ ...courante, marks: retirerCase(courante.marks || []) }))} disabled={(ligne.marks || []).length <= 1}>−</button><ApercuCases marques={ligne.marks || []} niveaux={niveaux} /><button className="small-btn" onClick={() => modifierLigne(ligne.id, (courante) => ({ ...courante, marks: ajouterCase(courante.marks || []) }))}>+</button></div></div>)}</div></div>;
}

function ChampNombre({ label, valeur, onChange }) {
  return <label className="field">{label}<input type="number" inputMode="numeric" value={valeur ?? ''} onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))} /></label>;
}

function EditeurSuivi({ suivi, onChange, onDelete }) {
  const modifierSuivi = (valeur) => onChange({ ...suivi, ...valeur });

  return <div className="tracker"><div className="tracker-edit-head"><input value={suivi.name} onChange={(e) => modifierSuivi({ name: e.target.value })} aria-label="Nom du suivi" /><select value={suivi.type} aria-label="Type de suivi" onChange={(e) => onChange({ ...newTracker(e.target.value), id: suivi.id, name: suivi.name })}>{Object.entries(trackerTypeLabels).map(([valeur, label]) => <option value={valeur} key={valeur}>{label}</option>)}</select><button className="danger-btn compact-danger" onClick={onDelete}>×</button></div><div className="grid2">{suivi.type !== 'boxes' && <ChampNombre label="Valeur" valeur={suivi.current ?? 0} onChange={(valeur) => modifierSuivi({ current: valeur })} />}{suivi.type !== 'number' && suivi.type !== 'boxes' && <ChampNombre label="Maximum" valeur={suivi.max ?? 1} onChange={(valeur) => modifierSuivi({ max: valeur })} />}{(suivi.type === 'bar' || suivi.type === 'number') && <ChampNombre label="Minimum" valeur={suivi.min ?? 0} onChange={(valeur) => modifierSuivi({ min: valeur })} />}{(suivi.type === 'bar' || suivi.type === 'number') && <ChampNombre label="Pas" valeur={suivi.step ?? 1} onChange={(valeur) => modifierSuivi({ step: valeur })} />}</div><label className="row"><input type="checkbox" checked={isVisible(suivi)} onChange={(e) => modifierSuivi({ visible: e.target.checked })} /> visible sur fichette</label>{suivi.type === 'bar' && <div className="grid2"><label className="row"><input type="checkbox" checked={!!suivi.minAbsolute} onChange={(e) => modifierSuivi({ minAbsolute: e.target.checked })} /> min absolu</label><label className="row"><input type="checkbox" checked={!!suivi.maxAbsolute} onChange={(e) => modifierSuivi({ maxAbsolute: e.target.checked })} /> max absolu</label></div>}{suivi.type === 'clock' && <div className="grid2"><label className="row"><input type="checkbox" checked={!!suivi.auto} onChange={(e) => modifierSuivi({ auto: e.target.checked })} /> avance auto</label><label className="row"><input type="checkbox" checked={!!suivi.frozen} onChange={(e) => modifierSuivi({ frozen: e.target.checked })} /> figée</label></div>}{suivi.type === 'boxes' && <EditeurCases suivi={suivi} onChange={onChange} />}</div>;
}

export function FenetreEditionFiche({ participant, onClose, onSave, onDelete, onSaveTemplate }) {
  const [brouillon, setBrouillon] = useState(clone(participant));
  const [confirmationSuppression, setConfirmationSuppression] = useState(false);
  const modifierChamp = (clef, valeur) => setBrouillon((courant) => ({ ...courant, [clef]: valeur }));
  const modifierSuivi = (id, suivant) => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.map((suivi) => suivi.id === id ? suivant : suivi) }));
  const enregistrerCommeTemplate = () => onSaveTemplate?.(normaliserFiche(brouillon));

  return <><Fenetre title="Modifier" onClose={onClose}><label className="field">Nom<input value={brouillon.name} onChange={(e) => modifierChamp('name', e.target.value)} /></label><label className="field">Description<textarea value={brouillon.description || ''} onChange={(e) => modifierChamp('description', e.target.value)} /></label><div className="grid2"><label className="field">Type<select value={brouillon.kind} onChange={(e) => modifierChamp('kind', e.target.value)}>{participantKinds.map((type) => <option key={type}>{type}</option>)}</select></label><ChampNombre label="Initiative" valeur={brouillon.initiative} onChange={(valeur) => modifierChamp('initiative', valeur)} /></div><div className="grid2"><ChampNombre label="Départage" valeur={brouillon.departage} onChange={(valeur) => modifierChamp('departage', valeur)} /><div /></div><div className="grid2"><label className="field">Symbole<select value={brouillon.symbol || symbols[0]} onChange={(e) => modifierChamp('symbol', e.target.value)}>{symbols.map((symbole) => <option key={symbole} value={symbole}>{symbole}</option>)}</select></label><label className="field">Couleur<select value={brouillon.color || colors[0]} onChange={(e) => modifierChamp('color', e.target.value)}>{colors.map((couleur) => <option key={couleur} value={couleur}>{colorNames[couleur] || couleur}</option>)}</select></label></div><h3>Suivis</h3><div className="stack tracker-list">{brouillon.trackers.map((suivi) => <EditeurSuivi key={suivi.id} suivi={suivi} onChange={(suivant) => modifierSuivi(suivi.id, suivant)} onDelete={() => setBrouillon((courant) => ({ ...courant, trackers: courant.trackers.filter((item) => item.id !== suivi.id) }))} />)}<button className="primary add-tracker-btn" onClick={() => setBrouillon((courant) => ({ ...courant, trackers: [...courant.trackers, newTracker('bar')] }))}>Ajouter un suivi</button></div><button className="small-btn" style={{ width: '100%', marginTop: 12 }} onClick={enregistrerCommeTemplate}>Enregistrer comme template</button><div className="grid2" style={{ marginTop: 12 }}><button className="primary" onClick={() => onSave(normaliserFiche(brouillon))}>Valider</button><button className="danger-btn" onClick={() => setConfirmationSuppression(true)}>Supprimer la fiche</button></div></Fenetre>{confirmationSuppression && <FenetreConfirmationSuppression nom={brouillon.name} onAnnuler={() => setConfirmationSuppression(false)} onConfirmer={onDelete} />}</>;
}
