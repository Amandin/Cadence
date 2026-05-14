import { defaultCategoryOrder, defaultEqualityRule } from '../constants.js';
import { trierParInitiative, valeurInitiative } from '../domain/initiative.js';
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

function trouverTourActifParInitiative(scene, participantsTries) {
  const actifAvant = scene.participants.find((participant) => participant.id === scene.activeId);
  if (!actifAvant) return { activeId: scene.activeId, nouveauRound: false };

  const initiativeActive = valeurInitiative(actifAvant);
  const actifMemeOuPlusBas = participantsTries.find((participant) => valeurInitiative(participant) <= initiativeActive);
  if (actifMemeOuPlusBas) return { activeId: actifMemeOuPlusBas.id, nouveauRound: false };

  return { activeId: participantsTries[0]?.id || scene.activeId, nouveauRound: participantsTries.length > 0 };
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

function modifierParticipantDansScene(scene, participantId, updater) {
  const participants = trierParInitiative(scene.participants.map((p) => p.id === participantId ? updater(p) : p), optionsTri(scene));
  const { activeId, nouveauRound } = trouverTourActifParInitiative(scene, participants);
  const sceneSuivante = {
    ...scene,
    participants,
    activeId,
    reserve: (scene.reserve || []).map((p) => p.id === participantId ? updater(p) : p),
  };

  return nouveauRound ? appliquerDebutNouveauRound(sceneSuivante, activeId) : sceneSuivante;
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
      updateScene((s) => ({ ...s, temporalite }));
    },
    setActiveParticipant(activeId) {
      updateScene((s) => ({ ...s, activeId }));
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
        const activeId = s.activeId === id ? participants[0]?.id || '' : s.activeId;
        return { ...s, participants, reserve, activeId };
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

      updateScene((s) => ({
        ...s,
        participants: s.participants.filter((x) => x.id !== id),
        reserve: [...(s.reserve || []), participant],
        activeId: s.activeId === id ? s.participants.find((x) => x.id !== id)?.id || '' : s.activeId,
      }));
    },
    joinInit(id, initiativeValue) {
      const participant = scene.reserve.find((x) => x.id === id);
      const initiative = Number(initiativeValue);
      if (!participant || !Number.isFinite(initiative)) return;

      updateScene((s) => {
        const participants = trierParInitiative([...s.participants, { ...participant, initiative }], optionsTri(s));
        return {
          ...s,
          reserve: s.reserve.filter((x) => x.id !== id),
          participants,
          activeId: s.activeId || participant.id,
        };
      });
    },
    addParticipant(participant = createBlankParticipant(), placement = 'init') {
      if (placement === 'reserve') {
        updateScene((s) => ({ ...s, reserve: [...(s.reserve || []), participant] }));
        return;
      }
      updateScene((s) => {
        const participants = trierParInitiative([...s.participants, participant], optionsTri(s));
        return { ...s, participants, activeId: s.activeId || participant.id };
      });
    },
  };
}
