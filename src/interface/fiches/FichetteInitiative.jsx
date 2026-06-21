import { hasTriggeredClock, isVisible } from '../../logic.js';
import { t } from '../../i18n/index.js';
import { FichetteParticipant } from './FichetteParticipant.jsx';

function aDuContenuOperationnel(participant, indicateursVisibles) {
  return indicateursVisibles.length > 0 || (participant.statuses || []).length > 0;
}

export function FichetteInitiative({ participant, actif, groupeSimultane, temporaliteSouple, montrerInitiative = true, afficherActionsSouples = true, dejaJoue, actionsRestantes = 0, actionsJouees = 0, onMarquerAJoue, onAnnulerAJoue, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onModifierEtat, onRetirerEtat, onQuitterInitiative }) {
  const declenchee = hasTriggeredClock(participant);
  const estPJ = participant.kind === 'PJ';
  const indicateursVisibles = participant.trackers.filter(isVisible);
  const contenuOperationnel = aDuContenuOperationnel(participant, indicateursVisibles);
  const sortieConseillee = !estPJ && !contenuOperationnel;
  const boutonSouple = temporaliteSouple && afficherActionsSouples && !groupeSimultane;
  const creneauJoue = !!participant.actionSlotPlayed;
  const afficherActivationActive = actif && !temporaliteSouple && !creneauJoue;
  const coutLabel = participant.actionSlotCostPaid
    ? participant.actionSlotCostResult != null
      ? t('initiative.card.actionResolvedWithCostResult', { cost: participant.actionSlotCostPaid, result: participant.actionSlotCostResult })
      : t('initiative.card.actionResolvedWithCost', { cost: participant.actionSlotCostPaid })
    : t('initiative.card.actionResolved');
  const badges = [
    temporaliteSouple && actionsRestantes > 1 && { className: 'slot-chip', label: t('initiative.card.actionsCount', { count: actionsRestantes }) },
    creneauJoue && { className: 'played-chip', label: coutLabel },
    dejaJoue && { className: 'played-chip', label: t('initiative.card.actionResolvedUpper') },
    declenchee && { className: 'hot', label: t('initiative.card.toResolve') },
    sortieConseillee && { className: 'hot', label: t('initiative.card.noIndicator') },
  ].filter(Boolean);
  const afficherRetourSouple = boutonSouple && actionsJouees > 0;
  const afficherActionSouple = boutonSouple && actionsRestantes > 0;
  const flechesRestantes = Array.from({ length: Math.max(1, actionsRestantes) }, (_, index) => <span className="cadence-arrow-icon forward" key={index} aria-hidden="true" />);

  return (
    <FichetteParticipant
      participant={participant}
      className={`initiative-card ${temporaliteSouple && !montrerInitiative ? 'flexible-without-initiative' : ''} ${temporaliteSouple && estPJ ? 'soft-pj-highlight' : ''} ${declenchee ? 'triggered' : ''} ${groupeSimultane ? 'in-simultaneous-group' : ''} ${dejaJoue ? 'already-played' : ''} ${creneauJoue ? 'played-slot' : ''}`}
      active={afficherActivationActive}
      badges={badges}
      showInitiative={montrerInitiative}
      onOuvrir={onOuvrir}
      onSuivi={onSuivi}
      onSupprimerSuivi={onSupprimerSuivi}
      onAjouterEtat={onAjouterEtat}
      onModifierEtat={onModifierEtat}
      onRetirerEtat={onRetirerEtat}
      primaryAction={(
        <div className="card-actions">
          <button className={`small-btn leave-initiative-btn ${sortieConseillee ? 'suggested' : ''}`} onClick={onQuitterInitiative} title={t('initiative.card.moveToReserve')} aria-label={t('initiative.card.moveParticipantToReserve', { name: participant.name })}><span className="cadence-arrow-icon forward" aria-hidden="true" /> <span>{t('reserve.title')}</span></button>
          {boutonSouple && <div className={`flexible-action-row ${afficherRetourSouple ? 'has-undo' : ''}`}>
            {afficherRetourSouple && <button className="turn-btn compact previous-turn available flexible-play undo-played" onClick={onAnnulerAJoue} aria-label={t('initiative.card.undoResolved')} title={t('initiative.card.undoResolved')}><span className="cadence-arrow-icon back" aria-hidden="true" /></button>}
            {afficherActionSouple && <button className="primary flexible-play play-action" onClick={onMarquerAJoue} aria-label={actionsRestantes > 1 ? t('initiative.card.remainingActions', { count: actionsRestantes }) : t('initiative.card.markResolved')}>{flechesRestantes}</button>}
          </div>}
        </div>
      )}
    />
  );
}
