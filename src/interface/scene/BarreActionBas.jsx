import { t } from '../../i18n/index.js';
import { uiGlyphs } from '../../uiAssets.js';
import { BoutonTourPrecedent } from './BoutonTourPrecedent.jsx';

export function BarreActionBas({ classeSuivant, prochainRound, round, horlogeBloquee, suivantDesactive, retourDesactive, libelleSuivant, onTourPrecedent, onTourSuivant, onRetourPreparation, onAjouterParticipant, onOuvrirLanceurDes, onOuvrirMenu }) {
  const prochainRoundAffiche = Math.max(1, Number(round || 0) + 1);
  const texteSuivant = libelleSuivant || (horlogeBloquee ? t('scene.bottom.clock') : prochainRound ? t('scene.bottom.newRound', { round: prochainRoundAffiche }) : t('scene.bottom.nextRound', { round: Math.max(1, round) }));
  const enPreparation = round < 0;

  return (
    <div className={`bottom ${enPreparation ? 'bottom-preparation' : ''}`}>
      {enPreparation
        ? <button className="primary bottom-add-participant" type="button" onClick={onAjouterParticipant}>{t('common.add')}</button>
        : onRetourPreparation
          ? <button className="turn-btn compact prep-return-btn bottom-prep-return" onClick={onRetourPreparation} aria-label={t('scene.returnPreparation')} title={t('scene.returnPreparation')}>{uiGlyphs.returnPreparation}</button>
          : <BoutonTourPrecedent compact disabled={retourDesactive} onClick={onTourPrecedent} />}
      <button className={`primary ${classeSuivant}`} style={{ minWidth: 0, padding: '10px 11px', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={onTourSuivant} disabled={suivantDesactive}>{texteSuivant}</button>
      <button className="small-btn bottom-quick-roll" type="button" onClick={onOuvrirLanceurDes} aria-label={t('random.quick.open')} title={t('random.quick.open')}>{uiGlyphs.dice}</button>
      <button className="small-btn" onClick={onOuvrirMenu} aria-label={t('menu.open')}>{uiGlyphs.menu}</button>
    </div>
  );
}
