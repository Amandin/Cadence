import { FichetteReserve } from '../fiches/FichetteReserve.jsx';

export function ReserveHorsInitiative({ scene, interactions, onModifierNotes }) {
  if (!scene.reserve?.length) return null;

  return (
    <section className="reserve">
      <h3>Réserve</h3>
      {scene.reserve.map((participant) => (
        <FichetteReserve
          key={participant.id}
          participant={participant}
          onOuvrir={() => interactions.openCharacter(participant.id)}
          onRejoindre={() => interactions.requestJoin(participant.id)}
          onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
          onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
          onAjouterEtat={() => interactions.requestStatus(participant.id)}
          onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
        />
      ))}
      <label className="field reserve-notes">Notes de réserve<textarea value={scene.reserveNotes || ''} onChange={(event) => onModifierNotes(event.target.value)} placeholder="Renforts, événements en attente, éléments hors scène immédiate…" /></label>
    </section>
  );
}
