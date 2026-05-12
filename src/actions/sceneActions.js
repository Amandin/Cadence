import { clone, newTracker, tickParticipant, untickParticipant, uid } from '../logic.js';

function createBlankParticipant() {
  return {
    id: uid('p'),
    name: 'Nouveau personnage',
    kind: 'Allié',
    symbol: '🛡',
    color: 'emerald',
    initiative: 1,
    description: '',
    stats: [],
    statuses: [],
    trackers: [newTracker('bar')],
  };
}

function numberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function stepGlobalTracker(tracker, delta) {
  if (!tracker?.enabled || !tracker?.auto) return tracker;
  const next = Math.max(0, numberOr(tracker.current, 0) + delta);
  return { ...tracker, current: next };
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

function makeStatus(data) {
  const name = data?.name?.trim();
  if (!name) return null;

  const duration = data.duration == null ? null : Math.max(1, Number(data.duration));
  if (duration !== null && !Number.isFinite(duration)) return null;

  return {
    id: uid('s'),
    name,
    duration,
    remaining: duration,
    loop: duration !== null && !!data.loop,
    expired: false,
  };
}

export function createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }) {
  const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
  const updateParticipant = (id, updater) => updateScene((s) => ({ ...s, participants: s.participants.map((p) => p.id === id ? updater(p) : p) }));

  return {
    updateParticipant,
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
      const status = makeStatus(data);
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
          globalTracker: roundDelta < 0 ? stepGlobalTracker(s.globalTracker, -1) : s.globalTracker,
          participants: s.participants.map((p, i) => i === currentIndex ? untickParticipant(p) : p),
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
          globalTracker: roundDelta > 0 ? stepGlobalTracker(s.globalTracker, 1) : s.globalTracker,
          participants: s.participants.map((p, i) => i === nextIndex ? tickParticipant(p) : p),
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

      updateScene((s) => ({
        ...s,
        reserve: s.reserve.filter((x) => x.id !== id),
        participants: [...s.participants, { ...participant, initiative }],
        activeId: s.activeId || participant.id,
      }));
    },
    addParticipant() {
      const participant = createBlankParticipant();
      updateScene((s) => ({ ...s, participants: [...s.participants, participant], activeId: s.activeId || participant.id }));
    },
  };
}
