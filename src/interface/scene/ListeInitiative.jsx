import { defaultCategoryOrder, defaultEqualityRule } from '../../constants.js';
import { grouperAffichageParticipants, grouperParInitiative, participantsEnAttentePhase, participantsPourPhase } from '../../domain/initiative.js';
import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function optionsEgalite(scene) {
  return {
    categoryOrder: scene?.categoryOrder || defaultCategoryOrder,
    equalityRule: scene?.equalityRule || defaultEqualityRule,
  };
}

function GroupeSimultane({ groupe, actifId, interactions }) {
  const actif = groupe.participants.some((participant) => participant.id === actifId);

  return (
    <div className={`simultaneous-group ${actif ? 'active' : ''}`}>
      {groupe.participants.map((participant) => (
        <FichetteInitiative
          key={participant.id}
          participant={participant}
          actif={actif}
          groupeSimultane
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

function FichetteLibre({ participant, actifId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue }) {
  return (
    <FichetteInitiative
      participant={participant}
      actif={participant.id === actifId}
      temporaliteSouple={temporaliteSouple}
      dejaJoue={dejaJoue}
      onMarquerAJoue={() => onMarquerAJoue?.(participant.id)}
      onAnnulerAJoue={() => onAnnulerAJoue?.(participant.id)}
      onOuvrir={() => interactions.openCharacter(participant.id)}
      onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
      onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
      onAjouterEtat={() => interactions.requestStatus(participant.id)}
      onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
      onQuitterInitiative={() => interactions.leaveInit(participant.id)}
    />
  );
}

function ListeParPaliers({ scene, participants, actifId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue = false }) {
  const options = optionsEgalite(scene);

  if (temporaliteSouple) {
    return <div className="initiative-tier-cards flexible-cards">{participants.map((participant) => <FichetteLibre key={participant.id} participant={participant} actifId={actifId} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue={dejaJoue} />)}</div>;
  }

  return grouperParInitiative(participants).map((groupe) => (
    <section className="initiative-tier" key={groupe.initiative}>
      <div className="initiative-tier-label" aria-label={`Initiative ${groupe.initiative}`}>
        <span>Init</span>
        <strong>{groupe.initiative}</strong>
      </div>
      <div className="initiative-tier-cards">
        {grouperAffichageParticipants(groupe.participants, options).map((bloc) => (
          bloc.simultaneous
            ? <GroupeSimultane key={bloc.id} groupe={bloc} actifId={actifId} interactions={interactions} />
            : <FichetteLibre
                key={bloc.id}
                participant={bloc.participants[0]}
                actifId={actifId}
                interactions={interactions}
              />
        ))}
      </div>
    </section>
  ));
}

function EnteteSectionSouple({ titre, compteur, variant }) {
  return (
    <div className={`flexible-section-title ${variant || ''}`}>
      <span>{titre}</span>
      <strong>{compteur}</strong>
    </div>
  );
}

export function ListeInitiative({ scene, participants, actifId, interactions, temporaliteSouple, temporalitePhases, phaseAttendRelanceInitiative, onMarquerAJoue, onAnnulerAJoue }) {
  if (temporalitePhases) {
    const actifs = phaseAttendRelanceInitiative ? [] : participantsPourPhase(participants, scene.phase, scene.phaseDecrement, optionsEgalite(scene));
    const attente = phaseAttendRelanceInitiative ? participants : participantsEnAttentePhase(participants, scene.phase, scene.phaseDecrement);

    return (
      <div className="initiative-list flexible-list phase-list">
        <section className="flexible-section phase-section">
          <EnteteSectionSouple titre={`Phase ${scene.phase || 1}`} compteur={actifs.length} />
          {phaseAttendRelanceInitiative
            ? <div className="empty-section panel">Initiatives à ressaisir pour ce nouveau round.</div>
            : actifs.length > 0
              ? <ListeParPaliers scene={scene} participants={actifs} actifId={actifId} interactions={interactions} />
              : <div className="empty-section panel">Aucun participant ne peut agir dans cette phase.</div>}
        </section>
        {attente.length > 0 && <section className="flexible-section already-played-section phase-waiting-section">
          <EnteteSectionSouple titre={phaseAttendRelanceInitiative ? 'En attente d’initiative' : 'En attente du prochain round'} compteur={attente.length} variant="played" />
          <ListeParPaliers scene={scene} participants={attente} actifId="" interactions={interactions} />
        </section>}
      </div>
    );
  }

  if (!temporaliteSouple) {
    return (
      <div className="initiative-list">
        <ListeParPaliers scene={scene} participants={participants} actifId={actifId} interactions={interactions} />
      </div>
    );
  }

  const dejaJouesIds = new Set(scene.jouesSouples || []);
  const doitJouer = participants.filter((participant) => !dejaJouesIds.has(participant.id));
  const dejaJoues = participants.filter((participant) => dejaJouesIds.has(participant.id));

  return (
    <div className="initiative-list flexible-list">
      <section className="flexible-section">
        <EnteteSectionSouple titre="Doit jouer" compteur={doitJouer.length} />
        <ListeParPaliers scene={scene} participants={doitJouer} actifId={actifId} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} />
      </section>
      {dejaJoues.length > 0 && <section className="flexible-section already-played-section">
        <EnteteSectionSouple titre="Déjà joués" compteur={dejaJoues.length} variant="played" />
        <ListeParPaliers scene={scene} participants={dejaJoues} actifId={actifId} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue />
      </section>}
    </div>
  );
}
