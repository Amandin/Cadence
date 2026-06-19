import { defaultCategoryOrder } from '../../constants.js';
import { trierReserve } from '../../domain/initiative.js';
import { t } from '../../i18n/index.js';
import { FichetteReserve } from '../fiches/FichetteReserve.jsx';

export function ReserveHorsInitiative({ scene, interactions, onModifierNotes }) {
  const reserveTriee = trierReserve(scene.reserve || [], {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
  });

  return (
    <section className="reserve">
      <div className="reserve-head">
        <h3>{t('reserve.title')}</h3>
      </div>
      {reserveTriee.length > 0
        ? reserveTriee.map((participant) => (
            <FichetteReserve
              key={participant.id}
              participant={participant}
              onOuvrir={() => interactions.openCharacter(participant.id)}
              onRejoindre={() => interactions.requestJoin(participant.id)}
              onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
              onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
              onAjouterEtat={() => interactions.requestStatus(participant.id)}
              onModifierEtat={(statusId) => interactions.requestStatus(participant.id, statusId)}
              onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
            />
          ))
        : <div className="quick-stats-full reserve-empty"><span className="chip reserve-empty-chip">{t('reserve.empty')}</span></div>}
      <label className="field reserve-notes">{t('reserve.notes')}<textarea value={scene.reserveNotes || ''} onChange={(event) => onModifierNotes(event.target.value)} placeholder={t('reserve.notes.placeholder')} /></label>
    </section>
  );
}
