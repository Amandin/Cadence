import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function valeurInitiative(participant) {
  const nombre = Number(participant?.initiative);
  return Number.isFinite(nombre) ? nombre : 0;
}

function grouperParInitiative(participants = []) {
  return participants.reduce((groupes, participant) => {
    const initiative = valeurInitiative(participant);
    const groupe = groupes.find((item) => item.initiative === initiative);
    if (groupe) groupe.participants.push(participant);
    else groupes.push({ initiative, participants: [participant] });
    return groupes;
  }, []);
}

export function ListeInitiative({ participants, actifId, interactions }) {
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
