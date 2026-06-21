import { t } from '../../i18n/index.js';
import { colorAccents } from '../../constants.js';
import { uiGlyphs } from '../../uiAssets.js';

export function couleurVersAccent(couleur) {
  return colorAccents[couleur] || colorAccents.default;
}

export function teinteEtats(statuses, surface = 'var(--ui-surface)', intensity = 34) {
  const accents = (statuses || [])
    .filter((status) => status?.tintParticipant && status?.color && !status.expired)
    .map((status) => couleurVersAccent(status.color));
  const accentsUniques = [...new Set(accents)];
  if (!accentsUniques.length) return null;
  if (accentsUniques.length === 1) {
    const accent = accentsUniques[0];
    const strong = Math.min(94, intensity);
    const middle = Math.max(18, Math.round(intensity * 0.68));
    const quiet = Math.max(10, Math.round(intensity * 0.28));
    const tail = Math.max(22, Math.round(intensity * 0.78));
    return {
      accents: accentsUniques,
      gradient: `linear-gradient(115deg, color-mix(in srgb, ${accent} ${strong}%, ${surface}) 0%, color-mix(in srgb, ${accent} ${middle}%, ${surface}) 34%, color-mix(in srgb, ${accent} ${quiet}%, ${surface}) 62%, ${surface} 78%, color-mix(in srgb, ${accent} ${tail}%, ${surface}) 100%)`,
    };
  }
  const stops = accentsUniques.map((accent, index) => {
    const position = Math.round((index / (accentsUniques.length - 1)) * 100);
    return `color-mix(in srgb, ${accent} ${Math.min(92, intensity)}%, ${surface}) ${position}%`;
  });
  return {
    accents: accentsUniques,
    gradient: `linear-gradient(115deg, ${stops.join(', ')})`,
  };
}

export function teinteEtatParticipant(participant) {
  return teinteEtats(participant?.statuses);
}

export function AvatarParticipant({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`}>{participant.symbol || uiGlyphs.avatarFallback}</div>;
}

export function BoutonRepliFichette({ repliee = false, onClick, className = '' }) {
  return (
    <button className={`icon-btn collapse-btn fiche-collapse-btn ${className}`} onClick={onClick} aria-label={repliee ? t('common.expand') : t('common.collapse')} type="button">
      <svg viewBox="0 0 24 24" aria-hidden="true" className={repliee ? 'is-collapsed' : ''}>
        <path d="M7 13.5 12 9l5 4.5" />
        <path d="M7 17.5 12 13l5 4.5" />
      </svg>
    </button>
  );
}
function libelleEtat(etat) {
  if (etat.duration == null) return uiGlyphs.infinity;
  if (etat.expired && etat.loop) return `${uiGlyphs.loop} 0`;
  if (etat.expired) return `${uiGlyphs.close} 0`;
  return `${uiGlyphs.timer} ${etat.remaining}`;
}

function typeEtat(etat) {
  if (etat.duration == null) return 'permanent';
  if (etat.loop) return 'loop';
  return 'temporary';
}

export function EtiquetteEtat({ etat, onRetirer, onModifier }) {
  const impactActif = !etat.expired;
  const couleurEtat = etat.color ? couleurVersAccent(etat.color) : '';
  const modifier = () => onModifier?.();
  const modifierAuClavier = (event) => {
    if (!onModifier) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      modifier();
    }
  };
  const marqueurImpact = impactActif && etat.inactive
    ? <span className="inactive-status-mark" aria-label={t('scene.statusMarks.inactive')}>!</span>
    : impactActif && etat.limited
      ? <span className="limited-status-mark" aria-label={t('scene.statusMarks.limited')}>!</span>
      : null;
  if (onModifier) {
    return (
      <span
        className={`status ${typeEtat(etat)} ${couleurEtat ? 'colored-status' : ''} editable-status ${etat.advanceOn === 'round' ? 'round-status' : ''} ${etat.inactive ? 'inactive-status' : ''} ${etat.limited ? 'limited-status' : ''} ${etat.expired ? 'expired' : ''}`}
        style={couleurEtat ? { '--status-color': couleurEtat } : undefined}
        role="button"
        tabIndex={0}
        onClick={modifier}
        onKeyDown={modifierAuClavier}
      >
        {marqueurImpact}{etat.name}{` ${uiGlyphs.middleDot} `}{libelleEtat(etat)}
        <button onClick={(event) => { event.stopPropagation(); onRetirer?.(); }} aria-label={t('common.remove')}>{uiGlyphs.close}</button>
      </span>
    );
  }
  return <span className={`status ${typeEtat(etat)} ${couleurEtat ? 'colored-status' : ''} ${etat.advanceOn === 'round' ? 'round-status' : ''} ${etat.inactive ? 'inactive-status' : ''} ${etat.limited ? 'limited-status' : ''} ${etat.expired ? 'expired' : ''}`} style={couleurEtat ? { '--status-color': couleurEtat } : undefined}>{marqueurImpact}{etat.name} {uiGlyphs.middleDot} {libelleEtat(etat)}<button onClick={onRetirer} aria-label={t('common.remove')}>{uiGlyphs.close}</button></span>;
}

export function BadgeRound({ round, effect, phase, surpriseRound = false }) {
  if (round < 0) {
    return (
      <div className="round prep-round">
        <small>{t('scene.badge.scene')}</small>
        <strong>{t('scene.badge.preparation')}</strong>
      </div>
    );
  }

  if (surpriseRound) {
    return (
      <div className={`round surprise-round ${effect === 'next' ? 'new' : ''}`}>
        <small>{t('scene.badge.round')}</small>
        <strong>{t('scene.badge.surprise')}</strong>
      </div>
    );
  }

  return (
    <div className={`round ${effect === 'next' ? 'new' : ''} ${phase ? 'phase-aware' : ''}`}>
      <small>{effect === 'next' ? t('scene.badge.newRound') : t('scene.badge.round')}</small>
      <strong>{round}</strong>
      {phase ? <span>{t('scene.badge.phase', { phase })}</span> : null}
    </div>
  );
}

export function Fenetre({ title, children, onClose, header, className = '', style }) {
  const entete = header ?? <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 style={{ margin: 0 }}>{title}</h2><button className="icon-btn" onClick={onClose} aria-label={t('common.close')}>{uiGlyphs.close}</button></div>;
  const overlayClass = className ? `${className.split(' ')[0]}-overlay` : '';
  return <div className={`overlay ${overlayClass}`} onClick={onClose}><div className={`sheet ${className}`} style={style} onClick={(event) => event.stopPropagation()}>{entete}{children}</div></div>;
}

export function MessageChangementTemplate({ onAnnuler, onValider, onAbandonner }) {
  return (
    <div className="template-switch-notice">
      <div>
        <strong>{t('dialogs.templateSwitch.title')}</strong>
        <p>{t('dialogs.templateSwitch.help')}</p>
      </div>
      <div className="template-switch-actions">
        <button className="small-btn" type="button" onClick={onAnnuler}>{t('dialogs.templateSwitch.stay')}</button>
        <button className="primary" type="button" onClick={onValider}>{t('dialogs.templateSwitch.confirm')}</button>
        <button className="danger-btn" type="button" onClick={onAbandonner}>{t('dialogs.templateSwitch.discard')}</button>
      </div>
    </div>
  );
}
