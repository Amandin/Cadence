import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../../constants.js';
import { actionsRestantesSouples, creneauxJouesSouples } from '../../actions/flexibleTurnState.js';
import { grouperAffichageParticipants, grouperParInitiative, ordreCreneauxClassique, trierParInitiative } from '../../domain/initiative.js';
import { rulesAllowMultipleSlots } from '../../domain/initiativeCost.js';
import { declarationStage, declarationStages, isCheckedPhaseMode, normalizeDeclarations, participantsHorsPhaseAvancee, participantsPourPhaseAvancee } from '../../domain/initiativeModes.js';
import { initiativeTextOrderEnabled } from '../../domain/initiativeTextOrder.js';
import { t } from '../../i18n/index.js';
import { FichetteInitiative } from '../fiches/FichetteInitiative.jsx';

function optionsEgalite(scene) {
  return {
    categoryOrder: scene?.categoryOrder || defaultCategoryOrder,
    equalityRule: scene?.equalityRule || defaultEqualityRule,
    initiativeOrder: scene?.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene?.initiativeTextOrder,
    initiativeEnabled: scene?.temporalite !== 'souple' || scene?.flexibleUseInitiative !== false,
    tiebreakerVisible: scene?.tiebreakerVisible !== false,
    multipleActionSlots: (participant) => rulesAllowMultipleSlots(scene, participant),
  };
}

function changerInfoRapide(interactions, participant, index, valeur) {
  interactions.updateCharacter(participant.id, (courant) => ({
    ...courant,
    stats: (courant.stats || []).map((stat, position) => position === index ? valeur : stat),
  }));
}

const GroupeSimultane = memo(function GroupeSimultane({ groupe, participantTypes, actifId, interactions, performanceLow }) {
  const actif = useMemo(() => groupe.participants.some((participant) => participant.id === actifId), [actifId, groupe.participants]);

  return (
    <div className={`simultaneous-group ${actif ? 'active' : ''}`}>
      {groupe.participants.map((participant) => (
        <FichetteInitiative
          key={participant.actionSlotId || participant.id}
          participant={participant}
          participantTypes={participantTypes}
          actif={actif}
          groupeSimultane
          onOuvrir={() => interactions.openCharacter(participant.id)}
          onInfoRapide={(index, valeur) => changerInfoRapide(interactions, participant, index, valeur)}
          onSuivi={(trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next)}
          onSupprimerSuivi={(trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId)}
          onAjouterEtat={() => interactions.requestStatus(participant.id)}
          onModifierEtat={(statusId) => interactions.requestStatus(participant.id, statusId)}
          onRetirerEtat={(statusId) => interactions.removeCharacterStatus(participant.id, statusId)}
          onLancerJetRapide={interactions.openQuickRoll}
          onQuitterInitiative={() => interactions.leaveInit(participant.id)}
          performanceLow={performanceLow}
        />
      ))}
    </div>
  );
});

