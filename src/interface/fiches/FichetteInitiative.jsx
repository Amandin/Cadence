import { hasTriggeredClock, isVisible } from '../../logic.js';
import { FichetteParticipant } from './FichetteParticipant.jsx';

function aDuContenuOperationnel(participant, suivisVisibles) {
  return suivisVisibles.length > 0 || (participant.statuses || []).length > 0;
}

export function FichetteInitiative({ participant, actif, groupeSimultane, temporaliteSouple, dejaJoue, onMarquerAJoue, onAnnulerAJoue, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onQuitterInitiative }) {
  const declenchee = hasTriggeredClock(participant);
  const estPJ = participant.kind === 'PJ';
  const suivisVisibles = participant.trackers.filter(isVisible);
  const contenuOperationnel = aDuContenuOperationnel(participant, suivisVisibles);
  const sortieConseillee = !estPJ && !contenuOperationnel;
  const boutonSouple = temporaliteSouple && !groupeSimultane;
  const afficherTourActif = actif && !temporaliteSouple;
  const badges = [
    dejaJoue && { className: 'played-chip', label: 'A joué' },
    declenchee && { className: 'hot', label: 'À résoudre' },
    sortieConseillee && { className: 'hot', label: 'Aucun suivi' },
  ].filter(Boolean);

  return <FichetteParticipant participant={participant} className={`initiative-card ${temporaliteSouple && estPJ ? 'soft-pj-highlight' : ''} ${declenchee ? 'triggered' : ''} ${groupeSimultane ? 'in-simultaneous-group' : ''} ${dejaJoue ? 'already-played' : ''}`} active={afficherTourActif} badges={badges} showInitiative onOuvrir={onOuvrir} onSuivi={onSuivi} onSupprimerSuivi={onSupprimerSuivi} onAjouterEtat={onAjouterEtat} onRetirerEtat={onRetirerEtat} primaryAction={<div className="card-actions">
          <button className={`small-btn ${sortieConseillee ? 'suggested' : ''}`} onClick={onQuitterInitiative}>Sortir</button>
          {boutonSouple && (dejaJoue ? <button className="small-btn flexible-play undo-played" onClick={onAnnulerAJoue}>Annuler</button> : <button className="small-btn flexible-play" onClick={onMarquerAJoue}>A joué</button>)}
        </div>} />;
}
