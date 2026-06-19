import { FichetteParticipant } from './FichetteParticipant.jsx';

export function FichetteReserve({ participant, onRejoindre, onOuvrir, onSuivi, onSupprimerSuivi, onAjouterEtat, onModifierEtat, onRetirerEtat }) {
  return <FichetteParticipant participant={participant} className="reserve-card" onOuvrir={onOuvrir} onSuivi={onSuivi} onSupprimerSuivi={onSupprimerSuivi} onAjouterEtat={onAjouterEtat} onModifierEtat={onModifierEtat} onRetirerEtat={onRetirerEtat} primaryAction={<button className="small-btn" onClick={onRejoindre}>Rejoindre l’initiative</button>} />;
}
