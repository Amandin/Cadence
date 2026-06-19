import { uid } from '../logic.js';

/**
 * Builds the normalized status object shared by initiative and reserve characters.
 * Invalid drafts return null so callers can safely ignore incomplete forms.
 */
export function createStatus(data) {
  const name = data?.name?.trim();
  if (!name) return null;

  const duration = data.duration == null ? null : Math.max(1, Number(data.duration));
  if (duration !== null && !Number.isFinite(duration)) return null;

  const inactive = !!data.inactive;
  return {
    id: uid('s'),
    name,
    duration,
    remaining: duration,
    loop: duration !== null && !!data.loop,
    inactive,
    limited: !inactive && !!data.limited,
    advanceOn: data.advanceOn === 'round' ? 'round' : 'activation',
    color: data.color || '',
    tintParticipant: !!data.tintParticipant,
    expired: false,
    skipNextActivation: !!data.skipNextActivation,
    activationSkipConsumed: false,
    skipNextAdvance: !!data.skipNextAdvance,
    advanceSkipConsumed: false,
  };
}

export function createSurprisedStatus(impact = 'limited', { advanceOn = 'activation', skipNextAdvance = false } = {}) {
  return createStatus({ name: 'Surpris', duration: 1, inactive: impact === 'inactive', limited: impact !== 'inactive', advanceOn, skipNextAdvance });
}

export function statusRendInactif(status) {
  return !!status?.inactive && !status?.expired;
}

export function statusRendLimite(status) {
  return !!status?.limited && !status?.expired;
}

export function participantEstInactif(participant) {
  return (participant?.statuses || []).some(statusRendInactif);
}

export function participantEstLimite(participant) {
  return (participant?.statuses || []).some(statusRendLimite);
}
