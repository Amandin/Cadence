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

  return {
    id: uid('s'),
    name,
    duration,
    remaining: duration,
    loop: duration !== null && !!data.loop,
    inactive: !!data.inactive,
    expired: false,
  };
}

export function statusRendInactif(status) {
  return !!status?.inactive && !status?.expired;
}

export function participantEstInactif(participant) {
  return (participant?.statuses || []).some(statusRendInactif);
}
