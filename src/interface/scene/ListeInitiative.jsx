import { defaultCategoryOrder, defaultEqualityRule } from '../../constants.js';
import { grouperAffichageParticipants, grouperParInitiative } from '../../domain/initiative.js';
import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function optionsEgalite(scene) {
  return {
    categoryOrder: scene?.categoryOrder || defaultCategoryOrder,
    equalityRule: scene?.equalityRule || defaultEqualityRule,
  };
}

function GroupeSimultane({ groupe, actifId, interactions, temporaliteSouple, onChoisirActif }) {
  const actif = groupe.participants.some((participant) => participant.id === actifId);
  const choisirGroupe = () => onChoisirActif?.(groupe.participants[0]?.id);

  return (
    <div className={`simultaneous-group ${actif ? 'active' : ''}`}>
      {temporaliteSouple && !actif && <button className="small-btn flexible-play-group" onClick={choisirGroupe}>Jouer ce groupe</button>}
      {groupe.participants.map((participant) => (
        <FichetteInitiative
          key={participant.id}
          participant={participant}
          actif={actif}
          groupeSimultane
          temporaliteSouple={temporaliteSouple}
          onChoisirActif={() => onChoisirActif?.(participant.id)}
          onOuvrir={() => interactions.openCharacter(participant.id)}
          onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
          onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
          onAjouterEtat={() => interactions.requestStatus(participant.id)}
          onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
          onQuitterInitiative={() => interactions.leaveInit(participant.id)}
        />
      ))}
    </div>
  );
}

export function ListeInitiative({ scene, participants, actifId, interactions, temporaliteSouple, onChoisirActif }) {
  const options = optionsEgalite(scene);

  return (
    <div className="initiative-list">
      {grouperParInitiative(participants).map((groupe) => (
        <section className="initiative-tier" key={groupe.initiative}>
          <div className="initiative-tier-label" aria-label={`Initiative ${groupe.initiative}`}>
            <span>Init</span>
            <strong>{groupe.initiative}</strong>
          </div>
          <div className="initiative-tier-cards">
            {grouperAffichageParticipants(groupe.participants, options).map((bloc) => (
              bloc.simultaneous
                ? <GroupeSimultane key={bloc.id} groupe={bloc} actifId={actifId} interactions={interactions} temporaliteSouple={temporaliteSouple} onChoisirActif={onChoisirActif} />
                : <FichetteInitiative
                    key={bloc.id}
                    participant={bloc.participants[0]}
                    actif={bloc.participants[0].id === actifId}
                    temporaliteSouple={temporaliteSouple}
                    onChoisirActif={() => onChoisirActif?.(bloc.participants[0].id)}
                    onOuvrir={() => interactions.openCharacter(bloc.participants[0].id)}
                    onSuivi={(trackerId, next) => interactions.updateCharacterTracker(bloc.participants[0].id, trackerId, next)}
                    onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(bloc.participants[0].id, trackerId)}
                    onAjouterEtat={() => interactions.requestStatus(bloc.participants[0].id)}
                    onRetirerEtat={(statusId) => interactions.removeCharacterStatus(bloc.participants[0].id, statusId)}
                    onQuitterInitiative={() => interactions.leaveInit(bloc.participants[0].id)}
                  />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
