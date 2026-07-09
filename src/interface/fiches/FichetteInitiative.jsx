import { memo, useMemo } from 'react';
import { hasTriggeredClock, isVisible } from '../../logic.js';
import { t } from '../../i18n/index.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { FichetteParticipant } from './FichetteParticipant.jsx';

function aDuContenuOperationnel(participant, indicateursVisibles) {
  return indicateursVisibles.length > 0 || (participant.statuses || []).length > 0;
}

function IconesActionSouple({ totalActions = 1, reverse = false }) {
  const extras = Math.max(0, Number(totalActions || 0) - 1);
  return (
    <span className={`flexible-action-icon-stack ${reverse ? 'reverse' : ''}`} style={{ '--extra-action-count': extras }}>
      <IconeCadence name="nextMedium" className={`flexible-action-icon ${reverse ? 'reverse' : ''}`.trim()} />
      {Array.from({ length: extras }, (_, index) => (
        <IconeCadence
          key={index}
          name="extraAction"
          className={`flexible-action-icon flexible-extra-action ${reverse ? 'reverse' : ''}`.trim()}
          style={{ '--extra-action-index': index }}
        />
      ))}
    </span>
  );
}

export const FichetteInitiative = memo(function FichetteInitiative({ participant, actif, groupeSimultane, temporaliteSouple, montrerInitiative = true, afficherActionsSouples = true, dejaJoue, actionsRestantes = 0, actionsJouees = 0, onMarquerAJoue, onAnnulerAJoue, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onModifierEtat, onRetirerEtat, onQuitterInitiative, performanceLow = false }) {
  const declenchee = useMemo(() => hasTriggeredClock(participant), [participant]);
  const estPJ = participant.kind === 'PJ';
  const indicateursVisibles = useMemo(() => (participant.trackers || []).filter(isVisible), [participant.trackers]);
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
  const iconeActionSuivante = <IconesActionSouple totalActions={actionsRestantes} />;
  const iconeActionAnnulee = <IconesActionSouple totalActions={actionsJouees} reverse />;
  const autoCollapsed = performanceLow && !actif && !declenchee;

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
      autoCollapsed={autoCollapsed}
      primaryAction={boutonSouple && (
        <div className="card-actions">
          <div className={`flexible-action-row ${afficherRetourSouple ? 'has-undo' : ''}`}>
            {afficherRetourSouple && <button className="turn-btn compact previous-turn available flexible-play undo-played" style={{ '--extra-action-count': Math.max(0, actionsJouees - 1) }} onClick={onAnnulerAJoue} aria-label={t('initiative.card.undoResolved')} title={t('initiative.card.undoResolved')}>{iconeActionAnnulee}</button>}
            {afficherActionSouple && <button className="primary flexible-play play-action" style={{ '--extra-action-count': Math.max(0, actionsRestantes - 1) }} onClick={onMarquerAJoue} aria-label={actionsRestantes > 1 ? t('initiative.card.remainingActions', { count: actionsRestantes }) : t('initiative.card.markResolved')}>{iconeActionSuivante}</button>}
          </div>
        </div>
      )}
      footerAction={sortieConseillee && <button className="small-btn leave-initiative-btn suggested" onClick={onQuitterInitiative} title={t('initiative.card.moveToReserve')} aria-label={t('initiative.card.moveParticipantToReserve', { name: participant.name })}><span className="cadence-arrow-icon forward" aria-hidden="true" /> <span>{t('reserve.title')}</span></button>}
    />
  );
});
