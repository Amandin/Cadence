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

export function newTracker(type = 'bar') {
  const base = { id: uid('t'), type, visible: true };
  if (type === 'clock') return { ...base, name: 'Horloge', current: 0, max: 6, auto: true, frozen: false };
  if (type === 'dots') return { ...base, name: 'Points', current: 0, max: 5, step: 1 };
  if (type === 'boxes') return { ...base, name: 'Cases', fillLevels: 5, rows: [{ id: uid('r'), label: 'Ligne', marks: [0, 0, 0, 0] }] };
  if (type === 'number') return { ...base, name: 'Compteur', current: 0, step: 1, min: null, max: null, minAbsolute: false, maxAbsolute: false };
  return { ...base, name: 'PV', current: 10, min: 0, max: 20, step: 5, minAbsolute: true, maxAbsolute: false };
}

export function applyDelta(tracker, delta) {
  let current = numberOr(tracker.current, 0) + numberOr(delta, 0);
  if ((tracker.type === 'bar' || tracker.type === 'number') && tracker.minAbsolute && hasBound(tracker.min)) current = Math.max(current, Number(tracker.min));
  if ((tracker.type === 'bar' || tracker.type === 'number') && tracker.maxAbsolute && hasBound(tracker.max)) current = Math.min(current, Number(tracker.max));
  if (tracker.type === 'dots' || tracker.type === 'clock') current = clamp(current, 0, numberOr(tracker.max, 0));
  return { ...tracker, current };
}

export function boxVisualRank(mark, max) {
  const value = numberOr(mark, 0);
  const levels = clamp(numberOr(max, 5), 1, 5);
  if (!value) return 0;
  const ranksByLevel = { 1: [5], 2: [2, 5], 3: [1, 2, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] };
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
  return { ...participant, statuses: tickStatuses(participant.statuses), trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto && !tracker.frozen ? { ...tracker, current: numberOr(tracker.current, 0) + 1 } : tracker) };
}

export function untickParticipant(participant) {
  return { ...participant, statuses: untickStatuses(participant.statuses), trackers: (participant.trackers || []).map((tracker) => tracker.type === 'clock' && tracker.auto && !tracker.frozen ? { ...tracker, current: Math.max(0, numberOr(tracker.current, 0) - 1) } : tracker) };
}

export function nextTurnInfo(scene, blocked = false) {
  const participants = scene.participants || [];
  const currentIndex = Math.max(0, participants.findIndex((p) => p.id === scene.activeId));
  const nextIndex = participants.length ? (currentIndex + 1) % participants.length : 0;
  return { currentIndex, nextIndex, nextStartsRound: participants.length > 0 && nextIndex === 0 && currentIndex !== 0 && !blocked };
}

export function makeDefaultCampaign() {
  return {
    version: '0.1.5',
    scenes: [
      {
        id: 'entrepot', title: 'Entrepôt sous la pluie', type: 'Combat', round: 1, activeId: 'ombre', reserveOpen: true,
        notes: 'Scène de démo volontairement chargée : égalités d’initiative, départage, catégories et suivis variés.',
        reserveNotes: 'Tester ici : rejoindre l’initiative, ordre des catégories et retri instantané.',
        globalTracker: { enabled: true, name: 'Menace', mode: 'clock', current: 3, max: 10, auto: true },
        reserve: [
          { id: 'contact', name: 'Contact paniqué', kind: 'Allié', symbol: '🕯', color: 'pink', initiative: 7, departage: '', description: 'Réserve prête à rejoindre l’initiative.', stats: ['Fragile'], statuses: [{ id: 'reserve-status', name: 'Caché', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'contact-stress', type: 'dots', name: 'Panique', visible: true, current: 1, max: 4 }] },
          { id: 'tourelle', name: 'Tourelle inactive', kind: 'Environnement', symbol: '⚙', color: 'amber', initiative: 6, departage: 2, description: 'Tester environnement rejoignant l’initiative.', stats: [], statuses: [], trackers: [{ id: 'turret-clock', type: 'clock', name: 'Réactivation', visible: true, current: 2, max: 4, auto: false }] },
        ],
        participants: [
          { id: 'ombre', name: 'Ombre de Lune', kind: 'PJ', symbol: '●●', color: 'slate', initiative: 8, departage: 2, description: 'Même initiative que plusieurs autres pour tester le départage.', stats: ['Défense 3'], statuses: [{ id: 's1', name: 'À couvert', duration: null, remaining: null, loop: false, expired: false }], trackers: [{ id: 'b1', type: 'boxes', name: 'Blessures', visible: true, fillLevels: 5, rows: [{ id: 'r1', label: 'Superf.', marks: [0, 1, 2, 3, 4, 5] }] }] },
          { id: 'vigile', name: 'Chef des vigiles', kind: 'Opposant', symbol: '⚔', color: 'red', initiative: 8, departage: 1, description: 'Même initiative mais départage plus faible.', stats: ['Défense 2'], statuses: [], trackers: [{ id: 'pv', type: 'bar', name: 'PV', visible: true, current: 32, min: 0, max: 50, step: 5, minAbsolute: true, maxAbsolute: false }] },
          { id: 'mercenaire', name: 'Mercenaire allié', kind: 'Allié', symbol: '🛡', color: 'emerald', initiative: 8, departage: '', description: 'Même initiative sans départage.', stats: [], statuses: [], trackers: [{ id: 'stress', type: 'dots', name: 'Stress', visible: true, current: 2, max: 5 }] },
          { id: 'incendie', name: 'Incendie rampant', kind: 'Environnement', symbol: '🔥', color: 'orange', initiative: 8, departage: '', description: 'Égalité parfaite pour tester l’ordre des catégories.', stats: [], statuses: [], trackers: [{ id: 'fire-clock', type: 'clock', name: 'Propagation', visible: true, current: 4, max: 6, auto: true }] },
          { id: 'renforts', name: 'Renforts en approche', kind: 'Environnement', symbol: '⏳', color: 'amber', initiative: 3, departage: '', description: 'Horloge environnementale proche de la fin.', stats: [], statuses: [], trackers: [{ id: 'clock', type: 'clock', name: 'Arrivée', visible: true, current: 5, max: 6, auto: true }] },
        ],
      }
    ],
  };
}
