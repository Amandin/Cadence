export function toutLeMondeAJoueSouple(scene) {
  const idsJoues = new Set(scene.jouesSouples || []);
  return (scene.participants || []).length > 0 && scene.participants.every((participant) => idsJoues.has(participant.id));
}

export function ajouterJoueSouple(scene, participantId) {
  const actuel = scene.jouesSouples || [];
  return actuel.includes(participantId) ? actuel : [...actuel, participantId];
}

export function retirerJoueSouple(scene, participantId) {
  return (scene.jouesSouples || []).filter((id) => id !== participantId);
}

export function retirerHistoriqueSouple(scene, participantId) {
  return (scene.historiqueSouple || []).filter((id) => id !== participantId);
}

export function annulerDernierJoueSouple(scene) {
  const historique = scene.historiqueSouple || [];
  const dernier = historique.at(-1);
  if (!dernier) return scene;
  return {
    ...scene,
    activeId: dernier,
    historiqueSouple: historique.slice(0, -1),
    jouesSouples: retirerJoueSouple(scene, dernier),
  };
}
