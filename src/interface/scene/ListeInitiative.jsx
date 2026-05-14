import { defaultCategoryOrder, defaultEqualityRule } from '../../constants.js';
import { grouperParInitiative, idsEgaliteParfaite } from '../../domain/initiative.js';
import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function optionsEgalite(scene) {
  return {
    categoryOrder: scene?.categoryOrder || defaultCategoryOrder,
    equalityRule: scene?.equalityRule || defaultEqualityRule,
  };
}

export function ListeInitiative({ scene, participants, actifId, interactions }) {
  const idsSimultanes = idsEgaliteParfaite(participants, optionsEgalite(scene));

  return (
    <div className="initiative-list">
      {grouperParInitiative(participants).map((groupe) => (
        <section className="initiative-tier" key={groupe.initiative}>
          <div className="initiative-tier-label" aria-label={`Initiative ${groupe.initiative}`}>
            <span>Init</span>
            <strong>{groupe.initiative}</strong>
          </div>
          <div className="initiative-tier-cards">
            {groupe.participants.map((participant) => (
              <FichetteInitiative
                key={participant.id}
                participant={participant}
                actif={participant.id === actifId}
                simultane={idsSimultanes.has(participant.id)}
                onOuvrir={() => interactions.openCharacter(participant.id)}
                onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
                onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
                onAjouterEtat={() => interactions.requestStatus(participant.id)}
                onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
                onQuitterInitiative={() => interactions.leaveInit(participant.id)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
