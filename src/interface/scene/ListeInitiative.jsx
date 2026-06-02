import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../../constants.js';
import { actionsRestantesSouples } from '../../actions/flexibleTurnState.js';
import { grouperAffichageParticipants, grouperParInitiative, ordreCreneauxClassique, trierParInitiative } from '../../domain/initiative.js';
import { declarationStage, declarationStages, isCheckedPhaseMode, normalizeDeclarations, participantsHorsPhaseAvancee, participantsPourPhaseAvancee } from '../../domain/initiativeModes.js';
import { initiativeTextOrderEnabled } from '../../domain/initiativeTextOrder.js';
import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function optionsEgalite(scene) {
  return {
    categoryOrder: scene?.categoryOrder || defaultCategoryOrder,
    equalityRule: scene?.equalityRule || defaultEqualityRule,
    initiativeOrder: scene?.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene?.initiativeTextOrder,
    initiativeEnabled: scene?.temporalite !== 'souple' || scene?.flexibleUseInitiative !== false,
    tiebreakerVisible: scene?.tiebreakerVisible !== false,
    multipleActionSlots: scene?.multipleActionSlots !== false,
  };
}

function changerInfoRapide(interactions, participant, index, valeur) {
  interactions.updateCharacter(participant.id, (courant) => ({
    ...courant,
    stats: (courant.stats || []).map((stat, position) => position === index ? valeur : stat),
  }));
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
          onInfoRapide={(index, valeur) => changerInfoRapide(interactions, participant, index, valeur)}
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

function FichetteLibre({ scene, participant, actifId, activeSlotId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue }) {
  const actionsRestantes = temporaliteSouple ? actionsRestantesSouples(scene, participant.id) : 0;
  return (
    <FichetteInitiative
      participant={participant}
      actif={participant.actionSlotId ? participant.actionSlotId === activeSlotId || (!activeSlotId && participant.id === actifId) : participant.id === actifId}
      temporaliteSouple={temporaliteSouple}
      montrerInitiative={!temporaliteSouple || scene.flexibleUseInitiative !== false}
      dejaJoue={dejaJoue}
      actionsRestantes={actionsRestantes}
      onMarquerAJoue={() => onMarquerAJoue?.(participant.id)}
      onAnnulerAJoue={() => onAnnulerAJoue?.(participant.id)}
      onOuvrir={() => interactions.openCharacter(participant.id)}
      onInfoRapide={(index, valeur) => changerInfoRapide(interactions, participant, index, valeur)}
      onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
      onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
      onAjouterEtat={() => interactions.requestStatus(participant.id)}
      onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
      onQuitterInitiative={() => interactions.leaveInit(participant.id)}
    />
  );
}

function actionDeclareeVisible(scene, participantId) {
  if (declarationStage(scene) !== declarationStages.RESOLUTION) return '';
  if ((scene.declarationPlayedIds || []).includes(participantId)) return '';
  return normalizeDeclarations(scene.declarations, scene.participants || [])[participantId] || '';
}

function participantAvecDeclaration(scene, participant) {
  const action = actionDeclareeVisible(scene, participant.id);
  if (!action) return participant;
  return { ...participant, name: `${participant.name} (${action})` };
}

function ListeParPaliers({ scene, participants, actifId, activeSlotId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue = false }) {
  const options = optionsEgalite(scene);
  const textMode = initiativeTextOrderEnabled(scene?.initiativeTextOrder);
  const participantsAffiches = participants.map((participant) => participantAvecDeclaration(scene, participant));
  const groupes = textMode
    ? participantsAffiches.reduce((items, participant) => {
        const initiative = String(participant.initiative ?? '');
        const groupe = items.find((item) => item.initiative === initiative);
        if (groupe) groupe.participants.push(participant);
        else items.push({ initiative, participants: [participant] });
        return items;
      }, [])
    : grouperParInitiative(participantsAffiches, options);

  if (temporaliteSouple) {
    return <div className="initiative-tier-cards flexible-cards">{participantsAffiches.map((participant) => <FichetteLibre key={participant.actionSlotId || participant.id} scene={scene} participant={participant} actifId={actifId} activeSlotId={activeSlotId} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue={dejaJoue} />)}</div>;
  }

  return groupes.map((groupe) => (
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
                scene={scene}
                participant={bloc.participants[0]}
                actifId={actifId}
                activeSlotId={activeSlotId}
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

function ListeDeclaration({ scene, participants, interactions }) {
  const declarations = normalizeDeclarations(scene.declarations, participants);
  const ordreDeclaration = trierParInitiative(participants, optionsEgalite(scene)).reverse();
  return (
    <div className="initiative-list flexible-list declaration-list">
      <section className="flexible-section declaration-section">
        <EnteteSectionSouple titre="Déclarations" compteur={participants.length} />
        <div className="initiative-tier-cards flexible-cards">
          {ordreDeclaration.map((participant) => (
            <div className="declaration-entry" key={participant.id}>
              <FichetteLibre scene={scene} participant={participant} actifId="" activeSlotId="" interactions={interactions} />
              <span className={`chip declaration-action-chip ${declarations[participant.id] ? 'ready' : ''}`}>{declarations[participant.id] || 'A choisir'}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function ListeInitiative({ scene, participants, actifId, interactions, temporaliteSouple, temporalitePhases, temporaliteDeclaration, phaseAttendRelanceInitiative, onMarquerAJoue, onAnnulerAJoue }) {
  if (temporaliteDeclaration && declarationStage(scene) === declarationStages.DECLARATION) return <ListeDeclaration scene={scene} participants={participants} interactions={interactions} />;

  if (temporalitePhases) {
    const sceneAvecParticipants = { ...scene, participants };
    const phasesCochees = isCheckedPhaseMode(sceneAvecParticipants);
    const actifs = phaseAttendRelanceInitiative ? [] : participantsPourPhaseAvancee(sceneAvecParticipants, scene.phase);
    const attente = phaseAttendRelanceInitiative ? participants : participantsHorsPhaseAvancee(sceneAvecParticipants, scene.phase);

    return (
      <div className="initiative-list flexible-list phase-list">
        <section className="flexible-section phase-section">
          <EnteteSectionSouple titre={`Phase ${scene.phase || 1}`} compteur={actifs.length} />
          {phaseAttendRelanceInitiative
            ? <div className="empty-section panel">Initiatives à ressaisir pour ce nouveau round.</div>
            : actifs.length > 0
          ? <ListeParPaliers scene={scene} participants={actifs} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} />
              : <div className="empty-section panel">Aucun participant ne peut agir dans cette phase.</div>}
        </section>
        {attente.length > 0 && <section className="flexible-section already-played-section phase-waiting-section">
          <EnteteSectionSouple titre={phaseAttendRelanceInitiative ? 'En attente d’initiative' : phasesCochees ? 'Hors phase' : 'En attente du prochain round'} compteur={attente.length} variant="played" />
          <ListeParPaliers scene={scene} participants={attente} actifId="" activeSlotId="" interactions={interactions} />
        </section>}
      </div>
    );
  }

  if (!temporaliteSouple) {
    return (
      <div className="initiative-list">
        <ListeParPaliers scene={scene} participants={ordreCreneauxClassique(participants, optionsEgalite(scene))} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} />
      </div>
    );
  }

  const participantsTries = trierParInitiative(participants, optionsEgalite(scene));
  const doitJouer = participantsTries.filter((participant) => actionsRestantesSouples(scene, participant.id) > 0);
  const dejaJoues = participantsTries.filter((participant) => actionsRestantesSouples(scene, participant.id) === 0);

  return (
    <div className="initiative-list flexible-list">
      <section className="flexible-section">
        <EnteteSectionSouple titre="Doit jouer" compteur={doitJouer.length} />
        <ListeParPaliers scene={scene} participants={doitJouer} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} />
      </section>
      {dejaJoues.length > 0 && <section className="flexible-section already-played-section">
        <EnteteSectionSouple titre="Déjà joués" compteur={dejaJoues.length} variant="played" />
        <ListeParPaliers scene={scene} participants={dejaJoues} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue />
      </section>}
    </div>
  );
}
