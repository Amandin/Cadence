import { useEffect, useMemo, useState } from 'react';
import { createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { clone, hasTriggeredClock, nextTurnInfo, uid } from '../logic.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, loadCampaign, normalizeCampaignScene, normalizeCampaignScenes, saveCampaign } from '../storage.js';

function normalizeScenesWithCampaignRules(rawScenes, rules) {
  const normalizedScenes = normalizeCampaignScenes(rawScenes);
  return unifyCampaignScenes(normalizedScenes, rules);
}

function initialRestorePoints(scenes) {
  return Object.fromEntries((scenes || []).map((rawScene) => {
    const scene = normalizeCampaignScene(rawScene);
    return [scene.id, [{ id: uid('restore'), round: scene.round || 1, activeId: scene.activeId, title: `Début R${scene.round || 1}`, scene: clone(scene) }]];
  }));
}

export function useCampaign() {
  const [initialCampaign] = useState(loadCampaign);
  const [campaignRules, setCampaignRules] = useState(() => normalizeCampaignRules(campaignRulesFromPayload(initialCampaign)));
  const [scenes, setScenes] = useState(() => normalizeScenesWithCampaignRules(initialCampaign.scenes, campaignRulesFromPayload(initialCampaign)));
  const [templateStore, setTemplateStore] = useState(() => campaignTemplatesFromPayload(initialCampaign));
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
  const [sceneIndex, setSceneIndex] = useState(0);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [dark, setDark] = useState(initialCampaign.settings?.dark || false);
  const [roundEffect, setRoundEffect] = useState(null);

  const rawScene = scenes[sceneIndex] || scenes[0];
  const scene = normalizeCampaignScene(applyInitiativeRules(rawScene, campaignRules));
  const syncedScenes = normalizeScenesWithCampaignRules(scenes, campaignRules);
  const participants = scene.participants;
  const active = participants.find((p) => p.id === scene.activeId);
  const blocked = [...participants, ...(scene.reserve || [])].filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => saveCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules), [syncedScenes, dark, campaignName, templateStore, campaignRules]);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes: syncedScenes, campaignRules, setCampaignRules, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState: setCampaignName, setTemplateStore }), [campaignName, campaignRules, dark, sceneIndex, syncedScenes, templateStore]);

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
    scenes: syncedScenes,
    campaignRules,
    templateStore,
    setTemplateStore,
    campaignName,
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
