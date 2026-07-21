import { useEffect, useId, useRef } from 'react';
import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';
import { couleurVersAccent, teinteEtatParticipant, teinteEtats } from '../../domain/statusAppearance.js';

export { couleurVersAccent, teinteEtatParticipant, teinteEtats };

export function AvatarParticipant({ participant }) {
  return <div className={`avatar ${participant.color || 'slate'}`} aria-hidden="true">{participant.symbol || <IconeCadence name="avatarDefault" />}</div>;
}

export function IconeSecret({ className = '', active = true }) {
  return <IconeCadence name={active ? 'avatarSubtle' : 'avatarDefault'} className={`secret-icon ${active ? 'secret-icon-active' : 'secret-icon-inactive'} ${className}`.trim()} />;
}

export function IconeRepliFichette({ repliee = false, className = '' }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={`${repliee ? 'is-collapsed' : ''} ${className}`.trim()}>
      <path d="M7 13.5 12 9l5 4.5" />
      <path d="M7 17.5 12 13l5 4.5" />
    </svg>
  );
}

export function BoutonRepliFichette({ repliee = false, onClick, className = '' }) {
  return (
    <button className={`icon-btn collapse-btn fiche-collapse-btn ${className}`} onClick={onClick} aria-label={repliee ? t('common.expand') : t('common.collapse')} type="button">
      <IconeRepliFichette repliee={repliee} />
    </button>
  );
}
function libelleEtat(etat) {
  if (etat.duration == null) return uiGlyphs.infinity;
  if (etat.expired && etat.loop) return `${uiGlyphs.loop} 0`;
  if (etat.expired) return <><IconeCadence name="close" className="status-duration-icon" /> 0</>;
  return <><IconeCadence name="timer" className="status-duration-icon" /> {etat.remaining}</>;
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
        {marqueurImpact}{etat.name}<span className="status-separator">{uiGlyphs.middleDot}</span><span className="status-duration">{libelleEtat(etat)}</span>
        <button onClick={(event) => { event.stopPropagation(); onRetirer?.(); }} aria-label={t('common.remove')}><IconeCadence name="close" /></button>
      </span>
    );
  }
  return <span className={`status ${typeEtat(etat)} ${couleurEtat ? 'colored-status' : ''} ${etat.advanceOn === 'round' ? 'round-status' : ''} ${etat.inactive ? 'inactive-status' : ''} ${etat.limited ? 'limited-status' : ''} ${etat.expired ? 'expired' : ''}`} style={couleurEtat ? { '--status-color': couleurEtat } : undefined}>{marqueurImpact}{etat.name}<span className="status-separator">{uiGlyphs.middleDot}</span><span className="status-duration">{libelleEtat(etat)}</span><button onClick={onRetirer} aria-label={t('common.remove')}><IconeCadence name="close" /></button></span>;
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

export function fermetureExterieureSurClic(mode, pointerType) {
  return mode !== 'double-mouse' || pointerType !== 'mouse';
}

export function fermetureExterieureSurDoubleClic(mode, pointerType) {
  return mode === 'double-mouse' && pointerType === 'mouse';
}

function fenetreSuperieure(element) {
  const fenetres = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
  return fenetres.length > 0 && fenetres[fenetres.length - 1] === element;
}

export function Fenetre({ title, children, onClose, header, className = '', style, outsideCloseMode = 'single' }) {
  const pointerTypeRef = useRef('');
  const pointerStartedOutsideRef = useRef(false);
  const sheetRef = useRef(null);
  const previousFocusRef = useRef(null);
  const titleId = useId();
  const entete = header ?? <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}><h2 id={titleId} style={{ margin: 0 }}>{title}</h2><button type="button" className="icon-btn" onClick={onClose} aria-label={t('common.close')}><IconeCadence name="close" /></button></div>;
  const overlayClass = className ? `${className.split(' ')[0]}-overlay` : '';
  const typePointeur = (event) => pointerTypeRef.current || (event.nativeEvent?.sourceCapabilities?.firesTouchEvents ? 'touch' : 'mouse');
  useEffect(() => {
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    sheetRef.current?.focus();
    return () => {
      if (previousFocusRef.current?.isConnected) previousFocusRef.current.focus();
    };
  }, []);
  useEffect(() => {
    const gererClavier = (event) => {
      const fenetre = sheetRef.current;
      if (!fenetre || !fenetreSuperieure(fenetre)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const controles = [...fenetre.querySelectorAll('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter((element) => !element.disabled && element.getAttribute('aria-hidden') !== 'true' && element.getClientRects().length > 0);
      if (!controles.length) {
        event.preventDefault();
        fenetre.focus();
        return;
      }
      const premier = controles[0];
      const dernier = controles[controles.length - 1];
      if (event.shiftKey && (document.activeElement === premier || !fenetre.contains(document.activeElement))) {
        event.preventDefault();
        dernier.focus();
      } else if (!event.shiftKey && (document.activeElement === dernier || !fenetre.contains(document.activeElement))) {
        event.preventDefault();
        premier.focus();
      }
    };
    document.addEventListener('keydown', gererClavier);
    return () => document.removeEventListener('keydown', gererClavier);
  }, [onClose]);
  const memoriserPointeur = (event) => {
    pointerStartedOutsideRef.current = event.target === event.currentTarget;
    if (pointerStartedOutsideRef.current) pointerTypeRef.current = event.pointerType || '';
  };
  const fermerSurClic = (event) => {
    if (event.target !== event.currentTarget || !pointerStartedOutsideRef.current) return;
    pointerStartedOutsideRef.current = false;
    if (fermetureExterieureSurClic(outsideCloseMode, typePointeur(event))) onClose?.();
  };
  const fermerSurDoubleClic = (event) => {
    if (event.target !== event.currentTarget) return;
    if (fermetureExterieureSurDoubleClic(outsideCloseMode, typePointeur(event))) onClose?.();
  };
  return <div className={`overlay ${overlayClass}`} onPointerDown={memoriserPointeur} onClick={fermerSurClic} onDoubleClick={fermerSurDoubleClic}><div ref={sheetRef} className={`sheet ${className}`} style={style} role="dialog" aria-modal="true" aria-labelledby={header ? undefined : titleId} aria-label={header ? title : undefined} tabIndex={-1} onClick={(event) => event.stopPropagation()}>{entete}{children}</div></div>;
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
