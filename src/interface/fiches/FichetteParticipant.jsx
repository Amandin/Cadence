import { useState } from 'react';
import { participantEstInactif } from '../../domain/statuses.js';
import { isVisible } from '../../logic.js';
import { AvatarParticipant, BoutonRepliFichette, EtiquetteEtat, couleurVersAccent } from '../commun/ComposantsCommuns.jsx';
import { Suivi } from '../suivis/Suivi.jsx';
import { InfosRapides } from './InfosRapides.jsx';

export function FichetteParticipant({
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
  onRetirerEtat,
}) {
  const [repliee, setRepliee] = useState(false);
  const suivisVisibles = (participant.trackers || []).filter(isVisible);
  const inactif = participantEstInactif(participant);
  const classes = `card fiche-card ${className} ${active ? 'active active-turn' : ''} ${inactif ? 'inactive-character' : ''} ${repliee ? 'collapsed' : ''}`;
  const visibleBadges = [...badges, inactif && { className: 'inactive-chip', label: 'Inactif' }].filter(Boolean);
  const hasQuickStats = showInitiative || (participant.stats || []).length > 0;

  if (repliee) {
    return (
      <article data-participant-id={participant.id} className={classes} style={{ '--accent': couleurVersAccent(participant.color) }}>
        <div className="card-head collapsed-head">
          <button className="card-main collapsed-main" onClick={onOuvrir}>
            <AvatarParticipant participant={participant} />
            <span className="collapsed-identity">
              <strong>{participant.name}</strong>
              <span className="chip type-chip">{participant.kind}</span>
            </span>
          </button>
          <BoutonRepliFichette repliee onClick={() => setRepliee(false)} />
        </div>
      </article>
    );
  }

  return (
    <article data-participant-id={participant.id} className={classes} style={{ '--accent': couleurVersAccent(participant.color) }}>
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
      {hasQuickStats && <div className="quick-stats-full">{showInitiative && <span className="chip init-chip">Init {participant.initiative}</span>}<InfosRapides stats={participant.stats || []} /></div>}
      {secondaryActions && <div className="fiche-secondary-actions">{secondaryActions}</div>}
      <div className="trackers">
        {suivisVisibles.map((suivi) => <Suivi key={suivi.id} suivi={suivi} couleur={participant.color} onModifier={(suivant) => onSuivi(suivi.id, suivant)} onSupprimer={() => onSupprimerSuivi(suivi.id)} />)}
        <div className="statuses status-control-row">
          {participant.statuses?.map((etat) => <EtiquetteEtat key={etat.id} etat={etat} onRetirer={() => onRetirerEtat(etat.id)} />)}
          <button className="small-btn" onClick={onAjouterEtat}>+ état</button>
          <BoutonRepliFichette onClick={() => setRepliee(true)} className="collapse-inline" />
        </div>
      </div>
    </article>
  );
}
