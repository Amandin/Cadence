import { useEffect, useMemo, useState } from 'react';
import { isValidCampaign, loadCampaign, saveCampaign, serializeCampaign } from '../storage.js';
import { hasTriggeredClock, makeDefaultCampaign, newTracker, nextTurnInfo, tickParticipant, uid } from '../logic.js';

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

function createBlankScene() {
  return {
    id: uid('scene'),
    title: 'Nouvelle scène',
    type: 'Scène',
    round: 1,
    activeId: '',
    notes: '',
    reserve: [],
    participants: [],
  };
}

function promptStatus() {
  const name = prompt('Nom de l’état ?', 'Nouveau');
  if (!name) return null;

  const raw = prompt('Durée en tours ? Vide = infini', '');
  const duration = raw === '' ? null : Math.max(1, Number(raw));
  const loop = duration != null && confirm('Renouveler en boucle ?');

  return { id: uid('s'), name, duration, remaining: duration, loop, expired: false };
}

export function useCampaign() {
  const [initialCampaign] = useState(loadCampaign);
  const [scenes, setScenes] = useState(initialCampaign.scenes);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [dark, setDark] = useState(initialCampaign.settings?.dark || false);
  const [roundEffect, setRoundEffect] = useState(null);

  const scene = scenes[sceneIndex] || scenes[0];
  const active = scene.participants.find((p) => p.id === scene.activeId);
  const blocked = scene.participants.filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => saveCampaign(scenes, dark), [scenes, dark]);

  const actions = useMemo(() => {
    const updateScene = (updater) => setScenes((list) => list.map((s, i) => i === sceneIndex ? updater(s) : s));
    const updateParticipant = (id, updater) => updateScene((s) => ({ ...s, participants: s.participants.map((p) => p.id === id ? updater(p) : p) }));

    return {
      setSceneIndex,
      setDark,
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
      addStatus(pid) {
        const status = promptStatus();
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
      joinInit(id) {
        const participant = scene.reserve.find((x) => x.id === id);
        const initiative = Number(prompt('Initiative ?', participant?.initiative || 1));
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
      newScene() {
        setScenes((currentScenes) => [...currentScenes, createBlankScene()]);
        setSceneIndex(scenes.length);
      },
      exportCampaign() {
        const blob = new Blob([serializeCampaign(scenes, dark)], { type:'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'campagne-cadence.json';
        link.click();
        URL.revokeObjectURL(url);
      },
      async importCampaign(file) {
        try {
          const data = JSON.parse(await file.text());
          if (!isValidCampaign(data)) return alert('Fichier invalide');
          setScenes(data.scenes);
          setDark(data.settings?.dark || false);
          setSceneIndex(0);
        } catch {
          alert('Impossible de lire ce fichier JSON.');
        }
      },
      resetDemo() {
        const fresh = makeDefaultCampaign();
        setScenes(fresh.scenes);
        setSceneIndex(0);
      },
    };
  }, [blocked.length, dark, scene, sceneIndex, scenes]);

  return { scenes, scene, sceneIndex, dark, active, blocked, nextStartsRound, nextClass, roundEffect, actions };
}
