import { memo, useEffect, useMemo, useState } from 'react';
import { initiativesActionParticipant } from '../../domain/initiative.js';
import { participantEstInactif, participantEstLimite } from '../../domain/statuses.js';
import { t } from '../../i18n/index.js';
import { isVisible } from '../../logic.js';
import { AvatarParticipant, BoutonRepliFichette, EtiquetteEtat, couleurVersAccent, teinteEtatParticipant } from '../commun/ComposantsCommuns.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { InfosRapides } from './InfosRapides.jsx';

function libelleInitiative(participant) {
  const initiatives = Array.isArray(participant.actionSlotInitiatives) && participant.actionSlotInitiatives.length
    ? participant.actionSlotInitiatives
    : initiativesActionParticipant(participant);
  return initiatives.join(' / ');
}

export const FichetteParticipant = memo(function FichetteParticipant({
  participant,
  className = '',
  active = false,
  badges = [],
  showInitiative = false,
  primaryAction = null,
  secondaryActions = null,
  onOuvrir,
  onSuivi,
  onSupprimerSuivi,
  onAjouterEtat,
  onModifierEtat,
  onRetirerEtat,
  autoCollapsed = false,
}) {
  const [repliee, setRepliee] = useState(false);
  const [repliAutoIgnore, setRepliAutoIgnore] = useState(false);
  const suivisVisibles = useMemo(() => (participant.trackers || []).filter(isVisible), [participant.trackers]);
  const inactif = participantEstInactif(participant);
  const limite = participantEstLimite(participant);
  const teinteEtat = teinteEtatParticipant(participant);
  const repliEffectif = repliee || (autoCollapsed && !repliAutoIgnore);
  const classes = `card fiche-card ${className} ${active ? 'active active-turn' : ''} ${inactif ? 'inactive-character' : limite ? 'limited-character' : ''} ${teinteEtat ? 'status-tinted-character' : ''} ${participant.secret ? 'secret-character-sheet' : ''} ${repliEffectif ? 'collapsed' : ''}`;
  const styleFiche = { '--accent': couleurVersAccent(participant.color), ...(teinteEtat ? { '--status-tint-gradient': teinteEtat.gradient } : {}) };
  const visibleBadges = [...badges, inactif && { className: 'inactive-chip', label: t('participant.badge.inactive') }, limite && { className: 'limited-chip', label: t('participant.badge.limited') }].filter(Boolean);
  const hasQuickStats = showInitiative || (participant.stats || []).length > 0;

  useEffect(() => {
    if (!autoCollapsed) setRepliAutoIgnore(false);
  }, [autoCollapsed]);

  if (repliEffectif) {
    return (
      <article data-participant-id={participant.id} className={classes} style={styleFiche}>
        <div className="card-head collapsed-head">
          <button className="card-main collapsed-main" onClick={onOuvrir}>
            <AvatarParticipant participant={participant} />
            <span className="collapsed-identity">
              <strong>{participant.name}</strong>
              <span className="chip type-chip">{participant.kind}</span>
            </span>
          </button>
          <BoutonRepliFichette repliee onClick={() => { setRepliee(false); setRepliAutoIgnore(true); }} />
        </div>
      </article>
    );
  }

  return (
    <article data-participant-id={participant.id} className={classes} style={styleFiche}>
      <div className="card-head">
        <button className="card-main" onClick={onOuvrir}>
          <AvatarParticipant participant={participant} />
          <div className="info">
            <div className="name-line">
              <strong>{participant.name}</strong>
              {visibleBadges.map((badge) => <span className={`chip ${badge.className || ''}`} key={badge.label}>{badge.label}</span>)}
            </div>
            <div className="identity-line">
              <span className="chip type-chip">{participant.kind}</span>
              {participant.description && <span className="muted card-description">{participant.description}</span>}
            </div>
          </div>
        </button>
        {primaryAction}
      </div>
      {hasQuickStats && <div className="quick-stats-full">{showInitiative && <span className="chip init-chip">{t('initiative.groupShort')} {libelleInitiative(participant)}</span>}<InfosRapides stats={participant.stats || []} /></div>}
      {secondaryActions && <div className="fiche-secondary-actions">{secondaryActions}</div>}
      <div className="trackers">
        {suivisVisibles.map((suivi) => <Suivi key={suivi.id} suivi={suivi} couleur={participant.color} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}
        <div className="statuses status-control-row">
          {participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onModifier={() => onModifierEtat?.(etat.id)} onRetirer={() => onRetirerEtat(etat.id)} />)}
          <button className="small-btn sheet-add-status-btn" onClick={onAjouterEtat}>{t('scene.status.add')}</button>
          <BoutonRepliFichette onClick={() => { setRepliee(true); setRepliAutoIgnore(false); }} className="collapse-inline" />
        </div>
      </div>
    </article>
  );
});
