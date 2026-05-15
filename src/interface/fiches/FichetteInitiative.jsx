import { useState } from 'react';
import { participantEstInactif } from '../../domain/statuses.js';
import { hasTriggeredClock, isVisible } from '../../logic.js';
import { AvatarParticipant, EtiquetteEtat, couleurVersAccent } from '../commun/ComposantsCommuns.jsx';
import { Suivi } from '../suivis/Suivi.jsx';

function aDuContenuOperationnel(participant, suivisVisibles) {
  return suivisVisibles.length > 0 || (participant.statuses || []).length > 0;
}

export function FichetteInitiative({ participant, actif, groupeSimultane, temporaliteSouple, dejaJoue, onMarquerAJoue, onAnnulerAJoue, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onQuitterInitiative }) {
  const [repliee, setRepliee] = useState(false);
  const declenchee = hasTriggeredClock(participant);
  const inactif = participantEstInactif(participant);
  const estPJ = participant.kind === 'PJ';
  const suivisVisibles = participant.trackers.filter(isVisible);
  const contenuOperationnel = aDuContenuOperationnel(participant, suivisVisibles);
  const sortieConseillee = !estPJ && !contenuOperationnel;
  const boutonSouple = temporaliteSouple && !groupeSimultane;
  const afficherTourActif = actif && !temporaliteSouple;
  const infosRapides = (participant.stats || []).filter(Boolean);

  return <article data-participant-id={participant.id} className={`card ${afficherTourActif ? 'active' : ''} ${temporaliteSouple && estPJ ? 'soft-pj-highlight' : ''} ${declenchee ? 'triggered' : ''} ${inactif ? 'inactive-character' : ''} ${groupeSimultane ? 'in-simultaneous-group' : ''} ${dejaJoue ? 'already-played' : ''} ${repliee ? 'collapsed' : ''}`} style={{ '--accent': couleurVersAccent(participant.color) }}><div className="card-head"><button className="icon-btn collapse-btn" onClick={() => setRepliee((valeur) => !valeur)} aria-label={repliee ? 'Dérouler la fichette' : 'Enrouler la fichette'}>{repliee ? '⌄' : '⌃'}</button><button className="card-main" onClick={onOuvrir}><AvatarParticipant participant={participant} /><div className="info"><div className="name-line"><strong>{participant.name}</strong>{afficherTourActif && <span className="chip">Tour actif</span>}{inactif && <span className="chip inactive-chip">Inactif</span>}{dejaJoue && <span className="chip played-chip">A joué</span>}{declenchee && <span className="chip hot">À résoudre</span>}{sortieConseillee && <span className="chip hot">Aucun suivi</span>}</div><div className="muted">{participant.description}</div><div className="name-line" style={{ marginTop: 6 }}><span className="chip">{participant.kind}</span><span className="chip">Init {participant.initiative}</span>{infosRapides.map((stat) => <span className="chip quick-stat-chip" key={stat}>{stat}</span>)}</div></div></button><div className="card-actions"><button className={`small-btn ${sortieConseillee ? 'suggested' : ''}`} onClick={onQuitterInitiative}>{sortieConseillee ? 'Sortir de l’initiative' : 'Quitter l’init'}</button>{boutonSouple && (dejaJoue ? <button className="small-btn flexible-play undo-played" onClick={onAnnulerAJoue}>Annuler</button> : <button className="small-btn flexible-play" onClick={onMarquerAJoue}>A joué</button>)}</div></div><div className="trackers">{suivisVisibles.map((suivi) => <Suivi key={suivi.id} suivi={suivi} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}<div className="statuses">{participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}<button className="small-btn" onClick={onAjouterEtat}>+ état</button></div></div></article>;
}
