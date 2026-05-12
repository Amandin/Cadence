export const symbols = ['●●', '⚔', '🗡', '🛡', '🪓', '🏹', '🔮', '🗝', '📜', '⏳', '⚙', '🔥', '☁', '🌳', '🐺', '☠', '✦', '🦴', '🧪', '🕯'];
export const colors = ['slate', 'red', 'orange', 'amber', 'emerald', 'cyan', 'blue', 'violet', 'pink', 'rose'];

export function uid(prefix = 'id') {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function isVisible(item) {
  return item.visible !== false;
}

function hasBound(value) {
  return value !== null && value !== '' && value !== undefined;
}

function numberOr(value, fallback) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(value, max));
}

export function isTriggeredClock(tracker) {
  return tracker.type === 'clock' && numberOr(tracker.current, 0) >= numberOr(tracker.max, 0);
}

export function hasTriggeredClock(participant) {
  return participant.trackers?.some(isTriggeredClock) || false;
}

// Factory unique des suivis. Garder les valeurs par défaut ici évite les divergences
// entre l'ajout depuis l'interface, les tests et les futures migrations de sauvegarde.
export function newTracker(type = 'bar') {
  const base = { id: uid('t'), type, visible: true };
  if (type === 'clock') return { ...base, name: 'Horloge', current: 0, max: 6, auto: true };
  if (type === 'dots') return { ...base, name: 'Points', current: 0, max: 5, step: 1 };
  if (type === 'boxes') return { ...base, name: 'Cases', fillLevels: 5, rows: [{ id: uid('r'), label: 'Ligne', marks: [0, 0, 0, 0] }] };
  if (type === 'number') return { ...base, name: 'Compteur', current: 0, step: 1, min: null, max: null, minAbsolute: false, maxAbsolute: false };
  return { ...base, name: 'PV', current: 10, min: 0, max: 20, step: 5, minAbsolute: true, maxAbsolute: false };
}

export function applyDelta(tracker, delta) {
  let current = numberOr(tracker.current, 0) + numberOr(delta, 0);

  // Barres et compteurs peuvent dépasser leurs bornes, sauf si une borne absolue
  // est cochée. Les horloges et points restent toujours dans leur intervalle visuel.
  if ((tracker.type === 'bar' || tracker.type === 'number') && tracker.minAbsolute && hasBound(tracker.min)) current = Math.max(current, Number(tracker.min));
  if ((tracker.type === 'bar' || tracker.type === 'number') && tracker.maxAbsolute && hasBound(tracker.max)) current = Math.min(current, Number(tracker.max));
  if (tracker.type === 'dots' || tracker.type === 'clock') current = clamp(current, 0, numberOr(tracker.max, 0));

  return { ...tracker, current };
}

export function boxVisualRank(mark, max) {
  const value = numberOr(mark, 0);
  const levels = clamp(numberOr(max, 5), 1, 5);
  if (!value) return 0;

  // Ordre demandé : /, X, X+|, double X, noir.
  // Si on utilise moins de 5 états, on retire les états 3, puis 4, puis 1 en priorité.
  const ranksByLevel = {
    1: [5],
    2: [2, 5],
    3: [1, 2, 5],
    4: [1, 2, 4, 5],
    5: [1, 2, 3, 4, 5],
  };
  return ranksByLevel[levels][Math.min(value, levels) - 1] || 5;
}

export function cycleBoxMark(mark, max) {
  return (numberOr(mark, 0) + 1) % (numberOr(max, 1) + 1);
}

export function tickStatuses(statuses = []) {
  return statuses.flatMap((status) => {
    if (status.duration == null) return [status];
    if (status.expired) return status.loop ? [{ ...status, remaining: status.duration, expired: false }] : [];

    const remaining = Math.max(0, numberOr(status.remaining, status.duration) - 1);
    return [{ ...status, remaining, expired: remaining <= 0 }];
  });
}

export function untickStatuses(statuses = []) {
  return statuses.map((status) => {
    if (status.duration == null) return status;
    if (status.expired) return { ...status, remaining: 1, expired: false };
    if (status.loop && numberOr(status.remaining, status.duration) >= numberOr(status.duration, 1)) return { ...status, remaining: 0, expired: true };

    const remaining = Math.min(numberOr(status.duration, 1), numberOr(status.remaining, status.duration) + 1);
    return { ...status, remaining, expired: false };
  });
}

export function tickParticipant(participant) {
  return {
    ...participant,
    statuses: tickStatuses(participant.statuses),
    trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto ? { ...tracker, current: numberOr(tracker.current, 0) + 1 } : tracker),
  };
}

export function untickParticipant(participant) {
  return {
    ...participant,
    statuses: untickStatuses(participant.statuses),
    trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto ? { ...tracker, current: Math.max(0, numberOr(tracker.current, 0) - 1) } : tracker),
  };
}

export function nextTurnInfo(scene, blocked = false) {
  const participants = scene.participants || [];
  const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
  const nextIndex = participants.length ? (currentIndex + 1) % participants.length : 0;

  return {
    currentIndex,
    nextIndex,
    nextStartsRound: participants.length > 0 && nextIndex === 0 && currentIndex !== 0 && !blocked,
  };
}

