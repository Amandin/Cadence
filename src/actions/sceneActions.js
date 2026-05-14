import { temporalityModes } from '../constants.js';
import { trierParInitiative } from '../domain/initiative.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { createStatus } from '../domain/statuses.js';
import { clone, tickParticipant, untickParticipant } from '../logic.js';
import { ajouterJoueSouple, annulerDernierJoueSouple, retirerHistoriqueSouple, retirerJoueSouple, toutLeMondeAJoueSouple } from './flexibleTurnState.js';
import { addRestorePoint, createBlankParticipant, optionsTri, placerEnReserve, valeurInitiativeRenseignee } from './sceneSupport.js';
import {
  appliquerDebutNouveauRound,
  appliquerNouveauRoundPhases,
  appliquerNouveauRoundSouple,
  estModePhases,
  estModeSouple,
  participantsPhase,
  phaseSuivanteDisponible,
  premierParticipantPhase,
  trouverTourActifParInitiative,
} from './tempoState.js';

function modifierParticipantDansScene(scene, participantId, updater) {
  const participants = trierParInitiative(scene.participants.map((p) => p.id === participantId ? updater(p) : p), optionsTri(scene));
  const { activeId, nouveauRound } = estModeSouple(scene) || estModePhases(scene)
    ? { activeId: scene.activeId, nouveauRound: false }
    : trouverTourActifParInitiative(scene, participants);
  const sceneSuivante = {
    ...scene,
    participants,
    activeId,
    reserve: (scene.reserve || []).map((p) => p.id === participantId ? placerEnReserve(updater(p)) : placerEnReserve(p)),
  };

  return nouveauRound ? appliquerDebutNouveauRound(sceneSuivante, activeId) : sceneSuivante;
}

function recalerActifPhaseSiBesoin(scene) {
  return estModePhases(scene) && !participantsPhase(scene).some((participant) => participant.id === scene.activeId)
    ? { ...scene, activeId: premierParticipantPhase(scene) }
    : scene;
}

