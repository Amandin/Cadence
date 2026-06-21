import { t } from '../../i18n/index.js';
import { Fenetre } from '../commun/ComposantsCommuns.jsx';

export function FenetreConfirmationSuppression({ nom, onAnnuler, onConfirmer }) {
  return (
    <Fenetre title={t('deleteCharacter.title')} onClose={onAnnuler}>
      <div className="stack">
        <p style={{ marginTop: 0 }}>
          {t('deleteCharacter.warningBefore')} <strong>{nom}</strong> {t('deleteCharacter.warningAfter')}
        </p>
        <p className="muted" style={{ margin: 0 }}>
          {t('deleteCharacter.help')}
        </p>
        <div className="grid2" style={{ marginTop: 12 }}>
          <button className="small-btn" onClick={onAnnuler}>{t('common.cancel')}</button>
          <button className="danger-btn" onClick={onConfirmer}>{t('deleteCharacter.confirm')}</button>
        </div>
      </div>
    </Fenetre>
  );
}
