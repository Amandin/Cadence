import { creneauxActionIdsParticipant } from '../domain/initiative.js';

function participantScene(scene, participantId) {
  return (scene.participants || []).find((participant) => participant.id === participantId);
}

function slotIds(scene, participantId) {
  const participant = participantScene(scene, participantId);
  return participant ? creneauxActionIdsParticipant(participant) : [];
}

function participantIdFromSlotId(slotId) {
  return String(slotId || '').split(':')[0];
}

export function creneauxJouesSouples(scene, participantId) {
  const ids = new Set(slotIds(scene, participantId));
  return (scene.jouesSouples || []).filter((id) => ids.has(id) || id === participantId);
}

export function creneauxRestantsSouples(scene, participantId) {
  const ids = slotIds(scene, participantId);
  const joues = new Set(scene.jouesSouples || []);
  return ids.filter((id) => !joues.has(id));
}

export function actionsRestantesSouples(scene, participantId) {
  return creneauxRestantsSouples(scene, participantId).length;
}

export function toutLeMondeAJoueSouple(scene) {
  return (scene.participants || []).length > 0 && scene.participants.every((participant) => actionsRestantesSouples(scene, participant.id) === 0);
}

export function ajouterJoueSouple(scene, participantId) {
  const actuel = scene.jouesSouples || [];
  const slotId = creneauxRestantsSouples(scene, participantId)[0];
  if (!slotId) return { scene, slotId: '' };
  return { scene: { ...scene, jouesSouples: [...actuel, slotId] }, slotId };
}

export function retirerJoueSouple(scene, participantId) {
  const ids = new Set(slotIds(scene, participantId));
  const actuel = scene.jouesSouples || [];
  const index = [...actuel].reverse().findIndex((id) => ids.has(id) || id === participantId);
  if (index < 0) return actuel;
  const position = actuel.length - 1 - index;
  return actuel.filter((_, currentIndex) => currentIndex !== position);
}

export function retirerHistoriqueSouple(scene, participantId) {
  return (scene.historiqueSouple || []).filter((id) => participantIdFromSlotId(id) !== participantId && id !== participantId);
}

export function annulerDernierJoueSouple(scene) {
  const historique = scene.historiqueSouple || [];
  const dernier = historique.at(-1);
  if (!dernier) return scene;
  const participantId = participantIdFromSlotId(dernier);
  return {
    ...scene,
    activeId: participantId,
    activeSlotId: dernier,
    historiqueSouple: historique.slice(0, -1),
    jouesSouples: (scene.jouesSouples || []).filter((id) => id !== dernier),
  };
}
