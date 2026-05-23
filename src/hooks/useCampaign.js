import { useEffect, useMemo, useState } from 'react';
import { createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { normaliserCreneauxAction, trierParInitiative } from '../domain/initiative.js';
import { clone, hasTriggeredClock, nextTurnInfo, uid } from '../logic.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, loadCampaign, normalizeCampaignScene, normalizeCampaignScenes, saveCampaign } from '../storage.js';

function normalizeScenesWithCampaignRules(rawScenes, rules) {
  const normalizedScenes = normalizeCampaignScenes(rawScenes);
  return unifyCampaignScenes(normalizedScenes, rules);
}

function initialRestorePoints(scenes) {
  return Object.fromEntries((scenes || []).map((rawScene) => {
    const scene = normalizeCampaignScene(rawScene);
    const round = Math.max(1, scene.round || 1);
    return [scene.id, [{ id: uid('restore'), round, activeId: scene.activeId, title: `Début R${round}`, scene: clone({ ...scene, round }) }]];
  }));
}

function devicePrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function initiativeOptions(scene = {}) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
  };
}

function participantAvecInitiativeAjustee(participant, valeur, slotId, options) {
  const slots = normaliserCreneauxAction(participant, options);
  const targetIndex = Math.max(0, slots.findIndex((slot) => slot.actionSlotId === slotId || slot.id === slotId));
  const index = targetIndex >= 0 ? targetIndex : 0;
  const modifies = slots.map((slot, position) => position === index ? { ...slot, initiative: valeur, order: position } : { ...slot, order: position });
  const actionSlots = normaliserCreneauxAction({ ...participant, initiative: modifies[0]?.initiative ?? valeur, actionSlots: modifies }, options);
  return { ...participant, initiative: actionSlots[0]?.initiative ?? valeur, actionSlots };
}

export function useCampaign() {
  const [initialCampaign] = useState(loadCampaign);
  const [campaignRules, setCampaignRules] = useState(() => normalizeCampaignRules(campaignRulesFromPayload(initialCampaign)));
  const [scenes, setScenes] = useState(() => normalizeScenesWithCampaignRules(initialCampaign.scenes, campaignRulesFromPayload(initialCampaign)));
  const [templateStore, setTemplateStore] = useState(() => campaignTemplatesFromPayload(initialCampaign));
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
  const [sceneIndex, setSceneIndex] = useState(0);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [dark, setDark] = useState(devicePrefersDark);
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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event) => setDark(event.matches);
    mediaQuery.addEventListener?.('change', updateTheme);
    return () => mediaQuery.removeEventListener?.('change', updateTheme);
  }, []);

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
    adjustParticipantInitiative(participantId, valeur, slotId) {
      const clean = String(valeur ?? '').trim();
      if (!clean) return;
      setScenes((list) => list.map((s, i) => {
        if (i !== sceneIndex) return s;
        const options = initiativeOptions(s);
        const participantsAjustes = (s.participants || []).map((participant) => participant.id === participantId ? participantAvecInitiativeAjustee(participant, clean, slotId, options) : participant);
        return { ...s, participants: trierParInitiative(participantsAjustes, options) };
      }));
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