import { describe, expect, it } from 'vitest';
import {
  activeOwnerStreamState,
  bearerStreamToken,
  reconcileOwnerIndicatorState,
  STREAM_INACTIVITY_TTL_MS,
  streamIsExpired,
} from './scene-stream.js';

const value = (current) => JSON.stringify({ current });

describe('scene stream inactivity expiration', () => {
  const now = Date.parse('2026-07-31T12:00:00.000Z');

  it('expires exactly two hours after the latest business modification', () => {
    expect(streamIsExpired({ updatedAt: new Date(now - STREAM_INACTIVITY_TTL_MS + 1).toISOString() }, now)).toBe(false);
    expect(streamIsExpired({ updatedAt: new Date(now - STREAM_INACTIVITY_TTL_MS).toISOString() }, now)).toBe(true);
  });

  it('fails open for an invalid legacy timestamp', () => {
    expect(streamIsExpired({ updatedAt: 'invalid' }, now)).toBe(false);
  });

  it('keeps the expiration reason available for the owner after another client revoked it', async () => {
    const DB = {
      prepare(sql) {
        const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
        return {
          bind() { return this; },
          async first() {
            if (normalized.includes('revoked_at is null')) return null;
            if (normalized.includes('revoked_at is not null')) return { id: 'expired-stream' };
            throw new Error(`Unexpected SQL: ${normalized}`);
          },
        };
      },
    };

    await expect(activeOwnerStreamState({ DB }, 'owner-1')).resolves.toEqual({
      stream: null,
      expired: true,
    });
  });
});

function state(patch = {}) {
  return {
    valueJson: value(10),
    ownerValueJson: value(10),
    version: 4,
    writable: 1,
    pending: 0,
    ...patch,
  };
}

describe('scene stream owner reconciliation', () => {
  it('keeps an unacknowledged guest value while the owner is still on its base value', () => {
    const current = state({
      valueJson: value(7),
      ownerValueJson: value(10),
      version: 5,
      pending: 1,
    });
    expect(reconcileOwnerIndicatorState(current, value(10), 1)).toMatchObject({
      valueJson: value(7),
      ownerValueJson: value(10),
      version: 5,
      pending: 1,
      publicChanged: false,
    });
  });

  it('acknowledges a guest value applied to the local scene without a second public change', () => {
    const current = state({
      valueJson: value(7),
      ownerValueJson: value(10),
      version: 5,
      pending: 1,
    });
    expect(reconcileOwnerIndicatorState(current, value(7), 1)).toMatchObject({
      valueJson: value(7),
      ownerValueJson: value(7),
      version: 5,
      pending: 0,
      publicChanged: false,
    });
  });

  it('gives a newer owner value priority over a pending guest value', () => {
    const current = state({
      valueJson: value(7),
      ownerValueJson: value(10),
      version: 5,
      pending: 1,
    });
    expect(reconcileOwnerIndicatorState(current, value(12), 1)).toMatchObject({
      valueJson: value(12),
      ownerValueJson: value(12),
      version: 6,
      pending: 0,
      publicChanged: true,
    });
  });

  it('revokes a pending write when the independent write permission is disabled', () => {
    const current = state({
      valueJson: value(7),
      ownerValueJson: value(10),
      version: 5,
      pending: 1,
    });
    expect(reconcileOwnerIndicatorState(current, value(10), 0)).toMatchObject({
      valueJson: value(10),
      ownerValueJson: value(10),
      version: 6,
      writable: 0,
      pending: 0,
      publicChanged: true,
    });
  });

  it('versions only the owner-modified indicator state', () => {
    const first = reconcileOwnerIndicatorState(state(), value(11), 1);
    const second = reconcileOwnerIndicatorState(state(), value(10), 1);
    expect(first).toMatchObject({ version: 5, publicChanged: true });
    expect(second).toMatchObject({ version: 4, publicChanged: false });
  });
});

describe('scene stream bearer token', () => {
  it('accepts only an exact 256-bit base64url capability', () => {
    const token = 'a'.repeat(43);
    expect(bearerStreamToken(new Request('https://cadence.test/api/stream', {
      headers: { Authorization: `Bearer ${token}` },
    }))).toBe(token);
    expect(bearerStreamToken(new Request('https://cadence.test/api/stream', {
      headers: { Authorization: 'Bearer too-short' },
    }))).toBe('');
    expect(bearerStreamToken(new Request('https://cadence.test/api/stream?token=secret'))).toBe('');
  });
});