const FichetteLibre = memo(function FichetteLibre({ scene, participant, actifId, activeSlotId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue, performanceLow = false }) {
  const actionsRestantes = useMemo(() => temporaliteSouple ? actionsRestantesSouples(scene, participant.id) : 0, [participant.id, scene, temporaliteSouple]);
  const actionsJouees = useMemo(() => temporaliteSouple ? creneauxJouesSouples(scene, participant.id).length : 0, [participant.id, scene, temporaliteSouple]);
  const actif = useMemo(
    () => participant.actionSlotId ? participant.actionSlotId === activeSlotId || (!activeSlotId && participant.id === actifId) : participant.id === actifId,
    [activeSlotId, actifId, participant.actionSlotId, participant.id],
  );
  const ouvrir = useCallback(() => interactions.openCharacter(participant.id), [interactions, participant.id]);
  const changerInfo = useCallback((index, valeur) => changerInfoRapide(interactions, participant, index, valeur), [interactions, participant]);
  const modifierSuivi = useCallback((trackerId, next) => interactions.updateCharacterTracker(participant.id, trackerId, next), [interactions, participant.id]);
  const supprimerSuivi = useCallback((trackerId) => interactions.deleteCharacterTracker(participant.id, trackerId), [interactions, participant.id]);
  const ajouterEtat = useCallback(() => interactions.requestStatus(participant.id), [interactions, participant.id]);
  const modifierEtat = useCallback((statusId) => interactions.requestStatus(participant.id, statusId), [interactions, participant.id]);
  const retirerEtat = useCallback((statusId) => interactions.removeCharacterStatus(participant.id, statusId), [interactions, participant.id]);
  const quitterInitiative = useCallback(() => interactions.leaveInit(participant.id), [interactions, participant.id]);
  const marquerAJoue = useCallback(() => onMarquerAJoue?.(participant.id), [onMarquerAJoue, participant.id]);
  const annulerAJoue = useCallback(() => onAnnulerAJoue?.(participant.id), [onAnnulerAJoue, participant.id]);
  return (
    <FichetteInitiative
      participant={participant}
      participantTypes={scene.participantTypes}
      actif={actif}
      temporaliteSouple={temporaliteSouple}
      montrerInitiative={!temporaliteSouple || scene.flexibleUseInitiative !== false}
      afficherActionsSouples={scene.round >= 0}
      dejaJoue={dejaJoue}
      actionsRestantes={actionsRestantes}
      actionsJouees={actionsJouees}
      onMarquerAJoue={marquerAJoue}
      onAnnulerAJoue={annulerAJoue}
      onOuvrir={ouvrir}
      onInfoRapide={changerInfo}
      onSuivi={modifierSuivi}
      onSupprimerSuivi={supprimerSuivi}
      onAjouterEtat={ajouterEtat}
      onModifierEtat={modifierEtat}
      onRetirerEtat={retirerEtat}
      onLancerJetRapide={interactions.openQuickRoll}
      onQuitterInitiative={quitterInitiative}
      performanceLow={performanceLow}
    />
  );
});

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

const ListeParPaliers = memo(function ListeParPaliers({ scene, participants, actifId, activeSlotId, interactions, temporaliteSouple, onMarquerAJoue, onAnnulerAJoue, dejaJoue = false, performanceLow = false }) {
  const options = useMemo(() => optionsEgalite(scene), [scene]);
  const textMode = useMemo(() => initiativeTextOrderEnabled(scene?.initiativeTextOrder), [scene?.initiativeTextOrder]);
  const participantsAffiches = useMemo(() => participants.map((participant) => participantAvecDeclaration(scene, participant)), [participants, scene]);
  const groupes = useMemo(() => textMode
    ? participantsAffiches.reduce((items, participant) => {
        const initiative = String(participant.initiative ?? '');
        const groupe = items.find((item) => item.initiative === initiative);
        if (groupe) groupe.participants.push(participant);
        else items.push({ initiative, participants: [participant] });
        return items;
      }, [])
    : grouperParInitiative(participantsAffiches, options), [options, participantsAffiches, textMode]);

  if (temporaliteSouple) {
    return <div className="initiative-tier-cards flexible-cards">{participantsAffiches.map((participant) => <FichetteLibre key={participant.actionSlotId || participant.id} scene={scene} participant={participant} actifId={actifId} activeSlotId={activeSlotId} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue={dejaJoue} performanceLow={performanceLow} />)}</div>;
  }

  return groupes.map((groupe) => (
    <section className="initiative-tier" key={groupe.initiative}>
      <div className="initiative-tier-label" aria-label={t('initiative.groupAria', { initiative: groupe.initiative })}>
        <span>{t('initiative.groupShort')}</span>
        <strong>{groupe.initiative}</strong>
      </div>
      <div className="initiative-tier-cards">
        {grouperAffichageParticipants(groupe.participants, options).map((bloc) => (
          bloc.simultaneous
            ? <GroupeSimultane key={bloc.id} groupe={bloc} participantTypes={scene.participantTypes} actifId={actifId} interactions={interactions} performanceLow={performanceLow} />
            : <FichetteLibre
                key={bloc.id}
                scene={scene}
                participant={bloc.participants[0]}
                actifId={actifId}
                activeSlotId={activeSlotId}
                interactions={interactions}
                performanceLow={performanceLow}
              />
        ))}
      </div>
    </section>
  ));
});

