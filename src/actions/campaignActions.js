import { isValidCampaign, serializeCampaign } from '../storage.js';
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

function campaignExportFileName() {
  const date = new Date().toISOString().slice(0, 10);
  return `campagne-cadence-${date}.cad`;
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

async function shareOrDownloadCampaign(content) {
  const fileName = campaignExportFileName();
  const blob = new Blob([content], { type: 'application/json' });

  if (typeof File !== 'undefined' && navigator.canShare && navigator.share) {
    const file = new File([blob], fileName, { type: 'application/json' });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Campagne Cadence',
          text: 'Export de campagne Cadence',
        });
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('Partage impossible, téléchargement direct utilisé.', error);
      }
    }
  }

  downloadBlob(blob, fileName);
}

export function createCampaignActions({ scenes, dark, setScenes, setSceneIndex, setDark }) {
  return {
    setSceneIndex,
    setDark,
    newScene() {
      setScenes((currentScenes) => [...currentScenes, createBlankScene()]);
      setSceneIndex(scenes.length);
    },
    async exportCampaign() {
      await shareOrDownloadCampaign(serializeCampaign(scenes, dark));
    },
    async importCampaign(file) {
      try {
        const data = JSON.parse(await file.text());
        if (!isValidCampaign(data)) return { ok: false, message: 'Le fichier choisi n’est pas une campagne Cadence valide.' };

        setScenes(data.scenes);
        setDark(data.settings?.dark || false);
        setSceneIndex(0);
        return { ok: true };
      } catch {
        return { ok: false, message: 'Impossible de lire ce fichier Cadence.' };
      }
    },
    resetDemo() {
      const fresh = makeDefaultCampaign();
      setScenes(fresh.scenes);
      setSceneIndex(0);
    },
  };
}
