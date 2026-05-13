import { colorAccents } from '../../constants.js';

export function couleurVersAccent(couleur) {
  return colorAccents[couleur] || colorAccents.default;
}

export function AvatarParticipant({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`}>{participant.symbol || '●'}</div>;
}

function libelleEtat(etat) {
  if (etat.duration == null) return '∞';
  if (etat.expired && etat.loop) return '↻ 0';
  if (etat.expired) return '✕ 0';
  return `⏳ ${etat.remaining}`;
}

function typeEtat(etat) {
  if (etat.duration == null) return 'permanent';
  if (etat.loop) return 'loop';
  return 'temporary';
}

export function EtiquetteEtat({ etat, onRetirer }) {
  return <span className={`status ${typeEtat(etat)} ${etat.expired ? 'expired' : ''}`}>{etat.name} · {libelleEtat(etat)}<button onClick={onRetirer}>×</button></span>;
}

export function BadgeRound({ round, effect }) {
  return <div className={`round ${effect === 'next' ? 'new' : ''}`}><small>{effect === 'next' ? 'Nouveau round' : 'Round'}</small>{round}</div>;
}

export function Fenetre({ title, children, onClose }) {
  return <div className="overlay" onClick={onClose}><div className="sheet" onClick={(event) => event.stopPropagation()}><div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}