export function createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }) {
  const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
  const updateParticipant = (id, updater) => updateScene((s) => {
    const nextScene = modifierParticipantDansScene(s, id, updater);
    if (nextScene.round > s.round) {
      setRoundEffect('next');
      setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
    }
    return nextScene;
  });

  return {
    updateParticipant,
    updateCategoryOrder(categoryOrder) {
      updateScene((s) => ({
        ...s,
        categoryOrder,
        participants: trierParInitiative(s.participants || [], { ...optionsTri(s), categoryOrder }),
      }));
    },
    updateEqualityRule(equalityRule) {
      updateScene((s) => ({
        ...s,
        equalityRule,
        participants: trierParInitiative(s.participants || [], { ...optionsTri(s), equalityRule }),
      }));
    },
    updateTemporality(temporalite) {
      setRoundEffect(null);
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        temporalite,
        phase: temporalite === temporalityModes.PHASES ? (s.phase || 1) : 1,
        activeId: temporalite === temporalityModes.FLEXIBLE ? '' : s.activeId,
        reserve: (s.reserve || []).map(placerEnReserve),
        jouesSouples: temporalite === temporalityModes.FLEXIBLE ? (s.jouesSouples || []) : [],
        historiqueSouple: temporalite === temporalityModes.FLEXIBLE ? (s.historiqueSouple || []) : [],
      }));
    },
    updatePhaseDecrement(phaseDecrement) {
      const valeur = Math.max(1, Number(phaseDecrement) || 10);
      setRoundEffect(null);
      updateScene((s) => ({ ...s, phaseDecrement: valeur, activeId: estModePhases(s) ? participantsPhase({ ...s, phaseDecrement: valeur })[0]?.id || '' : s.activeId }));
    },
    updatePhaseRerollEachRound(phaseRerollEachRound) {
      updateScene((s) => ({ ...s, phaseRerollEachRound: !!phaseRerollEachRound }));
    },
    setActiveParticipant(activeId) {
      updateScene((s) => ({ ...s, activeId }));
    },
    applyInitiativeRolls(valuesById) {
      setRoundEffect(null);
      updateScene((s) => {
        const participantsMisAJour = (s.participants || []).map((participant) => {
          const initiative = valeurInitiativeRenseignee(valuesById, participant.id);
          return initiative == null ? participant : { ...participant, initiative };
        });
        const reserveJointe = [];
        const reserve = (s.reserve || []).flatMap((participant) => {
          const initiative = valeurInitiativeRenseignee(valuesById, participant.id);
          if (initiative == null) return [placerEnReserve(participant)];
          reserveJointe.push({ ...participant, initiative });
          return [];
        });
        const participants = trierParInitiative([...participantsMisAJour, ...reserveJointe], optionsTri(s));
        const sceneAvecParticipants = { ...s, participants, reserve, phase: estModePhases(s) ? 1 : s.phase || 1 };
        return {
          ...sceneAvecParticipants,
          activeId: estModeSouple(s) ? '' : estModePhases(s) ? participantsPhase(sceneAvecParticipants)[0]?.id || '' : participants[0]?.id || '',
          jouesSouples: [],
          historiqueSouple: [],
        };
      });
    },
    moveParticipantsToReserve(ids = []) {
      const idsSet = new Set(ids);
      if (idsSet.size === 0) return;
      updateScene((s) => {
        const sortants = (s.participants || []).filter((participant) => idsSet.has(participant.id)).map(placerEnReserve);
        const participants = (s.participants || []).filter((participant) => !idsSet.has(participant.id));
        const sceneSuivante = {
          ...s,
          participants,
          reserve: [...(s.reserve || []).map(placerEnReserve), ...sortants],
          activeId: idsSet.has(s.activeId) ? participants[0]?.id || '' : s.activeId,
          jouesSouples: (s.jouesSouples || []).filter((id) => !idsSet.has(id)),
          historiqueSouple: (s.historiqueSouple || []).filter((id) => !idsSet.has(id)),
        };
        return recalerActifPhaseSiBesoin(sceneSuivante);
      });
    },
    markFlexiblePlayed(participantId) {
      updateScene((s) => ({
        ...s,
        activeId: participantId,
        jouesSouples: ajouterJoueSouple(s, participantId),
        historiqueSouple: (s.jouesSouples || []).includes(participantId)
          ? (s.historiqueSouple || [])
          : [...(s.historiqueSouple || []), participantId],
      }));
    },
    unmarkFlexiblePlayed(participantId) {
      updateScene((s) => ({
        ...s,
        activeId: participantId,
        jouesSouples: retirerJoueSouple(s, participantId),
        historiqueSouple: retirerHistoriqueSouple(s, participantId),
      }));
    },
    undoFlexibleTurn() {
      updateScene(annulerDernierJoueSouple);
    },
    restoreScene(pointId) {
      const point = (restorePoints[scene.id] || []).find((item) => item.id === pointId);
      if (!point) return;
      setRoundEffect(null);
      updateScene(() => clone(point.scene));
    },
    deleteParticipant(id) {
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: s.participants.filter((p) => p.id !== id),
        reserve: (s.reserve || []).filter((p) => p.id !== id).map(placerEnReserve),
        activeId: s.activeId === id ? s.participants.find((p) => p.id !== id)?.id || '' : s.activeId,
        jouesSouples: retirerJoueSouple(s, id),
        historiqueSouple: retirerHistoriqueSouple(s, id),
      }));
    },
    trackerChange(pid, tid, next) {
      updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.map((t) => t.id === tid ? next : t) }));
    },
    deleteTracker(pid, tid) {
      updateParticipant(pid, (p) => ({ ...p, trackers: p.trackers.filter((t) => t.id !== tid) }));
    },
    addStatus(pid, data) {
      const status = createStatus(data);
      if (status) updateParticipant(pid, (p) => ({ ...p, statuses: [...(p.statuses || []), status] }));
    },
    removeStatus(pid, sid) {
      updateParticipant(pid, (p) => ({ ...p, statuses: (p.statuses || []).filter((s) => s.id !== sid) }));
    },
    nextTurn(direction = 1) {
      if (estModeSouple(scene)) {
        if (direction < 0) updateScene(annulerDernierJoueSouple);
        if (direction > 0 && !blocked.length && toutLeMondeAJoueSouple(scene)) {
          setRoundEffect('next');
          updateScene((s) => {
            const nextScene = appliquerNouveauRoundSouple(s);
            setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
            return nextScene;
          });
        }
        return;
      }

      if (estModePhases(scene)) {
        const phaseParticipants = participantsPhase(scene);
        if (!phaseParticipants.length) return;
        const currentIndex = phaseParticipants.findIndex((p) => p.id === scene.activeId);
        if (currentIndex < 0) {
          setRoundEffect(null);
          updateScene((s) => ({ ...s, activeId: phaseParticipants[0]?.id || s.activeId }));
          return;
        }
        if (direction < 0) {
          const previousIndex = Math.max(0, currentIndex - 1);
          setRoundEffect(null);
          updateScene((s) => ({ ...s, activeId: phaseParticipants[previousIndex]?.id || s.activeId }));
          return;
        }
        const nextIndex = currentIndex + 1;
        if (nextIndex < phaseParticipants.length) {
          setRoundEffect(null);
          updateScene((s) => ({ ...s, activeId: phaseParticipants[nextIndex].id }));
          return;
        }
        if (blocked.length) return;
        if (phaseSuivanteDisponible(scene)) {
          setRoundEffect(null);
          updateScene((s) => {
            const phase = (s.phase || 1) + 1;
            const nextParticipants = participantsPhase({ ...s, phase });
            return { ...s, phase, activeId: nextParticipants[0]?.id || '' };
          });
          return;
        }
        setRoundEffect('next');
        updateScene((s) => {
          const nextScene = appliquerNouveauRoundPhases(s);
          setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
          return nextScene;
        });
        return;
      }

      const participants = scene.participants;
      if (!participants.length) return;

      const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
      const nextIndex = direction > 0
        ? (currentIndex + 1) % participants.length
        : (currentIndex - 1 + participants.length) % participants.length;

      if (direction < 0) {
        const roundDelta = currentIndex === 0 ? -1 : 0;
        setRoundEffect(null);
        updateScene((s) => ({
          ...s,
          activeId: s.participants[nextIndex].id,
          round: Math.max(1, s.round + roundDelta),
          globalTracker: roundDelta < 0 ? stepAutoGlobalTracker(s.globalTracker, -1) : s.globalTracker,
          participants: s.participants.map((p, i) => i === currentIndex ? untickParticipant(p) : p),
          reserve: roundDelta < 0 ? (s.reserve || []).map(untickParticipant).map(placerEnReserve) : (s.reserve || []).map(placerEnReserve),
        }));
        return;
      }

      if (blocked.length) return;

      const roundDelta = nextIndex === 0 && currentIndex !== 0 ? 1 : 0;

      setRoundEffect(roundDelta > 0 ? 'next' : null);
      updateScene((s) => {
        const nextScene = {
          ...s,
          activeId: s.participants[nextIndex].id,
          round: Math.max(1, s.round + roundDelta),
          globalTracker: roundDelta > 0 ? stepAutoGlobalTracker(s.globalTracker, 1) : s.globalTracker,
          participants: s.participants.map((p, i) => i === nextIndex ? tickParticipant(p) : p),
          reserve: roundDelta > 0 ? (s.reserve || []).map(tickParticipant).map(placerEnReserve) : (s.reserve || []).map(placerEnReserve),
        };

        if (roundDelta > 0) setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
        return nextScene;
      });
    },
    leaveInit(id) {
      const participant = scene.participants.find((x) => x.id === id);
      if (!participant) return;

      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: s.participants.filter((x) => x.id !== id),
        reserve: [...(s.reserve || []).map(placerEnReserve), placerEnReserve(participant)],
        activeId: s.activeId === id ? s.participants.find((x) => x.id !== id)?.id || '' : s.activeId,
        jouesSouples: retirerJoueSouple(s, id),
        historiqueSouple: retirerHistoriqueSouple(s, id),
      }));
    },
    joinInit(id, initiativeValue) {
      const participant = scene.reserve.find((x) => x.id === id);
      const initiative = Number(initiativeValue);
      if (!participant || !Number.isFinite(initiative)) return;

      updateScene((s) => {
        const participants = trierParInitiative([...s.participants, { ...participant, initiative }], optionsTri(s));
        return recalerActifPhaseSiBesoin({
          ...s,
          reserve: s.reserve.filter((x) => x.id !== id).map(placerEnReserve),
          participants,
          activeId: s.activeId || participant.id,
        });
      });
    },
    addParticipant(participant = createBlankParticipant(), placement = 'init') {
      if (placement === 'reserve') {
        updateScene((s) => ({ ...s, reserve: [...(s.reserve || []).map(placerEnReserve), placerEnReserve(participant)] }));
        return;
      }
      updateScene((s) => recalerActifPhaseSiBesoin({
        ...s,
        participants: trierParInitiative([...s.participants, participant], optionsTri(s)),
        activeId: s.activeId || participant.id,
        reserve: (s.reserve || []).map(placerEnReserve),
      }));
    },
  };
}
