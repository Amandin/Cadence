import { useEffect, useMemo, useState } from 'react';
import { createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { clone, hasTriggeredClock, nextTurnInfo, uid } from '../logic.js';
import { campaignNameFromPayload, loadCampaign, saveCampaign } from '../storage.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultPhaseDecrement, defaultPhaseRerollEachRound, defaultTemporalityMode, legacyParticipantKinds } from '../constants.js';

function normalizeKind(kind) {
  return legacyParticipantKinds[kind] || kind;
}

function normalizeParticipant(participant) {
  return {
    ...participant,
    kind: normalizeKind(participant?.kind || 'Environnement'),
  };
}

function normalizeReserveParticipant(participant) {
  return {
    ...normalizeParticipant(participant),
    initiative: 0,
  };
}

function normalizeScene(scene) {
  return {
    id: scene?.id || 'scene-secours',
    title: scene?.title || 'Scène',
    type: scene?.type || 'Scène',
    round: scene?.round || 1,
    phase: Math.max(1, Number(scene?.phase) || 1),
    phaseDecrement: Math.max(1, Number(scene?.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: scene?.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    activeId: scene?.activeId || '',
    notes: scene?.notes || '',
    reserveNotes: scene?.reserveNotes || '',
    temporalite: scene?.temporalite || defaultTemporalityMode,
    jouesSouples: Array.isArray(scene?.jouesSouples) ? scene.jouesSouples : [],
    historiqueSouple: Array.isArray(scene?.historiqueSouple) ? scene.historiqueSouple : [],
    equalityRule: scene?.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(scene?.categoryOrder) && scene.categoryOrder.length ? scene.categoryOrder : defaultCategoryOrder,
    globalTracker: normalizeGlobalTracker(scene?.globalTracker),
    reserve: Array.isArray(scene?.reserve) ? scene.reserve.map(normalizeReserveParticipant) : [],
    participants: Array.isArray(scene?.participants) ? scene.participants.map(normalizeParticipant) : [],
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
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
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

  useEffect(() => saveCampaign(scenes, dark, campaignName), [scenes, dark, campaignName]);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes, dark, campaignName, setScenes, setSceneIndex, setDark, setCampaignNameState: setCampaignName }), [campaignName, dark, scenes]);

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
