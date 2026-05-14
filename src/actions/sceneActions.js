import { defaultCategoryOrder, defaultEqualityRule, temporalityModes } from '../constants.js';
import { phaseSuivanteExiste, participantsPourPhase, trierParInitiative, valeurInitiative } from '../domain/initiative.js';
import { stepAutoGlobalTracker } from '../domain/globalTracker.js';
import { createStatus } from '../domain/statuses.js';
import { clone, newTracker, tickParticipant, untickParticipant, uid } from '../logic.js';

function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    departage: '',
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

function createRestorePoint(scene) {
  return {
    id: uid('restore'),
    round: scene.round,
    activeId: scene.activeId,
    title: `Début R${scene.round}`,
    scene: clone(scene),
  };
}

function addRestorePoint(points, sceneId, nextScene) {
  const current = points[sceneId] || [];
  if (current.some((point) => point.round === nextScene.round)) return points;
  return { ...points, [sceneId]: [...current, createRestorePoint(nextScene)].slice(-50) };
}

function optionsTri(scene) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
  };
}

function estModeSouple(scene) {
  return scene.temporalite === temporalityModes.FLEXIBLE;
}

function estModePhases(scene) {
  return scene.temporalite === temporalityModes.PHASES;
}

function toutLeMondeAJoueSouple(scene) {
  const idsJoues = new Set(scene.jouesSouples || []);
  return (scene.participants || []).length > 0 && scene.participants.every((participant) => idsJoues.has(participant.id));
}

function trouverTourActifParInitiative(scene, participantsTries) {
  const actifAvant = scene.participants.find((participant) => participant.id === scene.activeId);
  if (!actifAvant) return { activeId: scene.activeId, nouveauRound: false };

  const initiativeActive = valeurInitiative(actifAvant);
  const actifMemeOuPlusBas = participantsTries.find((participant) => valeurInitiative(participant) <= initiativeActive);
  if (actifMemeOuPlusBas) return { activeId: actifMemeOuPlusBas.id, nouveauRound: false };

  return { activeId: participantsTries[0]?.id || scene.activeId, nouveauRound: participantsTries.length > 0 };
}

function participantsPhase(scene, phase = scene.phase || 1) {
  return participantsPourPhase(scene.participants || [], phase, scene.phaseDecrement || 10, optionsTri(scene));
}

function premierParticipantPhase(scene) {
  return participantsPhase(scene)[0]?.id || '';
}

function appliquerDebutNouveauRound(scene, activeId) {
  return {
    ...scene,
    activeId,
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: scene.participants.map((participant) => participant.id === activeId ? tickParticipant(participant) : participant),
    reserve: (scene.reserve || []).map(tickParticipant),
  };
}

function appliquerNouveauRoundSouple(scene) {
  return {
    ...scene,
    activeId: '',
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: (scene.participants || []).map(tickParticipant),
    reserve: (scene.reserve || []).map(tickParticipant),
    jouesSouples: [],
    historiqueSouple: [],
  };
}

function appliquerNouveauRoundPhases(scene) {
  const sceneSuivante = {
    ...scene,
    activeId: '',
    phase: 1,
    round: Math.max(1, scene.round + 1),
    globalTracker: stepAutoGlobalTracker(scene.globalTracker, 1),
    participants: (scene.participants || []).map(tickParticipant),
    reserve: (scene.reserve || []).map(tickParticipant),
  };

  return scene.phaseRerollEachRound
    ? sceneSuivante
    : { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) };
}

function modifierParticipantDansScene(scene, participantId, updater) {
  const participants = trierParInitiative(scene.participants.map((p) => p.id === participantId ? updater(p) : p), optionsTri(scene));
  const { activeId, nouveauRound } = estModeSouple(scene) || estModePhases(scene)
    ? { activeId: scene.activeId, nouveauRound: false }
    : trouverTourActifParInitiative(scene, participants);
  const sceneSuivante = {
    ...scene,
    participants,
    activeId,
    reserve: (scene.reserve || []).map((p) => p.id === participantId ? updater(p) : p),
  };

  return nouveauRound ? appliquerDebutNouveauRound(sceneSuivante, activeId) : sceneSuivante;
}

function ajouterJoueSouple(scene, participantId) {
  const actuel = scene.jouesSouples || [];
  return actuel.includes(participantId) ? actuel : [...actuel, participantId];
}

function retirerJoueSouple(scene, participantId) {
  return (scene.jouesSouples || []).filter((id) => id !== participantId);
}

function retirerHistoriqueSouple(scene, participantId) {
  return (scene.historiqueSouple || []).filter((id) => id !== participantId);
}

function annulerDernierJoueSouple(scene) {
  const historique = scene.historiqueSouple || [];
  const dernier = historique.at(-1);
  if (!dernier) return scene;
  return {
    ...scene,
    activeId: dernier,
    historiqueSouple: historique.slice(0, -1),
    jouesSouples: retirerJoueSouple(scene, dernier),
  };
}

