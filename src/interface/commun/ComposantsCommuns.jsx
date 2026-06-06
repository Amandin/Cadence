import { colorAccents } from '../../constants.js';

export function couleurVersAccent(couleur) {
  return colorAccents[couleur] || colorAccents.default;
}

export function AvatarParticipant({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`}>{participant.symbol || '●'}</div>;
}

export function BoutonRepliFichette({ repliee = false, onClick, className = '' }) {
  return (
    <button className={`icon-btn collapse-btn fiche-collapse-btn ${className}`} onClick={onClick} aria-label={repliee ? 'Dérouler la fichette' : 'Enrouler la fichette'} type="button">
      <svg viewBox="0 0 24 24" aria-hidden="true" className={repliee ? 'is-collapsed' : ''}>
        <path d="M7 13.5 12 9l5 4.5" />
        <path d="M7 17.5 12 13l5 4.5" />
      </svg>
    </button>
  );
}

function libelleEtat(etat) {
  if (etat.duration == null) return '∞';
  if (etat.expired && etat.loop) return '↻ 0';
  if (etat.expired) return '× 0';
  return `⏳ ${etat.remaining}`;
}

function typeEtat(etat) {
  if (etat.duration == null) return 'permanent';
  if (etat.loop) return 'loop';
  return 'temporary';
}

export function EtiquetteEtat({ etat, onRetirer }) {
  const impactActif = !etat.expired;
  const marqueurImpact = impactActif && etat.inactive
    ? <span className="inactive-status-mark" aria-label="Rend inactif">!</span>
    : impactActif && etat.limited
      ? <span className="limited-status-mark" aria-label="Rend limité">!</span>
      : null;
  return <span className={`status ${typeEtat(etat)} ${etat.advanceOn === 'round' ? 'round-status' : ''} ${etat.inactive ? 'inactive-status' : ''} ${etat.limited ? 'limited-status' : ''} ${etat.expired ? 'expired' : ''}`}>{marqueurImpact}{etat.name} · {libelleEtat(etat)}<button onClick={onRetirer}>×</button></span>;
}

export function BadgeRound({ round, effect, phase, surpriseRound = false }) {
  if (round < 0) {
    return (
      <div className="round prep-round">
        <small>Scène</small>
        <strong>Préparation</strong>
      </div>
    );
  }

  if (surpriseRound) {
    return (
      <div className={`round surprise-round ${effect === 'next' ? 'new' : ''}`}>
        <small>Round</small>
        <strong>Surprise</strong>
      </div>
    );
  }

  return (
    <div className={`round ${effect === 'next' ? 'new' : ''} ${phase ? 'phase-aware' : ''}`}>
      <small>{effect === 'next' ? 'Nouveau round' : 'Round'}</small>
      <strong>{round}</strong>
      {phase ? <span>Phase {phase}</span> : null}
    </div>
  );
}

export function Fenetre({ title, children, onClose, header, className = '' }) {
  const entete = header ?? <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>;
  return <div className={`overlay ${className ? `${className}-overlay` : ''}`} onClick={onClose}><div className={`sheet ${className}`} onClick={(event) => event.stopPropagation()}>{entete}{children}</div></div>;
}

export function MessageChangementTemplate({ onAnnuler, onValider, onAbandonner }) {
  return (
    <div className="template-switch-notice">
      <div>
        <strong>Un modèle est déjà ouvert.</strong>
        <p>Que faire des modifications en cours avant d’ouvrir l’autre modèle ?</p>
      </div>
      <div className="template-switch-actions">
        <button className="small-btn" type="button" onClick={onAnnuler}>Rester ici</button>
        <button className="primary" type="button" onClick={onValider}>Valider et ouvrir</button>
        <button className="danger-btn" type="button" onClick={onAbandonner}>Ouvrir sans enregistrer</button>
      </div>
    </div>
  );
}
