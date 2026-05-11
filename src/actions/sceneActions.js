import { newTracker, tickParticipant, uid } from '../logic.js';

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

export function createSceneActions({ scene, sceneIndex, blocked, setScenes, setRoundEffect }) {
  const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
  const updateParticipant = (id, updater) => updateScene((s) => ({ ...s, participants: s.participants.map((p) => p.id === id ? updater(p) : p) }));

  return {
    updateParticipant,
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
      if (direction > 0 && blocked.length) return;
      const participants = scene.participants;
      if (!participants.length) return;

      const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
      const nextIndex = (currentIndex + direction + participants.length) % participants.length;
      const roundDelta = direction > 0 && nextIndex === 0 && currentIndex !== 0 ? 1 : direction < 0 && currentIndex === 0 ? -1 : 0;

      setRoundEffect(roundDelta > 0 ? 'next' : null);
      updateScene((s) => ({
        ...s,
        activeId: s.participants[nextIndex].id,
        round: Math.max(1, s.round + roundDelta),
        participants: direction > 0 ? s.participants.map((p, i) => i === nextIndex ? tickParticipant(p) : p) : s.participants,
      }));
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
