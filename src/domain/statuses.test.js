import { describe, expect, it } from 'vitest';
import { createStatus, createSurprisedStatus, participantEstInactif, participantEstLimite } from './statuses.js';

describe('participant statuses', () => {
  it('creates the basic surprised status as a limited activation status', () => {
    expect(createSurprisedStatus()).toMatchObject({ name: 'Surpris', duration: 1, remaining: 1, limited: true, inactive: false, advanceOn: 'activation', expired: false });
  });

  it('creates an inactive surprised status when the campaign rule requests it', () => {
    expect(createSurprisedStatus('inactive')).toMatchObject({ name: 'Surpris', limited: false, inactive: true });
  });

  it('keeps limited and inactive impacts mutually exclusive', () => {
    const status = createStatus({ name: 'Contrainte', limited: true, inactive: true });
    expect(status).toMatchObject({ limited: false, inactive: true });
    expect(participantEstInactif({ statuses: [status] })).toBe(true);
    expect(participantEstLimite({ statuses: [status] })).toBe(false);
  });

  it('keeps optional color and participant tint metadata', () => {
    expect(createStatus({ name: 'Marque', color: 'violet', tintParticipant: true })).toMatchObject({ color: 'violet', tintParticipant: true });
  });

  it('stops applying a limited impact once the status has expired', () => {
    expect(participantEstLimite({ statuses: [{ limited: true, expired: false }] })).toBe(true);
    expect(participantEstLimite({ statuses: [{ limited: true, expired: true }] })).toBe(false);
  });
});
