import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { createRulePresetSnapshot, syncRulePresetSnapshot } from '../rulePresets.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from '../storage.js';
import { boxBlocks, clone, isBoxesTracker, isNumericTracker, makeDefaultCampaign, makeTestCampaign, normalizeBoxTracker, uid } from '../logic.js';
import { mergeTemplateStores, numberedCopyName } from '../templates.js';
import { readJsonCadenceFile, shareOrDownloadCampaign, shareOrDownloadLibrary } from '../campaignFileIO.js';
import { importCadenceLibraryRandomKits, isValidCadenceLibrary, mergeCadenceLibraryTemplates, serializeCadenceLibrary } from '../cadLibrary.js';
import { normalizeRandomSystemState } from '../random-system/state.js';
import { t } from '../i18n/index.js';

function valeurNumerique(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function resetTrackerPourDepartScene(tracker) {
  if (isBoxesTracker(tracker)) {
    return normalizeBoxTracker({
      ...tracker,
      blocks: boxBlocks(tracker).map((block) => ({
        ...block,
        lines: block.lines.map((line) => ({
          ...line,
          boxes: line.boxes.map((box) => ({ ...box, mark: 0 })),
        })),
      })),
    });
  }
  if (isNumericTracker(tracker)) return { ...tracker, current: valeurNumerique(tracker.initial, 0), cycles: 0 };
  return { ...tracker };
}

function resetParticipantPourDepartScene(participant) {
  return { ...participant, trackers: (participant.trackers || []).map(resetTrackerPourDepartScene) };
}

function resetCompteurGlobalPourDepartScene(compteur) {
  return compteur ? { ...compteur, current: 0, total: 0, loops: 0, running: false, startedAt: null, elapsedMs: 0 } : compteur;
}

function remettreSceneAuDepartInitiative(scene, rules) {
  const resetScene = {
    ...scene,
    round: -1,
    phase: 1,
    activeId: '',
    activeSlotId: '',
    jouesSouples: [],
    historiqueSouple: [],
    globalTracker: resetCompteurGlobalPourDepartScene(scene.globalTracker),
    participants: (scene.participants || []).map(resetParticipantPourDepartScene),
    reserve: (scene.reserve || []).map(resetParticipantPourDepartScene),
  };
  return applyInitiativeRules(resetScene, rules);
}

export function createBlankScene(rules = {}) {
  return applyInitiativeRules({
    id: uid('scene'),
    title: t('hub.scenes.new'),
    type: t('hub.scene.defaultType'),
    round: -1,
    phase: 1,
    activeId: '',
    notes: '',
    statuses: [],
    reserve: [],
    participants: [],
  }, rules);
}

function duplicateSceneData(scene, rules, existingScenes = []) {
  const title = scene?.title || t('hub.scene.defaultType');
  return remettreSceneAuDepartInitiative({ ...clone(scene), id: uid('scene'), title: numberedCopyName(existingScenes.map((item) => item.title), title, t('hub.scene.defaultType')) }, rules);
}

export function createCampaignActions({ scenes, campaignRules, rulePresetSnapshot, setCampaignRules, setRulePresetSnapshot = () => {}, sceneIndex, dark, campaignName, templateStore, randomSystemState, setScenes, setSceneIndex, setDark, setCampaignNameState, setTemplateStore, setRandomSystemState = () => {} }) {
  const applyCampaign = (payload) => {
    const fresh = normalizeCampaignPayload(payload);
    setCampaignRules(campaignRulesFromPayload(fresh));
    setRulePresetSnapshot(fresh.rulePresetSnapshot || null);
    setScenes(fresh.scenes);
    setTemplateStore(campaignTemplatesFromPayload(fresh));
    setRandomSystemState(normalizeRandomSystemState(fresh.randomSystem));
    setCampaignNameState(campaignNameFromPayload(fresh));
    setSceneIndex(0);
  };

  return {
    setSceneIndex,
    setDark,
    setCampaignName(name) {
      setCampaignNameState(normalizeCampaignName(name));
    },
    newScene() {
      const rules = normalizeCampaignRules(campaignRules);
      setScenes((currentScenes) => [...unifyCampaignScenes(currentScenes, rules), createBlankScene(rules)]);
      setSceneIndex(scenes.length);
    },
    updateSceneMeta(index, patch) {
      setScenes((currentScenes) => currentScenes.map((scene, scenePosition) => scenePosition === index ? { ...scene, ...patch } : scene));
    },
    duplicateScene(index) {
      const sourceIndex = Number.isInteger(index) ? index : sceneIndex;
      const rules = normalizeCampaignRules(campaignRules);
      setScenes((currentScenes) => {
        const unifiedScenes = unifyCampaignScenes(currentScenes, rules);
        const source = unifiedScenes[sourceIndex] || unifiedScenes[0];
        if (!source) return unifiedScenes;
        const nextScenes = [...unifiedScenes];
        nextScenes.splice(sourceIndex + 1, 0, duplicateSceneData(source, rules, unifiedScenes));
        return nextScenes;
      });
      setSceneIndex(sourceIndex + 1);
    },
    deleteScene(index) {
      const sourceIndex = Number.isInteger(index) ? index : sceneIndex;
      setScenes((currentScenes) => {
        if (currentScenes.length <= 1) return currentScenes;
        const nextScenes = currentScenes.filter((_, scenePosition) => scenePosition !== sourceIndex);
        const nextIndex = Math.min(sourceIndex, nextScenes.length - 1);
        setSceneIndex(Math.max(0, nextIndex));
        return unifyCampaignScenes(nextScenes, campaignRules);
      });
    },
    updateCampaignInitiativeRules(patch) {
      const nextRules = normalizeCampaignRules({ ...campaignRules, ...patch });
      setCampaignRules(nextRules);
      setRulePresetSnapshot((current) => syncRulePresetSnapshot(current, nextRules));
      setScenes((currentScenes) => unifyCampaignScenes(currentScenes, nextRules));
    },
    applyCampaignRulePreset(preset) {
      if (!preset?.rules) return;
      const nextRules = normalizeCampaignRules(preset.rules);
      setCampaignRules(nextRules);
      setRulePresetSnapshot(createRulePresetSnapshot(preset, nextRules));
      setScenes((currentScenes) => unifyCampaignScenes(currentScenes, nextRules));
    },
    async exportCampaign(name = campaignName) {
      const exportName = normalizeCampaignName(name);
      const rules = normalizeCampaignRules(campaignRules);
      const exportScenes = unifyCampaignScenes(scenes, rules);
      const result = await shareOrDownloadCampaign(serializeCampaign(exportScenes, dark, exportName, templateStore, rules, rulePresetSnapshot, {}, randomSystemState), exportName);
      if (result?.ok) setCampaignNameState(exportName);
      return result;
    },
    async importCampaign(file) {
      try {
        const data = await readJsonCadenceFile(file);
        if (!isValidCampaign(data)) return { ok: false, message: t('campaign.error.invalidCadenceFileDetailed', { fileName: file?.name || t('campaign.file.unnamed'), fileType: file?.type || t('campaign.file.unknownType'), fileSize: file?.size || 0 }) };
        const campaign = normalizeCampaignPayload(data);
        setCampaignRules(campaign.initiativeRules);
        setRulePresetSnapshot(campaign.rulePresetSnapshot || null);
        setScenes(campaign.scenes);
        setCampaignNameState(campaignNameFromPayload(campaign));
        setTemplateStore(campaignTemplatesFromPayload(campaign));
        setRandomSystemState(normalizeRandomSystemState(campaign.randomSystem));
        setSceneIndex(0);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: t('campaign.error.readNamedFile', { filePrefix: file?.name ? t('campaign.file.prefix', { fileName: file.name }) : '', message: error?.message || t('app.notice.unknownError') }) };
      }
    },
    async importTemplatesFromCampaign(file) {
      try {
        const data = await readJsonCadenceFile(file);
        let result = null;
        let randomKitResult = { added: 0, updated: 0 };
        if (isValidCadenceLibrary(data)) {
          result = mergeCadenceLibraryTemplates(templateStore, data);
          randomKitResult = importCadenceLibraryRandomKits(randomSystemState, data);
          setRandomSystemState(randomKitResult.state);
        } else if (isValidCampaign(data)) {
          const importedTemplates = campaignTemplatesFromPayload(normalizeCampaignPayload(data));
          result = mergeTemplateStores(templateStore, importedTemplates);
        } else {
          return { ok: false, message: t('campaign.error.invalidCadenceFile') };
        }
        setTemplateStore(result.store);
        return {
          ok: true,
          added: result.added.length,
          skipped: result.skipped.length,
          kitsAdded: randomKitResult.added,
          kitsUpdated: randomKitResult.updated,
        };
      } catch {
        return { ok: false, message: t('campaign.error.importTemplatesFailed') };
      }
    },
    async exportTemplateLibrary(name = `${campaignName} - bibliotheque`) {
      return shareOrDownloadLibrary(serializeCadenceLibrary({
        name,
        templates: templateStore,
        randomKits: randomSystemState?.randomKits || [],
      }), name);
    },
    loadTestCampaign() {
      applyCampaign(makeTestCampaign());
    },
    resetDemo() {
      applyCampaign(makeTestCampaign());
    },
    resetCampaign() {
      applyCampaign(makeDefaultCampaign());
    },
    resetToDefaultCampaign() {
      applyCampaign(makeDefaultCampaign());
    },
  };
}