function EnteteSectionSouple({ titre, compteur, variant }) {
  return (
    <div className={`flexible-section-title ${variant || ''}`}>
      <span>{titre}</span>
      <strong>{compteur}</strong>
    </div>
  );
}

function SurprisePreparationToggle({ scene, onToggleSurprisePreparation }) {
  if (scene.round >= 0) return null;
  return (
    <label className={`reset-switch preparation-surprise-toggle initiative-surprise-toggle ${scene.preparationSurprise ? 'active' : ''}`}>
      <span>{t('scene.header.surprise')}</span>
      <input type="checkbox" checked={!!scene.preparationSurprise} onChange={(event) => onToggleSurprisePreparation?.(event.target.checked)} />
    </label>
  );
}

const ListeDeclaration = memo(function ListeDeclaration({ scene, participants, interactions, performanceLow = false }) {
  const declarations = useMemo(() => normalizeDeclarations(scene.declarations, participants), [participants, scene.declarations]);
  const ordreDeclaration = useMemo(() => trierParInitiative(participants, optionsEgalite(scene)).reverse(), [participants, scene]);
  return (
    <div className="initiative-list flexible-list declaration-list">
      <section className="flexible-section declaration-section">
        <EnteteSectionSouple titre={t('declarations.title')} compteur={participants.length} />
        <div className="initiative-tier-cards flexible-cards">
          {ordreDeclaration.map((participant) => (
            <div className="declaration-entry" key={participant.id}>
              <FichetteLibre scene={scene} participant={participant} actifId="" activeSlotId="" interactions={interactions} performanceLow={performanceLow} />
              <span className={`chip declaration-action-chip ${declarations[participant.id] ? 'ready' : ''}`}>{declarations[participant.id] || t('initiative.choose')}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
});

export const ListeInitiative = memo(function ListeInitiative({ scene, participants, actifId, interactions, temporaliteSouple, temporalitePhases, temporaliteDeclaration, phaseAttendRelanceInitiative, onMarquerAJoue, onAnnulerAJoue, onToggleSurprisePreparation, performanceLow = false }) {
  const containerRef = useRef(null);
  const previousFocusKeyRef = useRef(null);
  const focusKey = useMemo(() => [
    scene.round,
    scene.phase || '',
    scene.activeSlotId || '',
    temporalitePhases ? (phaseAttendRelanceInitiative ? '' : actifId || '') : actifId || '',
    temporaliteDeclaration ? declarationStage(scene) : '',
  ].join(':'), [actifId, phaseAttendRelanceInitiative, scene, temporaliteDeclaration, temporalitePhases]);

  useEffect(() => {
    if (!focusKey || focusKey === previousFocusKeyRef.current) return;
    previousFocusKeyRef.current = focusKey;
    const frame = requestAnimationFrame(() => {
      const activeCard = containerRef.current?.querySelector('.active-turn');
      if (!activeCard) return;

      const rect = activeCard.getBoundingClientRect();
      const fixedHeader = document.querySelector('.scene-app .top')?.getBoundingClientRect();
      const fixedFooter = document.querySelector('.scene-app .bottom')?.getBoundingClientRect();
      const topLimit = (fixedHeader?.bottom || 0) + 12;
      const bottomLimit = (fixedFooter?.top || window.innerHeight) - 12;
      const availableHeight = bottomLimit - topLimit;

      let delta = 0;
      if (rect.height > availableHeight || rect.top < topLimit) delta = rect.top - topLimit;
      else if (rect.bottom > bottomLimit) delta = rect.bottom - bottomLimit;

      if (Math.abs(delta) > 1) {
        window.scrollBy({ top: delta, behavior: performanceLow ? 'auto' : 'smooth' });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [focusKey, performanceLow]);

  const options = useMemo(() => optionsEgalite(scene), [scene]);
  const phaseData = useMemo(() => {
    const sceneAvecParticipants = { ...scene, participants };
    return {
      phasesCochees: isCheckedPhaseMode(sceneAvecParticipants),
      actifs: phaseAttendRelanceInitiative ? [] : participantsPourPhaseAvancee(sceneAvecParticipants, scene.phase),
      attente: phaseAttendRelanceInitiative ? participants : participantsHorsPhaseAvancee(sceneAvecParticipants, scene.phase),
    };
  }, [participants, phaseAttendRelanceInitiative, scene]);
  const participantsClassiques = useMemo(() => ordreCreneauxClassique(participants, options), [options, participants]);
  const listesSouples = useMemo(() => {
    const participantsTries = trierParInitiative(participants, options);
    const restantsParParticipant = new Map(participantsTries.map((participant) => [participant.id, actionsRestantesSouples(scene, participant.id)]));
    return {
      doitJouer: participantsTries.filter((participant) => restantsParParticipant.get(participant.id) > 0),
      dejaJoues: participantsTries.filter((participant) => restantsParParticipant.get(participant.id) === 0),
    };
  }, [options, participants, scene]);

  if (scene.round >= 0 && temporaliteDeclaration && declarationStage(scene) === declarationStages.DECLARATION) return <ListeDeclaration scene={scene} participants={participants} interactions={interactions} performanceLow={performanceLow} />;

  if (temporalitePhases) {
    const { phasesCochees, actifs, attente } = phaseData;

    return (
      <div className="initiative-list flexible-list phase-list" ref={containerRef}>
        <SurprisePreparationToggle scene={scene} onToggleSurprisePreparation={onToggleSurprisePreparation} />
        <section className="flexible-section phase-section">
          <EnteteSectionSouple titre={t('initiative.phase', { phase: scene.phase || 1 })} compteur={actifs.length} />
          {phaseAttendRelanceInitiative
            ? <div className="empty-section panel">{t('initiative.phaseRethink')}</div>
            : actifs.length > 0
              ? <ListeParPaliers scene={scene} participants={actifs} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} performanceLow={performanceLow} />
              : <div className="empty-section panel">{t('initiative.phaseEmpty')}</div>}
        </section>
        {attente.length > 0 && <section className="flexible-section already-played-section phase-waiting-section">
          <EnteteSectionSouple titre={phaseAttendRelanceInitiative ? t('initiative.waitingInitiative') : phasesCochees ? t('initiative.outOfPhase') : t('initiative.waitingNextRound')} compteur={attente.length} variant="played" />
          <ListeParPaliers scene={scene} participants={attente} actifId="" activeSlotId="" interactions={interactions} performanceLow={performanceLow} />
        </section>}
      </div>
    );
  }

  if (!temporaliteSouple) {
    return (
      <div className="initiative-list" ref={containerRef}>
        <SurprisePreparationToggle scene={scene} onToggleSurprisePreparation={onToggleSurprisePreparation} />
        <ListeParPaliers scene={scene} participants={participantsClassiques} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} performanceLow={performanceLow} />
      </div>
    );
  }

  const { doitJouer, dejaJoues } = listesSouples;

  return (
    <div className="initiative-list flexible-list" ref={containerRef}>
      <SurprisePreparationToggle scene={scene} onToggleSurprisePreparation={onToggleSurprisePreparation} />
      <section className="flexible-section">
        <EnteteSectionSouple titre={t('initiative.actionsToResolve')} compteur={doitJouer.length} />
        <ListeParPaliers scene={scene} participants={doitJouer} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} performanceLow={performanceLow} />
      </section>
      {dejaJoues.length > 0 && <section className="flexible-section already-played-section">
        <EnteteSectionSouple titre={t('initiative.actionsResolved')} compteur={dejaJoues.length} variant="played" />
        <ListeParPaliers scene={scene} participants={dejaJoues} actifId={actifId} activeSlotId={scene.activeSlotId || ''} interactions={interactions} temporaliteSouple onMarquerAJoue={onMarquerAJoue} onAnnulerAJoue={onAnnulerAJoue} dejaJoue performanceLow={performanceLow} />
      </section>}
    </div>
  );
});
