import { useEffect, useState } from 'react';
import { initiativesActionParticipant } from '../../domain/initiative.js';
import { EtiquetteEtat, Fenetre } from '../commun/ComposantsCommuns.jsx';
import { IconeOeilMystiqueOuvert, IconeOeilMystiqueFerme } from '../icones/IconesOeilMystique.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { InfosRapides } from './InfosRapides.jsx';

function valeurNumerique(valeur, defaut = 0) {
  const nombre = Number(valeur);
  return Number.isFinite(nombre) ? nombre : defaut;
}

function MiniCompteurInitiative({ participant, departage, onChangerInitiatives }) {
  const initiatives = initiativesActionParticipant(participant);
  const [edition, setEdition] = useState(false);
  const [brouillon, setBrouillon] = useState(() => initiatives.map(String));
  const libelle = initiatives.join(' / ');
  const valeurDepartage = valeurNumerique(departage, 0);
  const afficherDepartage = valeurDepartage !== 0;
  useEffect(() => {
    if (!edition) setBrouillon(initiatives.map(String));
  }, [edition, initiatives.join('|')]);

  const modifier = (index, valeur) => setBrouillon((courant) => courant.map((item, position) => position === index ? valeur : item));
  const valider = () => {
    const valeurs = brouillon.map((valeur) => Number(valeur)).filter(Number.isFinite);
    if (valeurs.length > 0) onChangerInitiatives(valeurs);
    setEdition(false);
  };

  if (!edition) {
    return (
      <button className="mini-init-counter compact-init-display" onClick={() => setEdition(true)} aria-label="Modifier les initiatives">
        <small>Init</small>
        <strong>{libelle}{afficherDepartage && <em className="init-tiebreak">{valeurDepartage > 0 ? `+${valeurDepartage}` : valeurDepartage}</em>}</strong>
      </button>
    );
  }

  return (
    <div className="mini-init-counter multi-init-counter" aria-label="Initiative">
      {initiatives.map((initiative, index) => (
        <div className="mini-init-slot" key={index}>
          <label className="init-value editable-init-value">
            <small>Init {index + 1}</small>
            <input value={brouillon[index] ?? initiative} type="number" inputMode="numeric" onChange={(event) => modifier(index, event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') valider(); if (event.key === 'Escape') setEdition(false); }} aria-label={`Initiative ${index + 1}`} />
            {index === 0 && afficherDepartage && <em className="init-tiebreak">{valeurDepartage > 0 ? `+${valeurDepartage}` : valeurDepartage}</em>}
          </label>
        </div>
      ))}
      <button className="small-btn close-init-edit" onClick={valider}>OK</button>
    </div>
  );
}

export function FicheParticipant({ participant, enInitiative, onFermer, onModifier, onChangerInitiatives, onRejoindreInitiative, onQuitterInitiative, onInfoRapide, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onNote }) {
  const basculerVisibilite = (suivi) => onSuivi(suivi.id, { ...suivi, visible: suivi.visible === false });
  const boutonOeil = (suivi) => {
    const visible = suivi.visible !== false;
    return <button className={`eye-toggle ${visible ? 'active' : 'inactive'}`} onClick={(event) => { event.stopPropagation(); basculerVisibilite(suivi); }} aria-label={visible ? 'Masquer sur la fichette' : 'Afficher sur la fichette'} title={visible ? 'Visible sur la fichette' : 'Masque sur la fichette'} type="button">{visible ? <IconeOeilMystiqueOuvert /> : <IconeOeilMystiqueFerme />}</button>;
  };

  return (
    <Fenetre title={participant.name} onClose={onFermer}>
      <p>{participant.description}</p>
      <div className={`sheet-action-row ${enInitiative ? '' : 'without-init-counter'}`}>
        <button className="primary" onClick={onModifier}>Modifier</button>
        {enInitiative && <MiniCompteurInitiative participant={participant} departage={participant.departage} onChangerInitiatives={onChangerInitiatives} />}
        {enInitiative ? <button className="small-btn" onClick={onQuitterInitiative}>Quitter l'init</button> : <button className="small-btn join-init-wide" onClick={onRejoindreInitiative}>Rejoindre init</button>}
      </div>
      <InfosRapides stats={participant.stats || []} editable onChanger={onInfoRapide} />
      <h3>Suivis</h3>
      <div className="stack sheet-trackers">{participant.trackers.map((suivi) => <Suivi key={suivi.id} suivi={suivi} avantTitre={boutonOeil(suivi)} couleur={participant.color} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}</div>
      <h3>Etats</h3>
      <div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ etat</button></div>
      <label className="field">Note<textarea value={participant.note || ''} onChange={(event) => onNote(event.target.value)} /></label>
    </Fenetre>
  );
}
