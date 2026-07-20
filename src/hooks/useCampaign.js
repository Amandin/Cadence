import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createBlankScene, createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { createRestorePoint, pruneRestorePoints } from '../actions/sceneSupport.js';
import { STORAGE_KEY, defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { hasCompletedFirstRunOnboarding, markFirstRunOnboardingComplete, resetFirstRunOnboarding, shouldShowFirstRunOnboarding } from '../firstRunOnboarding.js';
import { normaliserCreneauxAction, trierParInitiative } from '../domain/initiative.js';
import { rulesAllowMultipleSlots } from '../domain/initiativeCost.js';
import { hasTriggeredClock, makeTestCampaign, nextTurnInfo } from '../logic.js';
import { addOnboardingTrackerTemplates } from '../onboardingTrackerTemplates.js';
import { createRulePresetSnapshot, rulePresetCatalog } from '../rulePresets.js';
import { initiativeProfileById, initiativeProfileStatuses, systemProfileById } from '../domain/systemProfiles.js';
import { enableQuickRollProfilesInState } from '../random-system/quickRollProfiles.js';
import { DEFAULT_CAMPAIGN_NAME, campaignNameFromPayload, campaignProfileFromPayload, campaignTemplatesFromPayload, createCampaignPayload, loadCampaign, normalizeCampaignPayload, normalizeCampaignScene, normalizeCampaignScenes, rulePresetSnapshotFromPayload, saveCampaign, serializeCampaign } from '../storage.js';
import { clearAllCadenceStorage, writeLocalCampaignPayload } from '../localCampaignStorage.js';
import { campaignEntryFromPayload, copiedCampaignNames, readCadenceFile, writeCadenceFile } from './campaignFilePersistence.js';
import { normalizeTemplateStore } from '../templates.js';
import { normalizeRandomSystemState } from '../random-system/state.js';
import { loadRandomSystemState } from '../random-system/storage.js';
import { t } from '../i18n/index.js';
import { clearThemePreference, devicePrefersDark, initialThemePreference, persistThemePreference, removeLegacyThemePreference, storedThemePreference, themeModeFromPreference, themePreferenceModes } from '../themePreference.js';

const SCENE_INDEX_STORAGE_KEY = 'cadence:interface:scene-index:v1';
const LOCAL_PERSISTENCE_DEBOUNCE_MS = 300;

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

function initiativeOptions(scene = {}) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
    multipleActionSlots: (participant) => rulesAllowMultipleSlots(scene, participant),
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
  const [campaignProfile, setCampaignProfile] = useState(() => campaignProfileFromPayload(initialCampaign));
  const [scenes, setScenes] = useState(() => normalizeScenesWithCampaignRules(initialCampaign.scenes, campaignRulesFromPayload(initialCampaign)));
  const [templateStore, setTemplateStore] = useState(() => campaignTemplatesFromPayload(initialCampaign));
  const [randomSystemState, setRandomSystemState] = useState(() => normalizeRandomSystemState(initialCampaign.randomSystem || loadRandomSystemState()));
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
  const [sceneIndex, setSceneIndex] = useState(initialSceneIndex);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [themePreference, setThemePreference] = useState(storedThemePreference);
  const [dark, setDark] = useState(() => initialThemePreference({ storedPreference: themePreference }));
  const [roundEffect, setRoundEffect] = useState(null);
  const [campaignEntries, setCampaignEntries] = useState(() => [initialEntry]);
  const [activeCampaignEntryId, setActiveCampaignEntryId] = useState(initialEntry.id);
  const [pendingFileChoice, setPendingFileChoice] = useState(null);
  const [fileSaveStatus, setFileSaveStatus] = useState(() => ({ mode: 'local', message: t('campaign.status.localActive') }));
  const campaignEntriesRef = useRef(campaignEntries);
  const activeCampaignEntryIdRef = useRef(activeCampaignEntryId);
  const fileHandlesRef = useRef(new Map());
  const lastPersistenceSignatureRef = useRef('');
  const lastPersistenceInputsRef = useRef(null);
  const fileSaveTimerRef = useRef(null);
  const fileSaveRevisionRef = useRef(0);
  const setManualTheme = useCallback((nextDark) => {
    const value = !!nextDark;
    setThemePreference(value);
    persistThemePreference(value);
    setDark(value);
  }, []);
  const setThemeMode = useCallback((mode) => {
    if (mode === themePreferenceModes.LIGHT) {
      setManualTheme(false);
      return;
    }
    if (mode === themePreferenceModes.DARK) {
      setManualTheme(true);
      return;
    }
    setThemePreference(null);
    clearThemePreference();
    setDark(devicePrefersDark());
  }, [setManualTheme]);

  const rawScene = useMemo(() => scenes[sceneIndex] || scenes[0] || createBlankScene(campaignRules), [campaignRules, sceneIndex, scenes]);
  const scene = useMemo(() => normalizeCampaignScene(applyInitiativeRules(rawScene, campaignRules)), [campaignRules, rawScene]);
  const syncedScenes = useMemo(() => normalizeScenesWithCampaignRules(scenes, campaignRules), [campaignRules, scenes]);
  const participants = scene.participants;
  const active = useMemo(() => participants.find((p) => p.id === scene.activeId), [participants, scene.activeId]);
  const blocked = useMemo(() => participants.filter(hasTriggeredClock), [participants]);
  const { nextStartsRound } = useMemo(() => nextTurnInfo(scene, blocked.length > 0), [blocked.length, scene]);
  const nextClass = blocked.length ? 'blocked' : nextStartsRound ? 'next-round' : '';

  useEffect(() => { campaignEntriesRef.current = campaignEntries; }, [campaignEntries]);
  useEffect(() => { activeCampaignEntryIdRef.current = activeCampaignEntryId; }, [activeCampaignEntryId]);
  useEffect(() => () => {
    if (fileSaveTimerRef.current) window.clearTimeout(fileSaveTimerRef.current);
  }, []);
  useEffect(() => {
    try {
      window.sessionStorage.setItem(SCENE_INDEX_STORAGE_KEY, String(sceneIndex));
    } catch {
      // La scene courante reste utilisable si le stockage de session est indisponible.
    }
  }, [sceneIndex]);

  useEffect(() => {
    if (!persistenceEnabled) return undefined;
    const inputs = { syncedScenes, campaignName, templateStore, campaignRules, campaignProfile, rulePresetSnapshot, randomSystemState, activeCampaignEntryId };
    const previousInputs = lastPersistenceInputsRef.current;
    const unchanged = previousInputs
      && previousInputs.syncedScenes === syncedScenes
      && previousInputs.campaignName === campaignName
      && previousInputs.templateStore === templateStore
      && previousInputs.campaignRules === campaignRules
      && previousInputs.campaignProfile === campaignProfile
      && previousInputs.rulePresetSnapshot === rulePresetSnapshot
      && previousInputs.randomSystemState === randomSystemState
      && previousInputs.activeCampaignEntryId === activeCampaignEntryId;
    if (!previousInputs || unchanged) {
      lastPersistenceInputsRef.current = inputs;
      return undefined;
    }
    lastPersistenceInputsRef.current = inputs;

    const timer = window.setTimeout(() => {
      const signature = JSON.stringify({ scenes: syncedScenes, dark, campaignName, templateStore, campaignRules, campaignProfile, rulePresetSnapshot, randomSystemState, activeCampaignEntryId });
      if (signature === lastPersistenceSignatureRef.current) return;
      lastPersistenceSignatureRef.current = signature;

      let activeEntry;
      let meta;
      let content;
      let snapshot;
      try {
        activeEntry = campaignEntriesRef.current.find((entry) => entry.id === activeCampaignEntryIdRef.current);
        meta = activeEntry ? { id: activeEntry.id, name: campaignName, fileName: activeEntry.fileName, folderName: activeEntry.folderName } : {};
        content = serializeCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, rulePresetSnapshot, meta, randomSystemState, campaignProfile);
        snapshot = JSON.parse(content);
      } catch (error) {
        setFileSaveStatus({ mode: 'error', message: t('campaign.status.localSaveError', { message: error?.message || t('app.notice.unknownError') }) });
        return;
      }
      const localSave = saveCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, rulePresetSnapshot, meta, randomSystemState, campaignProfile);
      if (!localSave?.ok) setFileSaveStatus({ mode: 'error', message: t('campaign.status.localSaveError', { message: localSave?.error?.message || t('app.notice.unknownError') }) });

      setCampaignEntries((entries) => entries.map((entry) => entry.id === activeCampaignEntryIdRef.current
        ? { ...entry, name: campaignName, fileName: snapshot.campaign.fileName, folderName: snapshot.campaign.folderName, updatedAt: snapshot.savedAt, snapshot }
        : entry));

      const handle = fileHandlesRef.current.get(activeCampaignEntryIdRef.current);
      if (!handle || !activeEntry?.autosave) return;
      const revision = ++fileSaveRevisionRef.current;
      if (fileSaveTimerRef.current) window.clearTimeout(fileSaveTimerRef.current);
      setFileSaveStatus({ mode: 'saving', message: t('campaign.status.saving', { fileName: activeEntry.fileName }) });
      fileSaveTimerRef.current = window.setTimeout(async () => {
        try {
          await writeCadenceFile(handle, content);
          if (revision !== fileSaveRevisionRef.current) return;
          setFileSaveStatus({ mode: 'saved', message: t('campaign.status.saved', { path: `${activeEntry.folderName}/${activeEntry.fileName}` }) });
        } catch (error) {
          if (revision !== fileSaveRevisionRef.current) return;
          setFileSaveStatus({ mode: 'error', message: t('campaign.status.saveError', { message: error?.message || t('campaign.error.permissionDenied') }) });
        }
      }, 650);
    }, LOCAL_PERSISTENCE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [syncedScenes, dark, campaignName, templateStore, campaignRules, campaignProfile, rulePresetSnapshot, randomSystemState, activeCampaignEntryId, persistenceEnabled]);

  useEffect(() => {
    if (!persistenceEnabled) return undefined;
    const saveBeforeLeaving = () => {
      const activeEntry = campaignEntriesRef.current.find((entry) => entry.id === activeCampaignEntryIdRef.current);
      const meta = activeEntry ? { id: activeEntry.id, name: campaignName, fileName: activeEntry.fileName, folderName: activeEntry.folderName } : {};
      const result = saveCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, rulePresetSnapshot, meta, randomSystemState, campaignProfile);
      if (!result?.ok) setFileSaveStatus({ mode: 'error', message: t('campaign.status.localSaveError', { message: result?.error?.message || t('app.notice.unknownError') }) });
    };
    window.addEventListener('pagehide', saveBeforeLeaving);
    return () => window.removeEventListener('pagehide', saveBeforeLeaving);
  }, [syncedScenes, dark, campaignName, templateStore, campaignRules, campaignProfile, rulePresetSnapshot, randomSystemState, activeCampaignEntryId, persistenceEnabled]);

  useEffect(() => { removeLegacyThemePreference(); }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    if (themePreference !== null) return undefined;
    setDark(mediaQuery.matches);
    const updateTheme = (event) => setDark(event.matches);
    mediaQuery.addEventListener?.('change', updateTheme);
    return () => mediaQuery.removeEventListener?.('change', updateTheme);
  }, [themePreference]);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes: syncedScenes, campaignRules, campaignProfile, rulePresetSnapshot, setCampaignRules, setCampaignProfile, setRulePresetSnapshot, sceneIndex, dark, campaignName, templateStore, randomSystemState, setScenes, setSceneIndex, setDark: setManualTheme, setCampaignNameState: setCampaignName, setTemplateStore, setRandomSystemState }), [campaignName, campaignRules, campaignProfile, rulePresetSnapshot, dark, sceneIndex, setManualTheme, syncedScenes, templateStore, randomSystemState]);

  const loadCampaignIntoState = (payload) => {
    const campaign = normalizeCampaignPayload(payload);
    setCampaignRules(campaign.initiativeRules);
    setCampaignProfile(campaign.campaignProfile);
    setRulePresetSnapshot(campaign.rulePresetSnapshot || null);
    setScenes(campaign.scenes);
    setCampaignName(campaignNameFromPayload(campaign));
    setTemplateStore(campaignTemplatesFromPayload(campaign));
    setRandomSystemState(normalizeRandomSystemState(campaign.randomSystem));
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
    randomSystemState,
    campaignProfile,
  );

  const persistOnboardingCampaign = (snapshot) => {
    const result = writeLocalCampaignPayload(STORAGE_KEY, snapshot);
    if (!result.ok) {
      setFileSaveStatus({ mode: 'error', message: t('campaign.status.localSaveError', { message: result.error?.message || t('app.notice.unknownError') }) });
    }
    return result;
  };

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
        setFileSaveStatus({ mode: 'choice', message: options.handle ? t('campaign.status.choiceOriginal') : t('campaign.status.choiceCopy') });
        return { ok: true, campaign: result.campaign, needsFileChoice: true, canUseOriginal: !!options.handle };
      } catch (error) {
        return { ok: false, message: t('campaign.error.readFile', { message: error?.message || t('app.notice.unknownError') }) };
      }
    },
    async useLoadedCampaignFile() {
      const pending = pendingFileChoice;
      if (!pending?.handle) return { ok: false, message: t('campaign.error.originalUnavailable') };
      const entry = campaignEntriesRef.current.find((item) => item.id === pending.entryId);
      if (!entry) return { ok: false, message: t('campaign.error.missing') };
      fileHandlesRef.current.set(entry.id, pending.handle);
      setCampaignEntries((entries) => entries.map((item) => item.id === entry.id ? { ...item, autosave: true, source: 'fichier' } : item));
      setPendingFileChoice(null);
      const revision = ++fileSaveRevisionRef.current;
      try {
        await writeCadenceFile(pending.handle, campaignTextForEntry(entry));
        if (revision !== fileSaveRevisionRef.current) return { ok: true };
        setFileSaveStatus({ mode: 'saved', message: t('campaign.status.directActive', { path: `${entry.folderName}/${entry.fileName}` }) });
        return { ok: true };
      } catch (error) {
        if (revision !== fileSaveRevisionRef.current) return { ok: false, message: t('campaign.error.writeFailed') };
        setFileSaveStatus({ mode: 'error', message: t('campaign.status.saveError', { message: error?.message || t('campaign.error.permissionDenied') }) });
        return { ok: false, message: t('campaign.error.writeFailed') };
      }
    },
    async saveLoadedCampaignAsCopy() {
      const { copyName, folderName, fileName } = copiedCampaignNames(campaignName);
      try {
        if (!window.showSaveFilePicker) return { ok: false, message: t('campaign.error.copyUnsupported') };
        const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Campagne Cadence', accept: { 'application/json': ['.cad'] } }] });
        const entry = { id: folderName, name: copyName, fileName, folderName, source: 'copie', autosave: true, updatedAt: new Date().toISOString(), snapshot: JSON.parse(campaignTextForEntry({ id: folderName, fileName, folderName }, copyName)) };
        fileHandlesRef.current.set(entry.id, handle);
        setCampaignEntries((entries) => [entry, ...entries.filter((item) => item.id !== entry.id)]);
        setActiveCampaignEntryId(entry.id);
        setCampaignName(copyName);
        setPendingFileChoice(null);
        const revision = ++fileSaveRevisionRef.current;
        await writeCadenceFile(handle, campaignTextForEntry(entry, copyName));
        if (revision !== fileSaveRevisionRef.current) return { ok: true };
        setFileSaveStatus({ mode: 'saved', message: t('campaign.status.copyLinked', { path: `${entry.folderName}/${entry.fileName}` }) });
        return { ok: true };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, cancelled: true };
        return { ok: false, message: t('campaign.error.copyFailed', { message: error?.message || t('app.notice.unknownError') }) };
      }
    },
    dismissLoadedCampaignChoice() {
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: t('campaign.status.loadedNoLinkedFile') });
    },
    startFirstRunCampaign(preset, profileSelection = {}, campaignOptions = {}) {
      if (!preset?.rules) return { ok: false, message: t('campaign.error.presetMissing') };
      const nextRules = normalizeCampaignRules(preset.rules);
      const blankScene = createBlankScene(nextRules);
      const nextTemplateStore = addOnboardingTrackerTemplates(templateStore, preset);
      const nextRandomSystem = campaignOptions.randomSystem && typeof campaignOptions.randomSystem === 'object'
        ? normalizeRandomSystemState(campaignOptions.randomSystem)
        : enableQuickRollProfilesInState(normalizeRandomSystemState(null), profileSelection.randomQuickRollProfileIds);
      const snapshot = createCampaignPayload([blankScene], dark, DEFAULT_CAMPAIGN_NAME, nextTemplateStore, nextRules, createRulePresetSnapshot(preset, nextRules, profileSelection), {}, nextRandomSystem, profileSelection);
      const entry = campaignEntryFromPayload(snapshot, { source: 'local' });
      const localSave = persistOnboardingCampaign(snapshot);
      setCampaignRules(nextRules);
      setCampaignProfile(snapshot.campaignProfile);
      setRulePresetSnapshot(snapshot.rulePresetSnapshot || null);
      setScenes([blankScene]);
      setTemplateStore(nextTemplateStore);
      setRandomSystemState(nextRandomSystem);
      setCampaignName(DEFAULT_CAMPAIGN_NAME);
      setSceneIndex(0);
      setRestorePoints(initialRestorePoints([blankScene]));
      setCampaignEntries([entry]);
      setActiveCampaignEntryId(entry.id);
      setPendingFileChoice(null);
      if (localSave.ok) setFileSaveStatus({ mode: 'local', message: t('campaign.status.localActive') });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      if (localSave.ok && !hasCompletedFirstRunOnboarding()) markFirstRunOnboardingComplete();
      setFirstRunOnboardingNeeded(false);
      setPersistenceEnabled(true);
      return { ok: true };
    },
    startFirstRunProfile({ systemProfileId, editionId = '', initiativeProfileId, randomQuickRollProfileIds = [] } = {}) {
      const systemProfile = systemProfileById(systemProfileId);
      const initiativeProfile = initiativeProfileById(initiativeProfileId);
      if (!systemProfile || !initiativeProfile || initiativeProfile.status !== initiativeProfileStatuses.AVAILABLE || !initiativeProfile.rulePresetId) {
        return { ok: false, message: t('campaign.error.presetMissing') };
      }
      const preset = rulePresetCatalog.find((item) => item.catalogId === initiativeProfile.rulePresetId);
      if (!preset) return { ok: false, message: t('campaign.error.presetMissing') };
      return this.startFirstRunCampaign(preset, { systemProfileId: systemProfile.id, editionId, initiativeProfileId: initiativeProfile.id, randomQuickRollProfileIds });
    },
    startFirstRunQuestionnaire({ rules, randomSystem } = {}) {
      if (!rules || typeof rules !== 'object') return { ok: false, message: t('campaign.error.presetMissing') };
      return this.startFirstRunCampaign({
        id: 'onboarding/questionnaire',
        catalogId: '',
        name: t('onboarding.question.summary.title'),
        family: 'personal',
        source: 'onboarding',
        rules,
      }, {}, { randomSystem });
    },
    startFirstRunCustomCampaign() {
      const nextRules = normalizeCampaignRules(campaignRules);
      const blankScene = createBlankScene(nextRules);
      const nextTemplateStore = addOnboardingTrackerTemplates(templateStore, null);
      const nextRandomSystem = normalizeRandomSystemState(null);
      const snapshot = createCampaignPayload([blankScene], dark, DEFAULT_CAMPAIGN_NAME, nextTemplateStore, nextRules, null, {}, nextRandomSystem, {});
      const entry = campaignEntryFromPayload(snapshot, { source: 'local' });
      const localSave = persistOnboardingCampaign(snapshot);
      setCampaignRules(nextRules);
      setCampaignProfile(snapshot.campaignProfile);
      setRulePresetSnapshot(null);
      setScenes([blankScene]);
      setTemplateStore(nextTemplateStore);
      setRandomSystemState(nextRandomSystem);
      setCampaignName(DEFAULT_CAMPAIGN_NAME);
      setSceneIndex(0);
      setRestorePoints(initialRestorePoints([blankScene]));
      setCampaignEntries([entry]);
      setActiveCampaignEntryId(entry.id);
      setPendingFileChoice(null);
      if (localSave.ok) setFileSaveStatus({ mode: 'local', message: t('campaign.status.localActive') });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      if (localSave.ok && !hasCompletedFirstRunOnboarding()) markFirstRunOnboardingComplete();
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
      setFileSaveStatus({ mode: 'local', message: t('campaign.status.testLoaded') });
      setRoundEffect(null);
      lastPersistenceSignatureRef.current = '';
      setFirstRunOnboardingNeeded(false);
      setPersistenceEnabled(true);
      return { ok: true, campaign: snapshot };
    },
    resetCadence() {
      fileHandlesRef.current.clear();
      fileSaveRevisionRef.current += 1;
      if (fileSaveTimerRef.current) window.clearTimeout(fileSaveTimerRef.current);
      clearAllCadenceStorage();
      resetFirstRunOnboarding();
      setCampaignRules(normalizeCampaignRules({}));
      setCampaignProfile({});
      setRulePresetSnapshot(null);
      setScenes([]);
      setSceneIndex(0);
      setRestorePoints({});
      setTemplateStore(normalizeTemplateStore(null));
      setRandomSystemState(normalizeRandomSystemState(null));
      setCampaignName(DEFAULT_CAMPAIGN_NAME);
      setCampaignEntries([]);
      setActiveCampaignEntryId('');
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: t('campaign.status.reset') });
      setFirstRunOnboardingNeeded(true);
      setPersistenceEnabled(false);
      lastPersistenceSignatureRef.current = '';
    },
  }), [campaignName, campaignRules, campaignProfile, dark, pendingFileChoice, syncedScenes, templateStore, randomSystemState]);

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
        const options = { ...initiativeOptions(s), multipleActionSlots: (participant) => rulesAllowMultipleSlots(s, participant) };
        const participantsAjustes = (s.participants || []).map((participant) => participant.id === participantId ? participantAvecInitiativeAjustee(participant, clean, slotId, options) : participant);
        return { ...s, participants: trierParInitiative(participantsAjustes, options) };
      }));
    },
  }), [sceneIndex]);

  const actions = useMemo(() => ({
    ...sceneActions,
    ...campaignActions,
    ...extraCampaignActions,
    ...extraSceneActions,
    setThemeMode,
    setRandomSystemState,
  }), [campaignActions, extraCampaignActions, extraSceneActions, sceneActions, setThemeMode]);

  return {
    scenes: syncedScenes,
    campaignRules,
    campaignProfile,
    rulePresetSnapshot,
    templateStore,
    randomSystemState,
    setTemplateStore,
    campaignName,
    campaignEntries,
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
    themeState: { mode: themeModeFromPreference(themePreference), dark },
    actions,
  };
}
