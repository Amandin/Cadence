import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';

export function BoutonTourPrecedent({ disabled = false, compact = false, onClick }) {
  return (
    <button className={`turn-btn ${compact ? 'compact' : ''} previous-turn ${disabled ? 'disabled' : 'available'}`} onClick={onClick} disabled={disabled} aria-label={t('scene.previousTurn')}>{uiGlyphs.previousTurn}</button>
  );
}