export function makeDefaultCampaign() {
  return {
    version: '0.1.5',
    scenes: [
      {
        id: 'entrepot', title: 'Entrepôt sous la pluie', type: 'Combat', round: 1, activeId: 'ombre', reserveOpen: true,
        notes: 'Lumière clignotante, odeur d’ozone, quai de chargement et bureau vitré. Démo volontairement chargée pour tester tous les suivis.',
        reserve: [
          { id: 'plan', name: 'Plan du lieu', kind: 'Autre', symbol: '📜', color: 'blue', initiative: 1, description: 'Hors initiative : fiche simple à replier/déplier plus tard.', stats: ['Indice'], statuses: [], trackers: [{ id: 'plan-note', type: 'number', name: 'Indices notés', visible: true, current: 2, step: 1, min: 0, max: null, minAbsolute: true, maxAbsolute: false }] },
          { id: 'contact', name: 'Contact paniqué', kind: 'Allié', symbol: '🕯', color: 'pink', initiative: 2, description: 'À faire revenir dans l’initiative si besoin.', stats: ['Fragile'], statuses: [{ id: 'reserve-status', name: 'Caché', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'contact-stress', type: 'dots', name: 'Panique', visible: true, current: 1, max: 4 }] },
        ],
        participants: [
          { id: 'ombre', name: 'Ombre de Lune', kind: 'PJ', symbol: '●●', color: 'slate', initiative: 8, description: 'Impulsive et rapide. Contient cases + points + états.', stats: ['Défense 3'], statuses: [{ id: 's1', name: 'À couvert', duration: null, remaining: null, loop: false, expired: false }, { id: 's2', name: 'Sonné', duration: 2, remaining: 1, loop: false, expired: false }, { id: 's3', name: 'Poison cyclique', duration: 2, remaining: 0, loop: true, expired: true }], trackers: [{ id: 'b1', type: 'boxes', name: 'Blessures', visible: true, fillLevels: 5, rows: [{ id: 'r1', label: 'Superf.', marks: [0, 1, 2, 3, 4, 5] }, { id: 'r2', label: 'Graves', marks: [0, 2, 5] }, { id: 'r3', label: 'Choc', marks: [1, 0, 0, 0] }] }, { id: 'rage', type: 'dots', name: 'Rage', visible: true, current: 3, max: 5 }] },
          { id: 'vigile', name: 'Chef des vigiles', kind: 'Opposition', symbol: '⚔', color: 'red', initiative: 6, description: 'Peut appeler des renforts. Contient barre + compteur.', stats: ['Défense 2'], statuses: [], trackers: [{ id: 'pv', type: 'bar', name: 'PV', visible: true, current: 32, min: 0, max: 50, step: 5, minAbsolute: true, maxAbsolute: false }, { id: 'alert-count', type: 'number', name: 'Soupçons', visible: true, current: 2, step: 1, min: 0, max: null, minAbsolute: true, maxAbsolute: false }] },
          { id: 'renforts', name: 'Renforts en approche', kind: 'Horloge', symbol: '⏳', color: 'amber', initiative: 3, description: 'À 6 segments, les renforts arrivent. Horloge proche de la fin.', stats: [], statuses: [], trackers: [{ id: 'clock', type: 'clock', name: 'Arrivée', visible: true, current: 5, max: 6, auto: true }] },
          { id: 'rien', name: 'Figurant sans suivi', kind: 'Autre', symbol: '☁', color: 'cyan', initiative: 1, description: 'Sert à tester “Sortir de l’initiative”.', stats: [], statuses: [], trackers: [] },
        ],
      },
      { id: 'bal', title: 'Bal masqué', type: 'Social', round: 1, activeId: 'elise', reserveOpen: true, notes: 'Scène sociale plus légère pour tester les changements de scène.', reserve: [], participants: [{ id: 'elise', name: 'Élise aux Cent Visages', kind: 'PJ', symbol: '🔮', color: 'violet', initiative: 12, description: 'Spécialiste des faux-semblants.', stats: ['Social 4'], statuses: [{ id: 'mask', name: 'Masquée', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'stress', type: 'bar', name: 'Stress', visible: true, current: 18, min: 0, max: 40, step: 5, minAbsolute: true, maxAbsolute: false }, { id: 'faveurs', type: 'dots', name: 'Faveurs', visible: true, current: 2, max: 5 }] }] },
      { id: 'crypte', title: 'Crypte mécanique', type: 'Piège', round: 1, activeId: 'nora', reserveOpen: true, notes: 'Dalles gravées et engrenages derrière les murs.', reserve: [{ id: 'mecanisme', name: 'Mécanisme dormant', kind: 'Horloge', symbol: '⚙', color: 'amber', initiative: 1, description: 'Réserve avec horloge.', stats: [], statuses: [], trackers: [{ id: 'gear-clock', type: 'clock', name: 'Réveil', visible: true, current: 2, max: 4, auto: false }] }], participants: [{ id: 'nora', name: 'Nora Main-Sûre', kind: 'PJ', symbol: '🗝', color: 'blue', initiative: 11, description: 'Voleuse prudente.', stats: ['Crochetage 5'], statuses: [], trackers: [{ id: 'outils', type: 'dots', name: 'Outils', visible: true, current: 3, max: 3 }, { id: 'piege', type: 'clock', name: 'Piège', visible: true, current: 3, max: 4, auto: true }] }] },
    ],
  };
}
