import { useEffect, useMemo, useState } from 'react';
import { loadCampaign, saveCampaign } from '../storage.js';
import { hasTriggeredClock, nextTurnInfo } from '../logic.js';
import { createSceneActions } from './sceneActions.js';
import { createCampaignActions } from './campaignActions.js';

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

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, setScenes, setRoundEffect }), [blocked, scene, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes, dark, setScenes, setSceneIndex, setDark }), [dark, scenes]);

  return {
    scenes,
    scene,
    sceneIndex,
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
