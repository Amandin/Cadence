import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

export function ListeInitiative({ participants, actifId, interactions }) {
  return participants.map((participant) => (
    <FichetteInitiative
      key={participant.id}
      participant={participant}
      actif={participant.id === actifId}
      onOuvrir={() => interactions.openCharacter(participant.id)}
      onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
      onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
      onAjouterEtat={() => interactions.requestStatus(participant.id)}
      onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
      onQuitterInitiative={() => interactions.leaveInit(participant.id)}
    />
  ));
}
