import { applyInitiativeRules, campaignRulesFromPayload, normalizeCampaignRules, unifyCampaignScenes } from '../domain/campaignRules.js';
import { campaignNameFromPayload, campaignTemplatesFromPayload, isValidCampaign, normalizeCampaignName, normalizeCampaignPayload, serializeCampaign } from '../storage.js';
import { clone, makeDefaultCampaign, uid } from '../logic.js';
import { mergeTemplateStores } from '../templates.js';

function valeurNumerique(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function resetTrackerPourDepartScene(tracker) {
  if (tracker.type === 'bar') return { ...tracker, current: valeurNumerique(tracker.max, valeurNumerique(tracker.current, 0)) };
  if (tracker.type === 'boxes') {
    return { ...tracker, rows: (tracker.rows || []).map((row) => ({ ...row, marks: (row.marks || []).map(() => 0) })) };
  }
  if (['clock', 'dots', 'number'].includes(tracker.type)) return { ...tracker, current: 0 };
  return { ...tracker };
}

function resetParticipantPourDepartScene(participant) {
  return { ...participant, trackers: (participant.trackers || []).map(resetTrackerPourDepartScene) };
}

function resetCompteurGlobalPourDepartScene(compteur) {
  return compteur ? { ...compteur, current: 0 } : compteur;
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

function createBlankScene(rules = {}) {
  return applyInitiativeRules({
    id: uid('scene'),
    title: 'Nouvelle scène',
    type: 'Scène',
    round: -1,
    phase: 1,
    activeId: '',
    notes: '',
    reserve: [],
    participants: [],
  }, rules);
}

function duplicateSceneData(scene, rules) {
  return remettreSceneAuDepartInitiative({ ...clone(scene), id: uid('scene'), title: `${scene?.title || 'Scène'} — copie` }, rules);
}

function slugifyFilePart(value) {
  const normalized = normalizeCampaignName(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'campagne-cadence';
}

function dateFrPourFichier(date = new Date()) {
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

function campaignExportFileName(campaignName) {
  return `${slugifyFilePart(campaignName)}-${dateFrPourFichier()}.cad`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 1000);
}

async function saveWithPicker(blob, fileName) {
  if (!window.showSaveFilePicker) return false;
  const handle = await window.showSaveFilePicker({ suggestedName: fileName, types: [{ description: 'Campagne Cadence', accept: { 'application/json': ['.cad'] } }] });
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
  return true;
}

async function shareOrDownloadCampaign(content, campaignName) {
  const fileName = campaignExportFileName(campaignName);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });

  try {
    if (await saveWithPicker(blob, fileName)) return { ok: true, method: 'picker' };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, cancelled: true };
    console.warn('Enregistrement direct impossible, fallback utilisé.', error);
  }

  if (typeof File !== 'undefined' && navigator.canShare && navigator.share) {
    const files = [
      new File([blob], fileName, { type: 'application/json' }),
      new File([blob], fileName, { type: 'text/plain' }),
      new File([blob], fileName, { type: 'application/octet-stream' }),
    ];
    const file = files.find((candidate) => navigator.canShare({ files: [candidate] }));
    if (file) {
      try {
        await navigator.share({ files: [file], title: normalizeCampaignName(campaignName), text: 'Export de campagne Cadence' });
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

async function lireJsonCadence(file) {
  const raw = await file.text();
  const text = raw.replace(/^\uFEFF/, '').trim();
  return JSON.parse(text);
}

export function createCampaignActions({ scenes, campaignRules, setCampaignRules, sceneIndex, dark, campaignName, templateStore, setScenes, setSceneIndex, setDark, setCampaignNameState, setTemplateStore }) {
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
      setScenes((currentScenes) => unifyCampaignScenes(currentScenes, nextRules));
    },
    async exportCampaign(name = campaignName) {
      const exportName = normalizeCampaignName(name);
      const rules = normalizeCampaignRules(campaignRules);
      const exportScenes = unifyCampaignScenes(scenes, rules);
      const result = await shareOrDownloadCampaign(serializeCampaign(exportScenes, dark, exportName, templateStore, rules), exportName);
      if (result?.ok) setCampaignNameState(exportName);
      return result;
    },
    async importCampaign(file) {
      try {
        const data = await lireJsonCadence(file);
        if (!isValidCampaign(data)) return { ok: false, message: `Le fichier choisi n’est pas une campagne Cadence valide. Fichier : ${file?.name || 'sans nom'} (${file?.type || 'type inconnu'}, ${file?.size || 0} octets).` };
        const campaign = normalizeCampaignPayload(data);
        setCampaignRules(campaign.initiativeRules);
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
        const data = await lireJsonCadence(file);
        if (!isValidCampaign(data)) return { ok: false, message: 'Le fichier choisi n’est pas une campagne Cadence valide.' };
        const importedTemplates = campaignTemplatesFromPayload(normalizeCampaignPayload(data));
        const result = mergeTemplateStores(templateStore, importedTemplates);
        setTemplateStore(result.store);
        return { ok: true, added: result.added.length, skipped: result.skipped.length };
      } catch {
        return { ok: false, message: 'Impossible de lire les templates de cette campagne.' };
      }
    },
    resetDemo() {
      const fresh = normalizeCampaignPayload(makeDefaultCampaign());
      setCampaignRules(campaignRulesFromPayload(fresh));
      setScenes(fresh.scenes);
      setTemplateStore(campaignTemplatesFromPayload(fresh));
      setCampaignNameState(campaignNameFromPayload(fresh));
      setSceneIndex(0);
    },
  };
}
