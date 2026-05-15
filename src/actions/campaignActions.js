import { defaultCategoryOrder, defaultEqualityRule, defaultPhaseDecrement, defaultPhaseRerollEachRound, defaultTemporalityMode, temporalityModes } from '../constants.js';
import { trierParInitiative } from '../domain/initiative.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, isValidCampaign, normalizeCampaignName, serializeCampaign } from '../storage.js';
import { clone, makeDefaultCampaign, uid } from '../logic.js';
import { mergeTemplateStores } from '../templates.js';

function initiativeRulesFromScene(scene = {}) {
  return {
    temporalite: scene.temporalite || defaultTemporalityMode,
    phaseDecrement: Math.max(1, Number(scene.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: scene.phaseRerollEachRound ?? defaultPhaseRerollEachRound,
    equalityRule: scene.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(scene.categoryOrder) && scene.categoryOrder.length ? scene.categoryOrder : defaultCategoryOrder,
  };
}

function applyTemporality(scene, temporalite) {
  return {
    ...scene,
    temporalite,
    phase: temporalite === temporalityModes.PHASES ? (scene.phase || 1) : 1,
    activeId: temporalite === temporalityModes.FLEXIBLE ? '' : scene.activeId,
    jouesSouples: temporalite === temporalityModes.FLEXIBLE ? (scene.jouesSouples || []) : [],
    historiqueSouple: temporalite === temporalityModes.FLEXIBLE ? (scene.historiqueSouple || []) : [],
  };
}

function applyInitiativeRules(scene, patch = {}) {
  const current = initiativeRulesFromScene(scene);
  const next = { ...current, ...patch };
  const sceneWithTemporality = patch.temporalite ? applyTemporality(scene, next.temporalite) : scene;

  return {
    ...sceneWithTemporality,
    temporalite: next.temporalite,
    phaseDecrement: Math.max(1, Number(next.phaseDecrement) || defaultPhaseDecrement),
    phaseRerollEachRound: !!next.phaseRerollEachRound,
    equalityRule: next.equalityRule || defaultEqualityRule,
    categoryOrder: Array.isArray(next.categoryOrder) && next.categoryOrder.length ? next.categoryOrder : defaultCategoryOrder,
  };
}

function premierParticipantId(scene) {
  if (scene?.temporalite === temporalityModes.FLEXIBLE) return '';
  return trierParInitiative(scene?.participants || [], initiativeRulesFromScene(scene))[0]?.id || '';
}

function remettreSceneAuDepartInitiative(scene) {
  return {
    ...scene,
    round: 1,
    phase: 1,
    activeId: premierParticipantId(scene),
    jouesSouples: [],
    historiqueSouple: [],
  };
}

function createBlankScene(rules = {}) {
  return {
    id: uid('scene'),
    title: 'Nouvelle scène',
    type: 'Scène',
    round: 1,
    phase: 1,
    activeId: '',
    notes: '',
    reserve: [],
    participants: [],
    ...initiativeRulesFromScene(rules),
  };
}

function duplicateSceneData(scene) {
  return remettreSceneAuDepartInitiative({
    ...clone(scene),
    id: uid('scene'),
    title: `${scene?.title || 'Scène'} — copie`,
  });
}

function slugifyFilePart(value) {
  const normalized = normalizeCampaignName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'campagne-cadence';
}

function dateFrPourFichier(date = new Date()) {
  const jour = String(date.getDate()).padStart(2, '0');
  const mois = String(date.getMonth() + 1).padStart(2, '0');
  const annee = date.getFullYear();
  return `${jour}-${mois}-${annee}`;
}

function campaignExportFileName(campaignName) {
  return `${slugifyFilePart(campaignName)}-${dateFrPourFichier()}.cad`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function saveWithPicker(blob, fileName) {
  if (!window.showSaveFilePicker) return false;

  const handle = await window.showSaveFilePicker({
    suggestedName: fileName,
    types: [{
      description: 'Campagne Cadence',
      accept: { 'application/json': ['.cad'] },
    }],
  });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

async function shareOrDownloadCampaign(content, campaignName) {
  const fileName = campaignExportFileName(campaignName);
  const blob = new Blob([content], { type: 'application/json' });

  try {
    if (await saveWithPicker(blob, fileName)) return { ok: true, method: 'picker' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, cancelled: true };
    console.warn('Enregistrement direct impossible, fallback utilisé.', error);
  }

  if (typeof File !== 'undefined' && navigator.canShare && navigator.share) {
    const file = new File([blob], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: normalizeCampaignName(campaignName),
          text: 'Export de campagne Cadence',
        });
        return { ok: true, method: 'share' };
      } catch (error) {
        if (error?.name === 'AbortError') return { ok: false, cancelled: true };
        console.warn('Partage impossible, téléchargement direct utilisé.', error);
      }
    }
  }

  downloadBlob(blob, fileName);
  return { ok: true, method: 'download' };
}

export function createCampaignActions({ scenes, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState, setTemplateStore }) {
  return {
    setSceneIndex,
    setDark,
    setCampaignName(name) {
      setCampaignNameState(normalizeCampaignName(name));
    },
    newScene() {
      const sourceRules = initiativeRulesFromScene(scenes[sceneIndex] || scenes[0]);
      setScenes((currentScenes) => [...currentScenes, createBlankScene(sourceRules)]);
      setSceneIndex(scenes.length);
    },
    updateSceneMeta(index, patch) {
      setScenes((currentScenes) => currentScenes.map((scene, scenePosition) => scenePosition === index ? { ...scene, ...patch } : scene));
    },
    duplicateScene(index) {
      const sourceIndex = Number.isInteger(index) ? index : sceneIndex;
      setScenes((currentScenes) => {
        const source = currentScenes[sourceIndex] || currentScenes[0];
        if (!source) return currentScenes;
        const nextScenes = [...currentScenes];
        nextScenes.splice(sourceIndex + 1, 0, duplicateSceneData(source));
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
        return nextScenes;
      });
    },
    updateCampaignInitiativeRules(patch) {
      setScenes((currentScenes) => currentScenes.map((scene) => applyInitiativeRules(scene, patch)));
    },
    async exportCampaign(name = campaignName) {
      const exportName = normalizeCampaignName(name);
      const result = await shareOrDownloadCampaign(serializeCampaign(scenes, dark, exportName, templateStore), exportName);
      if (result?.ok) setCampaignNameState(exportName);
      return result;
    },
    async importCampaign(file) {
      try {
        const data = JSON.parse(await file.text());
        if (!isValidCampaign(data)) return { ok: false, message: 'Le fichier choisi n’est pas une campagne Cadence valide.' };

        setScenes(data.scenes);
        setDark(data.settings?.dark || false);
        setCampaignNameState(campaignNameFromPayload(data));
        setTemplateStore(campaignTemplatesFromPayload(data));
        setSceneIndex(0);
        return { ok: true };
      } catch {
        return { ok: false, message: 'Impossible de lire ce fichier Cadence.' };
      }
    },
    async importTemplatesFromCampaign(file) {
      try {
        const data = JSON.parse(await file.text());
        if (!isValidCampaign(data)) return { ok: false, message: 'Le fichier choisi n’est pas une campagne Cadence valide.' };
        const importedTemplates = campaignTemplatesFromPayload(data);
        const result = mergeTemplateStores(templateStore, importedTemplates);
        setTemplateStore(result.store);
        return { ok: true, added: result.added.length, skipped: result.skipped.length };
      } catch {
        return { ok: false, message: 'Impossible de lire les templates de cette campagne.' };
      }
    },
    resetDemo() {
      const fresh = makeDefaultCampaign();
      setScenes(fresh.scenes);
      setTemplateStore(campaignTemplatesFromPayload(fresh));
      setCampaignNameState(campaignNameFromPayload(fresh));
      setSceneIndex(0);
    },
  };
}
