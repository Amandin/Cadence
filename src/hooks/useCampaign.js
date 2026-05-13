import { useEffect, useMemo, useState } from 'react';
import { createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { clone, hasTriggeredClock, nextTurnInfo, uid } from '../logic.js';
import { loadCampaign, saveCampaign } from '../storage.js';

function normalizeScene(scene) {
  return {
    id: scene?.id || 'scene-secours',
    title: scene?.title || 'Scène',
    type: scene?.type || 'Scène',
    round: scene?.round || 1,
    activeId: scene?.activeId || '',
    notes: scene?.notes || '',
    reserveNotes: scene?.reserveNotes || '',
    globalTracker: normalizeGlobalTracker(scene?.globalTracker),
    reserve: Array.isArray(scene?.reserve) ? scene.reserve : [],
    participants: Array.isArray(scene?.participants) ? scene.participants : [],
  };
}

function initialRestorePoints(scenes) {
  return Object.fromEntries((scenes || []).map((rawScene) => {
    const scene = normalizeScene(rawScene);
    return [scene.id, [{ id: uid('restore'), round: scene.round || 1, activeId: scene.activeId, title: `Début R${scene.round || 1}`, scene: clone(scene) }]];
  }));
}

export function useCampaign() {
  const [initialCampaign] = useState(loadCampaign);
  const [scenes, setScenes] = useState(initialCampaign.scenes);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [dark, setDark] = useState(initialCampaign.settings?.dark || false);
  const [roundEffect, setRoundEffect] = useState(null);

  const rawScene = scenes[sceneIndex] || scenes[0];
  const scene = normalizeScene(rawScene);
  const participants = scene.participants;
  const active = participants.find((p) => p.id === scene.activeId);
  const blocked = [...participants, ...(scene.reserve || [])].filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => saveCampaign(scenes, dark), [scenes, dark]);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes, dark, setScenes, setSceneIndex, setDark }), [dark, scenes]);

  const extraSceneActions = useMemo(() => ({
    updateSceneField(key, value) {
      setScenes((list) => list.map((s, i) => i === sceneIndex ? { ...s, [key]: value } : s));
    },
    updateGlobalTracker(patch) {
      setScenes((list) => list.map((s, i) => i === sceneIndex ? { ...s, globalTracker: normalizeGlobalTracker({ ...(s.globalTracker || {}), ...patch }) } : s));
    },
    stepGlobal(delta) {
      setScenes((list) => list.map((s, i) => i === sceneIndex ? { ...s, globalTracker: stepGlobalTracker(s.globalTracker, delta) } : s));
    },
  }), [sceneIndex]);

  return {
    scenes,
    scene,
    sceneIndex,
    restorePoints: restorePoints[scene.id] || [],
    dark,
    active,
    blocked,
    nextStartsRound,
    nextClass,
    roundEffect,
    actions: {
      ...sceneActions,
      ...campaignActions,
      ...extraSceneActions,
    },
  };
}
