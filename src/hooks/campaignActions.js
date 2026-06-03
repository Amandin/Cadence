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
      link.download = 'campagne-cadence.cad';
      link.click();
      URL.revokeObjectURL(url);
    },
    async importCampaign(file) {
      try {
        const data = JSON.parse(await file.text());
        if (!isValidCampaign(data)) return alert('Fichier invalide');

        setScenes(data.scenes);
        setSceneIndex(0);
      } catch {
        alert('Impossible de lire ce fichier Cadence.');
      }
    },
    resetDemo() {
      const fresh = makeDefaultCampaign();
      setScenes(fresh.scenes);
      setSceneIndex(0);
    },
  };
}
