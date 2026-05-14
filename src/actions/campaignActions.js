import { campaignNameFromPayload, isValidCampaign, normalizeCampaignName, serializeCampaign } from '../storage.js';
import { makeDefaultCampaign, uid } from '../logic.js';

function createBlankScene() {
  return {
    id: uid('scene'),
    title: 'Nouvelle scène',
    type: 'Scène',
    round: 1,
    activeId: '',
    notes: '',
    reserve: [],
    participants: [],
  };
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

export function createCampaignActions({ scenes, dark, campaignName, setScenes, setSceneIndex, setDark, setCampaignNameState }) {
  return {
    setSceneIndex,
    setDark,
    setCampaignName(name) {
      setCampaignNameState(normalizeCampaignName(name));
    },
    newScene() {
      setScenes((currentScenes) => [...currentScenes, createBlankScene()]);
      setSceneIndex(scenes.length);
    },
    async exportCampaign(name = campaignName) {
      const exportName = normalizeCampaignName(name);
      const result = await shareOrDownloadCampaign(serializeCampaign(scenes, dark, exportName), exportName);
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
        setSceneIndex(0);
        return { ok: true };
      } catch {
        return { ok: false, message: 'Impossible de lire ce fichier Cadence.' };
      }
    },
    resetDemo() {
      const fresh = makeDefaultCampaign();
      setScenes(fresh.scenes);
      setCampaignNameState(campaignNameFromPayload(fresh));
      setSceneIndex(0);
    },
  };
}
