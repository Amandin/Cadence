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

export function createCampaignActions({ scenes, dark, setScenes, setSceneIndex, setDark }) {
  return {
    setSceneIndex,
    setDark,
    newScene() {
      setScenes((currentScenes) => [...currentScenes, createBlankScene()]);
      setSceneIndex(scenes.length);
    },
    exportCampaign() {
      const blob = new Blob([serializeCampaign(scenes, dark)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'campagne-cadence.json';
      link.click();
      URL.revokeObjectURL(url);
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
        return { ok: false, message: 'Impossible de lire ce fichier JSON.' };
      }
    },
    resetDemo() {
      const fresh = makeDefaultCampaign();
      setScenes(fresh.scenes);
      setSceneIndex(0);
    },
  };
}
