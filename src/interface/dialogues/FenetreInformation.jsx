import { Fenetre } from '../commun/ComposantsCommuns.jsx';
import { t } from '../../i18n/index.js';

export function FenetreInformation({ titre = t('common.information'), message, onFermer }) {
  return (
    <Fenetre title={titre} onClose={onFermer}>
      {message && <p style={{ lineHeight: 1.45, marginTop: 0 }}>{message}</p>}
      <button className="primary" style={{ width: '100%' }} onClick={onFermer}>{t('common.ok')}</button>
    </Fenetre>
  );
}
