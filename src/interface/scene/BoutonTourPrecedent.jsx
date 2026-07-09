import { t } from '../../i18n/index.js';
import { IconeCadence } from '../icones/IconeCadence.jsx';

export function BoutonTourPrecedent({ disabled = false, compact = false, onClick }) {
  return (
    <button className={`turn-btn ${compact ? 'compact' : ''} previous-turn ${disabled ? 'disabled' : 'available'}`} onClick={onClick} disabled={disabled} aria-label={t('scene.previousTurn')}><IconeCadence name="nextMedium" className="reverse" /></button>
  );
}
