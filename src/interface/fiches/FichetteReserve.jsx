import { t } from '../../i18n/index.js';
import { FichetteParticipant } from './FichetteParticipant.jsx';

export function FichetteReserve({ participant, onRejoindre, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onModifierEtat, onRetirerEtat, onLancerJetRapide }) {
  return <FichetteParticipant participant={participant} className="reserve-card" onOuvrir={onOuvrir} onSuivi={onSuivi} onSupprimerSuivi={onSupprimerSuivi} onAjouterEtat={onAjouterEtat} onModifierEtat={onModifierEtat} onRetirerEtat={onRetirerEtat} onLancerJetRapide={onLancerJetRapide} primaryAction={<button className="small-btn" onClick={onRejoindre}>{t('initiative.joinAction')}</button>} />;
}
