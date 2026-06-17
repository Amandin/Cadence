import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { createRulePresetSnapshot, syncRulePresetSnapshot } from '../rulePresets.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from '../storage.js';
import { boxBlocks, clone, isBoxesTracker, isNumericTracker, makeDefaultCampaign, makeTestCampaign, normalizeBoxTracker, uid } from '../logic.js';
import { mergeTemplateStores } from '../templates.js';
import { readJsonCadenceFile, shareOrDownloadCampaign } from '../campaignFileIO.js';

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

function premierParticipantId(scene, rules) {
  if (rules?.temporalite === 'souple') return '';
  return scene?.participants?.[0]?.id || '';
}

function remettreSceneAuDepartInitiative(scene, rules) {
  const resetScene = {
    ...scene,
    round: -1,
    phase: 1,
    activeId: premierParticipantId(scene, rules),
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
    title: 'Nouvelle scène',
    type: 'Scène',
    round: -1,
    phase: 1,
    activeId: '',
    notes: '',
    statuses: [],
    reserve: [],
    participants: [],
  }, rules);
}

function duplicateSceneData(scene, rules) {
  return remettreSceneAuDepartInitiative({ ...clone(scene), id: uid('scene'), title: `${scene?.title || 'Scène'} — copie` }, rules);
}

export function createCampaignActions({ scenes, campaignRules, rulePresetSnapshot, setCampaignRules, setRulePresetSnapshot = () => {}, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState, setTemplateStore }) {
  const applyCampaign = (payload) => {
    const fresh = normalizeCampaignPayload(payload);
    setCampaignRules(campaignRulesFromPayload(fresh));
    setRulePresetSnapshot(fresh.rulePresetSnapshot || null);
    setScenes(fresh.scenes);
    setTemplateStore(campaignTemplatesFromPayload(fresh));
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
        nextScenes.splice(sourceIndex + 1, 0, duplicateSceneData(source, rules));
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
      const result = await shareOrDownloadCampaign(serializeCampaign(exportScenes, dark, exportName, templateStore, rules, rulePresetSnapshot), exportName);
      if (result?.ok) setCampaignNameState(exportName);
      return result;
    },
    async importCampaign(file) {
      try {
        const data = await readJsonCadenceFile(file);
        if (!isValidCampaign(data)) return { ok: false, message: `Le fichier choisi n’est pas une campagne Cadence valide. Fichier : ${file?.name || 'sans nom'} (${file?.type || 'type inconnu'}, ${file?.size || 0} octets).` };
        const campaign = normalizeCampaignPayload(data);
        setCampaignRules(campaign.initiativeRules);
        setRulePresetSnapshot(campaign.rulePresetSnapshot || null);
        setScenes(campaign.scenes);
        setCampaignNameState(campaignNameFromPayload(campaign));
        setTemplateStore(campaignTemplatesFromPayload(campaign));
        setSceneIndex(0);
        return { ok: true };
      } catch (error) {
        return { ok: false, message: `Impossible de lire ce fichier Cadence. ${file?.name ? `Fichier : ${file.name}. ` : ''}${error?.message || 'Erreur inconnue.'}` };
      }
    },
    async importTemplatesFromCampaign(file) {
      try {
        const data = await readJsonCadenceFile(file);
        if (!isValidCampaign(data)) return { ok: false, message: 'Le fichier choisi n’est pas une campagne Cadence valide.' };
        const importedTemplates = campaignTemplatesFromPayload(normalizeCampaignPayload(data));
        const result = mergeTemplateStores(templateStore, importedTemplates);
        setTemplateStore(result.store);
        return { ok: true, added: result.added.length, skipped: result.skipped.length };
      } catch {
        return { ok: false, message: 'Impossible de lire les modèles de cette campagne.' };
      }
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
