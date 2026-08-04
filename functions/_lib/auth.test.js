import { describe, expect, it } from 'vitest';
import { currentSession, SESSION_COOKIE } from './auth.js';

function request() {
  return new Request('https://cadence.test/api/auth/session', {
    headers: { Cookie: `${SESSION_COOKIE}=session-token` },
  });
}

function fakeD1(session) {
  const calls = [];
  return {
    calls,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      return {
        bindings: [],
        bind(...bindings) { this.bindings = bindings; return this; },
        async first() {
          calls.push({ method: 'first', sql: normalized, bindings: this.bindings });
          if (normalized.includes('from sessions') && normalized.includes('join accounts')) return session;
          throw new Error(`Unexpected first(): ${normalized}`);
        },
        async run() {
          calls.push({ method: 'run', sql: normalized, bindings: this.bindings });
          if (normalized.startsWith('delete from sessions')) return { meta: { changes: 1 } };
          if (normalized.startsWith('update scene_streams')) return { meta: { changes: 1 } };
          throw new Error(`Unexpected run(): ${normalized}`);
        },
      };
    },
  };
}

function session(patch = {}) {
  return {
    tokenHash: 'hash-1',
    csrfToken: 'csrf-1',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    userId: 'owner-1',
    username: 'owner',
    displayName: 'Owner',
    role: 'member',
    disabled: 0,
    ...patch,
  };
}

describe('private session lifecycle', () => {
  it('returns an active session without touching its stream', async () => {
    const DB = fakeD1(session());

    await expect(currentSession(request(), { DB })).resolves.toMatchObject({ userId: 'owner-1' });
    expect(DB.calls.filter((call) => call.method === 'run')).toHaveLength(0);
  });

  it('deletes an expired session and puts its owner stream on off', async () => {
    const DB = fakeD1(session({ expiresAt: new Date(Date.now() - 1).toISOString() }));

    await expect(currentSession(request(), { DB })).resolves.toBeNull();
    expect(DB.calls.filter((call) => call.sql.startsWith('delete from sessions'))).toHaveLength(1);
    expect(DB.calls.filter((call) => call.sql.startsWith('update scene_streams'))).toHaveLength(1);
    expect(DB.calls.find((call) => call.sql.startsWith('update scene_streams')).sql).toContain('not exists');
  });

  it('puts a disabled owner stream on off', async () => {
    const DB = fakeD1(session({ disabled: 1 }));

    await expect(currentSession(request(), { DB })).resolves.toBeNull();
    expect(DB.calls.filter((call) => call.sql.startsWith('update scene_streams'))).toHaveLength(1);
  });
});
