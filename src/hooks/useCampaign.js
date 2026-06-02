import { useEffect, useMemo, useRef, useState } from 'react';
import { createCampaignActions } from '../actions/campaignActions.js';
import { createSceneActions } from '../actions/sceneActions.js';
import { createRestorePoint, pruneRestorePoints } from '../actions/sceneSupport.js';
import { defaultCategoryOrder, defaultEqualityRule, defaultInitiativeOrder } from '../constants.js';
import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { normalizeGlobalTracker, stepGlobalTracker } from '../domain/globalTracker.js';
import { normaliserCreneauxAction, trierParInitiative } from '../domain/initiative.js';
import { hasTriggeredClock, makeDemoCampaigns, nextTurnInfo } from '../logic.js';
import { campaignMetaFromPayload, campaignNameFromPayload, campaignTemplatesFromPayload, isValidCampaign, loadCampaign, normalizeCampaignPayload, normalizeCampaignScene, normalizeCampaignScenes, saveCampaign, serializeCampaign } from '../storage.js';

const SCENE_INDEX_STORAGE_KEY = 'cadence:interface:scene-index:v1';

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

function slugifyCampaignPart(value) {
  return String(value || 'campagne-cadence')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'campagne-cadence';
}

function campaignEntryFromPayload(payload, options = {}) {
  const campaign = normalizeCampaignPayload(payload);
  const meta = campaignMetaFromPayload(campaign);
  return {
    id: options.id || meta.id,
    name: options.name || meta.name,
    fileName: options.fileName || meta.fileName,
    folderName: options.folderName || meta.folderName,
    source: options.source || 'memoire',
    autosave: !!options.autosave,
    updatedAt: new Date().toISOString(),
    snapshot: campaign,
  };
}

function demoCampaignEntries() {
  return makeDemoCampaigns().map((campaign) => campaignEntryFromPayload(campaign, { source: 'demo' }));
}

async function readCadenceFile(file) {
  const raw = await file.text();
  const data = JSON.parse(raw.replace(/^\uFEFF/, '').trim());
  if (!isValidCampaign(data)) {
    return { ok: false, message: `Le fichier choisi n'est pas une campagne Cadence v2 valide. Fichier : ${file?.name || 'sans nom'}.` };
  }
  return { ok: true, campaign: normalizeCampaignPayload(data) };
}

async function ensureWritePermission(handle) {
  if (!handle?.queryPermission || !handle?.requestPermission) return true;
  const current = await handle.queryPermission({ mode: 'readwrite' });
  if (current === 'granted') return true;
  return await handle.requestPermission({ mode: 'readwrite' }) === 'granted';
}

async function writeCadenceFile(handle, content) {
  if (!handle) return false;
  if (!await ensureWritePermission(handle)) return false;
  const writable = await handle.createWritable();
  await writable.write(new Blob([content], { type: 'application/json;charset=utf-8' }));
  await writable.close();
  return true;
}

async function scanCampaignDirectory(directoryHandle) {
  const found = [];
  for await (const [name, handle] of directoryHandle.entries()) {
    if (handle.kind === 'directory') {
      for await (const [fileName, fileHandle] of handle.entries()) {
        if (fileHandle.kind === 'file' && fileName.toLowerCase().endsWith('.cad')) {
          found.push({ folderName: name, fileName, handle: fileHandle });
          break;
        }
      }
    } else if (handle.kind === 'file' && name.toLowerCase().endsWith('.cad')) {
      found.push({ folderName: name.replace(/\.cad$/i, ''), fileName: name, handle });
    }
  }
  return found;
}

