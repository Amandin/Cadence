import { colorAccents } from '../constants.js';

export function colorToAccent(color) {
  return colorAccents[color] || colorAccents.default;
}

export function Avatar({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`}>{participant.symbol || '●'}</div>;
}

function statusLabel(status) {
  if (status.duration == null) return '∞';
  if (status.expired && status.loop) return 'cycle fini';
  if (status.expired) return 'terminé';
  return `${status.remaining}/${status.duration}`;
}

function statusKind(status) {
  if (status.duration == null) return 'permanent';
  if (status.loop) return 'loop';
  return 'temporary';
}

export function Status({ status, onRemove }) {
  return <span className={`status ${statusKind(status)} ${status.expired ? 'expired' : ''}`}>{status.name} · {statusLabel(status)}<button onClick={onRemove}>×</button></span>;
}

export function RoundBadge({ round, effect }) {
  return <div className={`round ${effect === 'next' ? 'new' : ''}`}><small>{effect === 'next' ? 'Nouveau round' : 'Round'}</small>{round}</div>;
}

export function Sheet({ title, children, onClose }) {
  return <div className="overlay" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}><div className="row" style={{ justifyContent:'space-between', marginBottom: 10 }}><h2 style={{ margin:0 }}>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}