function valeurInitiativeRenseignee(valuesById, participantId) {
  const raw = valuesById?.[participantId];
  if (raw === '' || raw == null) return null;
  const initiative = Number(raw);
  return Number.isFinite(initiative) ? initiative : null;
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
      updateScene((s) => {
        const sceneSuivante = {
          ...s,
          temporalite,
          phase: temporalite === temporalityModes.PHASES ? (s.phase || 1) : 1,
          activeId: temporalite === temporalityModes.FLEXIBLE ? '' : s.activeId,
          jouesSouples: temporalite === temporalityModes.FLEXIBLE ? (s.jouesSouples || []) : [],
          historiqueSouple: temporalite === temporalityModes.FLEXIBLE ? (s.historiqueSouple || []) : [],
        };
        return temporalite === temporalityModes.PHASES && !participantsPhase(sceneSuivante).some((participant) => participant.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
      });
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
          if (initiative == null) return [participant];
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
        const sortants = (s.participants || []).filter((participant) => idsSet.has(participant.id));
        const participants = (s.participants || []).filter((participant) => !idsSet.has(participant.id));
        const sceneSuivante = {
          ...s,
          participants,
          reserve: [...(s.reserve || []), ...sortants],
          activeId: idsSet.has(s.activeId) ? participants[0]?.id || '' : s.activeId,
          jouesSouples: (s.jouesSouples || []).filter((id) => !idsSet.has(id)),
          historiqueSouple: (s.historiqueSouple || []).filter((id) => !idsSet.has(id)),
        };
        return estModePhases(sceneSuivante) && !participantsPhase(sceneSuivante).some((participant) => participant.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
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
      updateScene((s) => {
        const participants = s.participants.filter((p) => p.id !== id);
        const reserve = (s.reserve || []).filter((p) => p.id !== id);
        const sceneSuivante = {
          ...s,
          participants,
          reserve,
          activeId: s.activeId === id ? participants[0]?.id || '' : s.activeId,
          jouesSouples: retirerJoueSouple(s, id),
          historiqueSouple: retirerHistoriqueSouple(s, id),
        };
        return estModePhases(sceneSuivante) && !participantsPhase(sceneSuivante).some((participant) => participant.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
      });
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
        if (phaseSuivanteExiste(scene.participants, scene.phase || 1, scene.phaseDecrement || 10)) {
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
          reserve: roundDelta < 0 ? (s.reserve || []).map(untickParticipant) : (s.reserve || []),
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
          reserve: roundDelta > 0 ? (s.reserve || []).map(tickParticipant) : (s.reserve || []),
        };

        if (roundDelta > 0) setRestorePoints((points) => addRestorePoint(points, s.id, nextScene));
        return nextScene;
      });
    },
    leaveInit(id) {
      const participant = scene.participants.find((x) => x.id === id);
      if (!participant) return;

      updateScene((s) => {
        const sceneSuivante = {
          ...s,
          participants: s.participants.filter((x) => x.id !== id),
          reserve: [...(s.reserve || []), participant],
          activeId: s.activeId === id ? s.participants.find((x) => x.id !== id)?.id || '' : s.activeId,
          jouesSouples: retirerJoueSouple(s, id),
          historiqueSouple: retirerHistoriqueSouple(s, id),
        };
        return estModePhases(sceneSuivante) && !participantsPhase(sceneSuivante).some((item) => item.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
      });
    },
    joinInit(id, initiativeValue) {
      const participant = scene.reserve.find((x) => x.id === id);
      const initiative = Number(initiativeValue);
      if (!participant || !Number.isFinite(initiative)) return;

      updateScene((s) => {
        const participants = trierParInitiative([...s.participants, { ...participant, initiative }], optionsTri(s));
        const sceneSuivante = {
          ...s,
          reserve: s.reserve.filter((x) => x.id !== id),
          participants,
          activeId: s.activeId || participant.id,
        };
        return estModePhases(sceneSuivante) && !participantsPhase(sceneSuivante).some((item) => item.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
      });
    },
    addParticipant(participant = createBlankParticipant(), placement = 'init') {
      if (placement === 'reserve') {
        updateScene((s) => ({ ...s, reserve: [...(s.reserve || []), participant] }));
        return;
      }
      updateScene((s) => {
        const participants = trierParInitiative([...s.participants, participant], optionsTri(s));
        const sceneSuivante = { ...s, participants, activeId: s.activeId || participant.id };
        return estModePhases(sceneSuivante) && !participantsPhase(sceneSuivante).some((item) => item.id === sceneSuivante.activeId)
          ? { ...sceneSuivante, activeId: premierParticipantPhase(sceneSuivante) }
          : sceneSuivante;
      });
    },
  };
}
