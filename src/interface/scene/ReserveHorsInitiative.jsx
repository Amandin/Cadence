import { defaultCategoryOrder } from '../../constants.js';
import { trierReserve } from '../../domain/initiative.js';
import { FichetteReserve } from '../fiches/FichetteReserve.jsx';

export function ReserveHorsInitiative({ scene, interactions, onModifierNotes, onAvancerReserve }) {
  if (!scene.reserve?.length) return null;

  const reserveTriee = trierReserve(scene.reserve, {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
  });

  return (
    <section className="reserve">
      <div className="reserve-head">
        <h3>Reserve</h3>
        {onAvancerReserve && <button className="small-btn" type="button" onClick={onAvancerReserve}>Appliquer le debut de round a la reserve</button>}
      </div>
      {reserveTriee.map((participant) => (
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
      <label className="field reserve-notes">Notes de reserve<textarea value={scene.reserveNotes || ''} onChange={(event) => onModifierNotes(event.target.value)} placeholder="Renforts, evenements en attente, elements hors scene immediate..." /></label>
    </section>
  );
}