function initiativeOptions(scene = {}) {
  return {
    categoryOrder: scene.categoryOrder || defaultCategoryOrder,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    initiativeOrder: scene.initiativeOrder || defaultInitiativeOrder,
    initiativeTextOrder: scene.initiativeTextOrder,
    initiativeEnabled: scene.temporalite !== 'souple' || scene.flexibleUseInitiative !== false,
    tiebreakerVisible: scene.tiebreakerVisible !== false,
    multipleActionSlots: scene.multipleActionSlots !== false,
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
  const initialEntry = campaignEntryFromPayload(initialCampaign, { source: 'locale' });
  const [campaignRules, setCampaignRules] = useState(() => normalizeCampaignRules(campaignRulesFromPayload(initialCampaign)));
  const [scenes, setScenes] = useState(() => normalizeScenesWithCampaignRules(initialCampaign.scenes, campaignRulesFromPayload(initialCampaign)));
  const [templateStore, setTemplateStore] = useState(() => campaignTemplatesFromPayload(initialCampaign));
  const [campaignName, setCampaignName] = useState(() => campaignNameFromPayload(initialCampaign));
  const [sceneIndex, setSceneIndex] = useState(initialSceneIndex);
  const [restorePoints, setRestorePoints] = useState(() => initialRestorePoints(initialCampaign.scenes));
  const [dark, setDark] = useState(() => initialCampaign.settings?.dark ?? devicePrefersDark());
  const [roundEffect, setRoundEffect] = useState(null);
  const [campaignEntries, setCampaignEntries] = useState(() => {
    const demos = demoCampaignEntries();
    const withoutInitial = demos.filter((entry) => entry.id !== initialEntry.id);
    return [initialEntry, ...withoutInitial];
  });
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
  const blocked = [...participants, ...(scene.reserve || [])].filter(hasTriggeredClock);
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
    const signature = JSON.stringify({ scenes: syncedScenes, dark, campaignName, templateStore, campaignRules, activeCampaignEntryId });
    if (signature === lastPersistenceSignatureRef.current) return undefined;
    lastPersistenceSignatureRef.current = signature;

    const activeEntry = campaignEntriesRef.current.find((entry) => entry.id === activeCampaignEntryIdRef.current);
    const meta = activeEntry ? { id: activeEntry.id, name: campaignName, fileName: activeEntry.fileName, folderName: activeEntry.folderName } : {};
    const content = serializeCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, meta);
    const snapshot = JSON.parse(content);
    saveCampaign(syncedScenes, dark, campaignName, templateStore, campaignRules, meta);

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
  }, [syncedScenes, dark, campaignName, templateStore, campaignRules, activeCampaignEntryId]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = (event) => setDark(event.matches);
    mediaQuery.addEventListener?.('change', updateTheme);
    return () => mediaQuery.removeEventListener?.('change', updateTheme);
  }, []);

  const sceneActions = useMemo(() => createSceneActions({ scene, sceneIndex, blocked, restorePoints, setScenes, setRestorePoints, setRoundEffect }), [blocked, scene, restorePoints, sceneIndex]);
  const campaignActions = useMemo(() => createCampaignActions({ scenes: syncedScenes, campaignRules, setCampaignRules, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState: setCampaignName, setTemplateStore }), [campaignName, campaignRules, dark, sceneIndex, syncedScenes, templateStore]);

  const loadCampaignIntoState = (payload) => {
    const campaign = normalizeCampaignPayload(payload);
    setCampaignRules(campaign.initiativeRules);
    setScenes(campaign.scenes);
    setCampaignName(campaignNameFromPayload(campaign));
    setTemplateStore(campaignTemplatesFromPayload(campaign));
    setDark(!!campaign.settings?.dark);
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
      const base = slugifyCampaignPart(`${campaignName}-copie`);
      const copyName = `${campaignName} - copie`;
      const folderName = `${base}-${Date.now().toString(36)}`;
      const fileName = `${base}.cad`;
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
    resetDemo() {
      const entries = demoCampaignEntries();
      fileHandlesRef.current.clear();
      campaignDirectoryHandleRef.current = null;
      setCampaignEntries(entries);
      setActiveCampaignEntryId(entries[0].id);
      loadCampaignIntoState(entries[0].snapshot);
      setPendingFileChoice(null);
      setFileSaveStatus({ mode: 'local', message: 'Campagnes de demo rechargees.' });
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
    actions: {
      ...sceneActions,
      ...campaignActions,
      ...extraCampaignActions,
      ...extraSceneActions,
    },
  };
}
