import { useState } from 'react';
import { EtiquetteEtat, Fenetre } from '../commun/ComposantsCommuns.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { IconeOeilMystiqueOuvert, IconeOeilMystiqueFerme } from '../icones/IconesOeilMystique.jsx';

function valeurNumerique(valeur, defaut = 0) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function MiniCompteurInitiative({ initiative, departage, onChanger }) {
  const valeur = Number.isFinite(Number(initiative)) ? Number(initiative) : 0;
  const valeurDepartage = valeurNumerique(departage, 0);
  const afficherDepartage = valeurDepartage !== 0;
  const [edition, setEdition] = useState(false);
  const [saisie, setSaisie] = useState(String(valeur));
  const valider = () => {
    const nombre = Number(saisie);
    if (Number.isFinite(nombre)) onChanger(nombre);
    setEdition(false);
  };

  return (
    <div className="mini-init-counter" aria-label="Initiative">
      <button className="small-btn" onClick={() => onChanger(valeur - 1)} aria-label="Réduire l’initiative">−</button>
      {edition ? <input value={saisie} type="number" inputMode="numeric" autoFocus onChange={(event) => setSaisie(event.target.value)} onBlur={valider} onKeyDown={(event) => { if (event.key === 'Enter') valider(); if (event.key === 'Escape') setEdition(false); }} aria-label="Valeur d’initiative" /> : <button className="init-value" onClick={() => { setSaisie(String(valeur)); setEdition(true); }}><small>Init</small><strong>{valeur}{afficherDepartage && <em className="init-tiebreak">{valeurDepartage > 0 ? `+${valeurDepartage}` : valeurDepartage}</em>}</strong></button>}
      <button className="small-btn" onClick={() => onChanger(valeur + 1)} aria-label="Augmenter l’initiative">+</button>
    </div>
  );
}

export function FicheParticipant({ participant, enInitiative, onFermer, onModifier, onChangerInitiative, onRejoindreInitiative, onQuitterInitiative, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onNote }) {
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? 'Masquer sur la fichette' : 'Afficher sur la fichette'} title={visible ? 'Visible sur la fichette' : 'Masqué sur la fichette'} type="button">{visible ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button>;
  };

  return <Fenetre title={participant.name} onClose={onFermer}><p>{participant.description}</p><div className={`sheet-action-row ${enInitiative ? '' : 'without-init-counter'}`}><button className="primary" onClick={onModifier}>Modifier</button>{enInitiative && <MiniCompteurInitiative initiative={participant.initiative} departage={participant.departage} onChanger={onChangerInitiative} />}{enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>Quitter l’init</button> : <button className="small-btn join-init-wide" onClick={onRejoindreInitiative}>Rejoindre init</button>}</div><button className="small-btn" style={{ width: '100%', marginTop: 8 }} onClick={onFermer}>Fermer</button><h3>Suivis</h3><div className="stack">{participant.trackers.map((suivi) => <div className="tracker-sheet-row" key={suivi.id}><Suivi suivi={suivi} avantTitre={boutonOeil(suivi)} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} /></div>)}</div><h3>États</h3><div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ état</button></div><label className="field">Note<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label></Fenetre>;
}
