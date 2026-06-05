import { hasTriggeredClock, isVisible } from '../../logic.js';
import { FichetteParticipant } from './FichetteParticipant.jsx';

function aDuContenuOperationnel(participant, suivisVisibles) {
  return suivisVisibles.length > 0 || (participant.statuses || []).length > 0;
}

export function FichetteInitiative({ participant, actif, groupeSimultane, temporaliteSouple, montrerInitiative = true, afficherActionsSouples = true, dejaJoue, actionsRestantes = 0, actionsJouees = 0, onMarquerAJoue, onAnnulerAJoue, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onRetirerEtat, onQuitterInitiative }) {
  const declenchee = hasTriggeredClock(participant);
  const estPJ = participant.kind === 'PJ';
  const suivisVisibles = participant.trackers.filter(isVisible);
  const contenuOperationnel = aDuContenuOperationnel(participant, suivisVisibles);
  const sortieConseillee = !estPJ && !contenuOperationnel;
  const boutonSouple = temporaliteSouple && afficherActionsSouples && !groupeSimultane;
  const creneauJoue = !!participant.actionSlotPlayed;
  const afficherTourActif = actif && !temporaliteSouple && !creneauJoue;
  const coutLabel = participant.actionSlotCostPaid ? `joue - cout ${participant.actionSlotCostPaid}${participant.actionSlotCostResult != null ? ` -> ${participant.actionSlotCostResult}` : ''}` : 'joue';
  const badges = [
    temporaliteSouple && actionsRestantes > 1 && { className: 'slot-chip', label: `${actionsRestantes} actions` },
    creneauJoue && { className: 'played-chip', label: coutLabel },
    dejaJoue && { className: 'played-chip', label: 'A joue' },
    declenchee && { className: 'hot', label: 'A resoudre' },
    sortieConseillee && { className: 'hot', label: 'Aucun suivi' },
  ].filter(Boolean);
  const afficherRetourSouple = boutonSouple && actionsJouees > 0;
  const afficherActionSouple = boutonSouple && actionsRestantes > 0;
  const flechesRestantes = Array.from({ length: Math.max(1, actionsRestantes) }, (_, index) => <span key={index}>&rarr;</span>);

  return <FichetteParticipant participant={participant} className={`initiative-card ${temporaliteSouple && !montrerInitiative ? 'flexible-without-initiative' : ''} ${temporaliteSouple && estPJ ? 'soft-pj-highlight' : ''} ${declenchee ? 'triggered' : ''} ${groupeSimultane ? 'in-simultaneous-group' : ''} ${dejaJoue ? 'already-played' : ''} ${creneauJoue ? 'played-slot' : ''}`} active={afficherTourActif} badges={badges} showInitiative={montrerInitiative} onOuvrir={onOuvrir} onSuivi={onSuivi} onSupprimerSuivi={onSupprimerSuivi} onAjouterEtat={onAjouterEtat} onRetirerEtat={onRetirerEtat} primaryAction={<div className="card-actions">
          <button className={`small-btn leave-initiative-btn ${sortieConseillee ? 'suggested' : ''}`} onClick={onQuitterInitiative}>Sortir</button>
          {boutonSouple && <div className={`flexible-action-row ${afficherRetourSouple ? 'has-undo' : ''}`}>
            {afficherRetourSouple && <button className="turn-btn compact previous-turn available flexible-play undo-played" onClick={onAnnulerAJoue} aria-label="Annuler A joue" title="Annuler A joue">&larr;</button>}
            {afficherActionSouple && <button className="primary flexible-play play-action" onClick={onMarquerAJoue} aria-label={actionsRestantes > 1 ? `${actionsRestantes} actions restantes` : 'Marquer A joue'}>{flechesRestantes}</button>}
          </div>}
        </div>} />;
}
