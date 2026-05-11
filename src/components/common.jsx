import { colorAccents } from '../constants.js';

export function colorToAccent(color) {
  return colorAccents[color] || colorAccents.default;
}

export function Avatar({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`}>{participant.symbol || '●'}</div>;
}

export function Status({ status, onRemove }) {
  const label = status.duration == null ? '∞' : status.expired ? 'écoulé' : `${status.remaining}/${status.duration}`;

  return <span className={`status ${status.expired ? 'expired' : ''} ${status.loop ? 'loop' : ''}`}>{status.name} · {label}<button onClick={onRemove}>×</button></span>;
}

export function RoundBadge({ round, effect }) {
  return <div className={`round ${effect === 'next' ? 'new' : ''}`}><small>{effect === 'next' ? 'Nouveau round' : 'Round'}</small>{round}</div>;
}

export function Sheet({ title, children, onClose }) {
  return <div className="overlay" onClick={onClose}><div className="sheet" onClick={(e) => e.stopPropagation()}><div className="row" style={{ justifyContent:'space-between', marginBottom: 10 }}><h2 style={{ margin:0 }}>{title}</h2><button className="icon-btn" onClick={onClose}>×</button></div>{children}</div></div>;
}
