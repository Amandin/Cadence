import { useEffect, useMemo, useRef, useState } from 'react';
import { createBlankScene, createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { createRestorePoint, pruneRestorePoints } from '../actions/sceneSupport.js';
import { STORAGE_KEY, defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { hasCompletedFirstRunOnboarding, markFirstRunOnboardingComplete, resetFirstRunOnboarding, shouldShowFirstRunOnboarding } from '../firstRunOnboarding.js';
import { normaliserCreneauxAction, trierParInitiative } from '../domain/initiative.js';
import { isManualMultipleActionMode, rulesAllowMultipleSlots } from '../domain/initiativeCost.js';
import { hasTriggeredClock, makeTestCampaign, nextTurnInfo } from '../logic.js';
import { createRulePresetSnapshot } from '../rulePresets.js';
import { DEFAULT_CAMPAIGN_NAME, campaignNameFromPayload, campaignTemplatesFromPayload, createCampaignPayload, loadCampaign, normalizeCampaignPayload, normalizeCampaignScene, normalizeCampaignScenes, rulePresetSnapshotFromPayload, saveCampaign, serializeCampaign } from '../storage.js';
import { removeLocalCampaignPayload } from '../localCampaignStorage.js';
import { campaignEntryFromPayload, copiedCampaignNames, readCadenceFile, scanCampaignDirectory, writeCadenceFile } from './campaignFilePersistence.js';

const SCENE_INDEX_STORAGE_KEY = 'cadence:interface:scene-index:v1';
const THEME_STORAGE_KEY = 'cadence:interface:dark:v1';

function initialSceneIndex() {
  try {
    const value = Number(window.sessionStorage.getItem(SCENE_INDEX_STORAGE_KEY));
    return Number.isInteger(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

function normalizeScenesWithCampaignRules(rawScenes, rules) {
  const normalizedScenes = normalizeCampaignScenes(rawScenes);
  return unifyCampaignScenes(normalizedScenes, rules);
}

function initialRestorePoints(scenes) {
  return Object.fromEntries((scenes || []).map((rawScene) => {
    const scene = normalizeCampaignScene(rawScene);
    return [scene.id, pruneRestorePoints([createRestorePoint(scene)])];
  }));
}

function devicePrefersDark() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
}

function storedThemePreference() {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (value === 'true') return true;
    if (value === 'false') return false;
  } catch {
    // La preference visuelle reste locale et optionnelle.
  }
  return null;
}

function initiativeOptions(scene = {}) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
    multipleActionSlots: rulesAllowMultipleSlots(scene),
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
  const [firstRunOnboardingNeeded, setFirstRunOnboardingNeeded] = useState(() => shouldShowFirstRunOnboarding());
  const [persistenceEnabled, setPersistenceEnabled] = useState(() => !shouldShowFirstRunOnboarding());
  const initialEntry = campaignEntryFromPayload(initialCampaign, { source: 'locale' });
  const [campaignRules, setCampaignRules] = useState(() => normalizeCampaignRules(campaignRulesFromPayload(initialCampaign)));
  const [rulePresetSnapshot, setRulePresetSnapshot] = useState(() => rulePresetSnapshotFromPayload(initialCampaign, campaignRulesFromPayload(initialCampaign)));
  const [scenes, setScenes] = useState(() => normalizeScenesWithCampaignRules(initialCampaign.scenes, campaignRulesFromPayload(initialCampaign)));
  const [templateStore, setTemplateStore] = useState(() => campaignTemplatesFromPayload(initialCampaign));
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
  const [sceneIndex, setSceneIndex] = useState(initialSceneIndex);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [dark, setDark] = useState(() => storedThemePreference() ?? devicePrefersDark());
  const [roundEffect, setRoundEffect] = useState(null);
  const [campaignEntries, setCampaignEntries] = useState(() => [initialEntry]);
  const [activeCampaignEntryId, setActiveCampaignEntryId] = useState(initialEntry.id);
  const [pendingFileChoice, setPendingFileChoice] = useState(null);
  const [fileSaveStatus, setFileSaveStatus] = useState(() => ({ mode: 'local', message: 'Sauvegarde locale active.' }));
  const campaignEntriesRef = useRef(campaignEntries);
  const activeCampaignEntryIdRef = useRef(activeCampaignEntryId);
  const fileHandlesRef = useRef(new Map());
  const campaignDirectoryHandleRef = useRef(null);
  const lastPersistenceSignatureRef = useRef('');

  const rawScene = scenes[sceneIndex] || scenes[0];
  const scene = normalizeCampaignScene(applyInitiativeRules(rawScene, campaignRules));
  const syncedScenes = normalizeScenesWithCampaignRules(scenes, campaignRules);
  const participants = scene.participants;
  const active = participants.find((p) => p.id === scene.activeId);
  const blocked = participants.filter(hasTriggeredClock);
  const { nextStartsRound } = nextTurnInfo(scene, blocked.length > 0);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => { campaignEntriesRef.current = campaignEntries; }, [campaignEntries]);
  useEffect(() => { activeCampaignEntryIdRef.current = activeCampaignEntryId; }, [activeCampaignEntryId]);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(SCENE_INDEX_STORAGE_KEY, String(sceneIndex));
    } catch {
      // La scene courante reste utilisable si le stockage de session est indisponible.
    }
  }, [sceneIndex]);

  useEffect(() => {
    if (!persistenceEnabled) return undefined;
    const signature = JSON.stringify({ scenes: syncedScenes, campaignName, templateStore, campaignRules, rulePresetSnapshot, activeCampaignEntryId });
    if (signature === lastPersistenceSignatureRef.current) return undefined;
    lastPersistenceSignatureRef.current = signature;

    const activeEntry = campaignEntriesRef.current.find((entry) => entry.id === activeCampaignEntryIdRef.current);
    const meta = activeEntry ? { id: activeEntry.id, name: campaignName, fileName: activeEntry.fileName, folderName: activeEntry.folderName } : {};
    const content = serializeCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, rulePresetSnapshot, meta);
    const snapshot = JSON.parse(content);
    saveCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, rulePresetSnapshot, meta);

    setCampaignEntries((entries) => entries.map((entry) => entry.id === activeCampaignEntryIdRef.current
      ? { ...entry, name: campaignName, fileName: snapshot.campaign.fileName, folderName: snapshot.campaign.folderName, updatedAt: snapshot.savedAt, snapshot }
      : entry));

    const handle = fileHandlesRef.current.get(activeCampaignEntryIdRef.current);
    if (!handle || !activeEntry?.autosave) return undefined;
    setFileSaveStatus({ mode: 'saving', message: `Enregistrement dans ${activeEntry.fileName}...` });
    const timer = window.setTimeout(async () => {
      try {
        await writeCadenceFile(handle, content);
        setFileSaveStatus({ mode: 'saved', message: `Enregistre dans ${activeEntry.folderName}/${activeEntry.fileName}.` });
      } catch (error) {
        setFileSaveStatus({ mode: 'error', message: `Enregistrement impossible : ${error?.message || 'permission refusee'}.` });
      }
    }, 650);
    return () => window.clearTimeout(timer);
  }, [syncedScenes, campaignName, templateStore, campaignRules, rulePresetSnapshot, activeCampaignEntryId, persistenceEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, String(!!dark));
    } catch {
      // Le theme reste utilisable meme sans stockage local.
    }
  }, [dark]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event) => setDark(event.matches);
    mediaQuery.addEventListener?.('change', updateTheme);
    return () => mediaQuery.removeEventListener?.('change', updateTheme);
  }, []);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes: syncedScenes, campaignRules, rulePresetSnapshot, setCampaignRules, setRulePresetSnapshot, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState: setCampaignName, setTemplateStore }), [campaignName, campaignRules, rulePresetSnapshot, dark, sceneIndex, syncedScenes, templateStore]);

  const loadCampaignIntoState = (payload) => {
    const campaign = normalizeCampaignPayload(payload);
    setCampaignRules(campaign.initiativeRules);
    setRulePresetSnapshot(campaign.rulePresetSnapshot || null);
    setScenes(campaign.scenes);
    setCampaignName(campaignNameFromPayload(campaign));
    setTemplateStore(campaignTemplatesFromPayload(campaign));
    setSceneIndex(0);
    setRestorePoints(initialRestorePoints(campaign.scenes));
    lastPersistenceSignatureRef.current = '';
    return campaign;
  };

  const campaignTextForEntry = (entry, name = campaignName) => serializeCampaign(
    syncedScenes,
    dark,
    name,
    templateStore,
    campaignRules,
    rulePresetSnapshot,
    entry ? { id: entry.id, name, fileName: entry.fileName, folderName: entry.folderName } : {},
  );

  const extraCampaignActions = useMemo(() => ({
    async importCampaign(file, options = {}) {
      try {
        const result = await readCadenceFile(file);
        if (!result.ok) return result;
        const folderName = options.folderName || result.campaign.campaign?.folderName || String(file?.name || '').replace(/\.cad$/i, '');
        const entry = campaignEntryFromPayload(result.campaign, {
          source: options.handle ? 'fichier' : 'import',
          fileName: file?.name || result.campaign.campaign?.fileName,
          folderName,
          autosave: false,
        });
        if (options.handle) fileHandlesRef.current.set(entry.id, options.handle);
        setCampaignEntries((entries) => [entry, ...entries.filter((item) => item.id !== entry.id)]);
        setActiveCampaignEntryId(entry.id);
        loadCampaignIntoState(result.campaign);
        setPendingFileChoice({
          entryId: entry.id,
          fileName: entry.fileName,
          folderName: entry.folderName,
          handle: options.handle || null,
          canUseOriginal: !!options.handle,
        });
        setFileSaveStatus({ mode: 'choice', message: options.handle ? 'Choisis si Cadence doit ecrire dans ce fichier ou dans une copie.' : 'Ce navigateur ne donne pas acces au fichier original. Cree une copie pour l’enregistrement direct.' });
        return { ok: true, campaign: result.campaign, needsFileChoice: true, canUseOriginal: !!options.handle };
      } catch (error) {
        return { ok: false, message: `Impossible de lire ce fichier Cadence. ${error?.message || 'Erreur inconnue.'}` };
      }
    },
    async importCampaignDirectory() {
      if (!window.showDirectoryPicker) return { ok: false, message: 'Ce navigateur ne permet pas encore de lier un dossier de campagnes.' };
      try {
        const directoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        campaignDirectoryHandleRef.current = directoryHandle;
        const files = await scanCampaignDirectory(directoryHandle);
        const loaded = [];
        for (const item of files) {
          try {
            const file = await item.handle.getFile();
            const result = await readCadenceFile(file);
            if (!result.ok) continue;
            const entry = campaignEntryFromPayload(result.campaign, {
              source: 'dossier',
              fileName: item.fileName,
              folderName: item.folderName,
              autosave: true,
            });
            fileHandlesRef.current.set(entry.id, item.handle);
            loaded.push(entry);
          } catch {
            // Un fichier invalide ne bloque pas les autres campagnes du dossier.
          }
        }
        if (!loaded.length) return { ok: false, message: 'Aucune campagne .cad v2 trouvée dans les sous-dossiers choisis.' };
        setCampaignEntries((entries) => [...loaded, ...entries.filter((entry) => !loaded.some((item) => item.id === entry.id))]);
        setActiveCampaignEntryId(loaded[0].id);
        loadCampaignIntoState(loaded[0].snapshot);
        setPendingFileChoice(null);
        setFileSaveStatus({ mode: 'saved', message: `${loaded.length} campagne(s) liee(s) au dossier. Enregistrement direct actif.` });
        return { ok: true, count: loaded.length };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, cancelled: true };
        return { ok: false, message: `Impossible d'ouvrir le dossier : ${error?.message || 'erreur inconnue'}.` };
      }
    },
    selectCampaignEntry(id) {
      const entry = campaignEntriesRef.current.find((item) => item.id === id);
      if (!entry) return { ok: false, message: 'Campagne introuvable.' };
      setActiveCampaignEntryId(entry.id);
      loadCampaignIntoState(entry.snapshot);
      setPendingFileChoice(null);
      const linked = entry.autosave && fileHandlesRef.current.has(entry.id);
      setFileSaveStatus(linked
        ? { mode: 'saved', message: `Enregistrement direct actif : ${entry.folderName}/${entry.fileName}.` }
        : { mode: 'local', message: 'Campagne chargee en memoire. Cree une copie pour lier un .cad.' });
      return { ok: true };
    },
    async useLoadedCampaignFile() {
      const pending = pendingFileChoice;
      if (!pending?.handle) return { ok: false, message: 'Le fichier original n’est pas accessible en écriture. Cree une copie.' };
      const entry = campaignEntriesRef.current.find((item) => item.id === pending.entryId);
      if (!entry) return { ok: false, message: 'Campagne introuvable.' };
      fileHandlesRef.current.set(entry.id, pending.handle);
      setCampaignEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, autosave: true, source: 'fichier' } : item));
      setPendingFileChoice(null);
      try {
        await writeCadenceFile(pending.handle, campaignTextForEntry(entry));
        setFileSaveStatus({ mode: 'saved', message: `Enregistrement direct actif : ${entry.folderName}/${entry.fileName}.` });
        return { ok: true };
      } catch (error) {
        setFileSaveStatus({ mode: 'error', message: `Enregistrement impossible : ${error?.message || 'permission refusee'}.` });
        return { ok: false, message: 'Cadence n’a pas pu écrire dans le fichier choisi.' };
      }
    },
    async saveLoadedCampaignAsCopy() {
      const { copyName, folderName, fileName } = copiedCampaignNames(campaignName);
      try {
        let handle = null;
        if (campaignDirectoryHandleRef.current) {
          const folder = await campaignDirectoryHandleRef.current.getDirectoryHandle(folderName, { create: true });
          handle = await folder.getFileHandle(fileName, { create: true });
        } else if (window.showSaveFilePicker) {
          handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Campagne Cadence', accept: { 'application/json': ['.cad'] } }] });
        } else {
          return { ok: false, message: 'Choisis un dossier de campagnes ou utilise un navigateur compatible pour créer la copie.' };
        }
        const entry = { id: folderName, name: copyName, fileName, folderName, source: 'copie', autosave: true, updatedAt: new Date().toISOString(), snapshot: JSON.parse(campaignTextForEntry({ id: folderName, fileName, folderName }, copyName)) };
        fileHandlesRef.current.set(entry.id, handle);
        setCampaignEntries((entries) => [entry, ...entries.filter((item) => item.id !== entry.id)]);
        setActiveCampaignEntryId(entry.id);
        setCampaignName(copyName);
        setPendingFileChoice(null);
        await writeCadenceFile(handle, campaignTextForEntry(entry, copyName));
        setFileSaveStatus({ mode: 'saved', message: `Copie liee : ${entry.folderName}/${entry.fileName}.` });
        return { ok: true };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, cancelled: true };
        return { ok: false, message: `Copie impossible : ${error?.message || 'erreur inconnue'}.` };
      }
    },
    dismissLoadedCampaignChoice() {
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Campagne chargee sans fichier lie.' });
    },
    startFirstRunCampaign(preset) {
      if (!preset?.rules) return { ok: false, message: 'Preset introuvable.' };
      const nextRules = normalizeCampaignRules(preset.rules);
      const blankScene = createBlankScene(nextRules);
      const snapshot = createCampaignPayload([blankScene], dark, DEFAULT_CAMPAIGN_NAME, templateStore, nextRules, createRulePresetSnapshot(preset, nextRules));
      const entry = campaignEntryFromPayload(snapshot, { source: 'local' });
      setCampaignRules(nextRules);
      setRulePresetSnapshot(snapshot.rulePresetSnapshot || null);
      setScenes([blankScene]);
      setCampaignName(DEFAULT_CAMPAIGN_NAME);
      setSceneIndex(0);
      setRestorePoints(initialRestorePoints([blankScene]));
      setCampaignEntries([entry]);
      setActiveCampaignEntryId(entry.id);
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Sauvegarde locale active.' });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      if (!hasCompletedFirstRunOnboarding()) markFirstRunOnboardingComplete();
      setFirstRunOnboardingNeeded(false);
      setPersistenceEnabled(true);
      return { ok: true };
    },
    startFirstRunCustomCampaign() {
      const nextRules = normalizeCampaignRules(campaignRules);
      const blankScene = createBlankScene(nextRules);
      const snapshot = createCampaignPayload([blankScene], dark, DEFAULT_CAMPAIGN_NAME, templateStore, nextRules, null);
      const entry = campaignEntryFromPayload(snapshot, { source: 'local' });
      setCampaignRules(nextRules);
      setRulePresetSnapshot(null);
      setScenes([blankScene]);
      setCampaignName(DEFAULT_CAMPAIGN_NAME);
      setSceneIndex(0);
      setRestorePoints(initialRestorePoints([blankScene]));
      setCampaignEntries([entry]);
      setActiveCampaignEntryId(entry.id);
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Sauvegarde locale active.' });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      if (!hasCompletedFirstRunOnboarding()) markFirstRunOnboardingComplete();
      setFirstRunOnboardingNeeded(false);
      setPersistenceEnabled(true);
      return { ok: true };
    },
    loadTestCampaign() {
      const snapshot = normalizeCampaignPayload(makeTestCampaign());
      const entry = campaignEntryFromPayload(snapshot, { source: 'local' });
      setCampaignEntries((entries) => [entry, ...entries.filter((item) => item.id !== entry.id)]);
      setActiveCampaignEntryId(entry.id);
      loadCampaignIntoState(snapshot);
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Campagne de test chargée en sauvegarde locale.' });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      setFirstRunOnboardingNeeded(false);
      setPersistenceEnabled(true);
      return { ok: true, campaign: snapshot };
    },
    resetCadence() {
      fileHandlesRef.current.clear();
      campaignDirectoryHandleRef.current = null;
      removeLocalCampaignPayload(STORAGE_KEY);
      resetFirstRunOnboarding();
      setCampaignEntries([]);
      setActiveCampaignEntryId('');
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Cadence a été réinitialisé.' });
      setFirstRunOnboardingNeeded(true);
      setPersistenceEnabled(false);
      lastPersistenceSignatureRef.current = '';
    },
  }), [campaignName, campaignRules, dark, pendingFileChoice, syncedScenes, templateStore]);

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
        const options = { ...initiativeOptions(s), multipleActionSlots: isManualMultipleActionMode(s) || rulesAllowMultipleSlots(s) };
        const participantsAjustes = (s.participants || []).map((participant) => participant.id === participantId ? participantAvecInitiativeAjustee(participant, clean, slotId, options) : participant);
        return { ...s, participants: trierParInitiative(participantsAjustes, options) };
      }));
    },
  }), [sceneIndex]);

  return {
    scenes: syncedScenes,
    campaignRules,
    rulePresetSnapshot,
    templateStore,
    setTemplateStore,
    campaignName,
    campaignEntries,
    activeCampaignEntryId,
    pendingFileChoice,
    fileSaveStatus,
    scene,
    sceneIndex,
    restorePoints: restorePoints[scene.id] || [],
    dark,
    active,
    blocked,
    nextStartsRound,
    nextClass,
    roundEffect,
    firstRunOnboardingNeeded,
    actions: {
      ...sceneActions,
      ...campaignActions,
      ...extraCampaignActions,
      ...extraSceneActions,
    },
  };
}
