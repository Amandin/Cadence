import { useEffect, useMemo, useState } from 'react';
import { loadCampaign, saveCampaign } from '../storage.js';
import { clone, hasTriggeredClock, nextTurnInfo, uid } from '../logic.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { createCampaignActions } from '../actions/campaignActions.js';

function normalizeScene(scene) {
  return {
    id: scene?.id || 'scene-secours',
    title: scene?.title || 'Scène',
    type: scene?.type || 'Scène',
    round: scene?.round || 1,
    activeId: scene?.activeId || '',
    notes: scene?.notes || '',
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
  const blocked = participants.filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => saveCampaign(scenes, dark), [scenes, dark]);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes, dark, setScenes, setSceneIndex, setDark }), [dark, scenes]);

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
    },
  };
}
