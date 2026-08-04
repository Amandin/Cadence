import { describe, expect, it } from 'vitest';
import { onRequestPost } from './logout.js';
import { SESSION_COOKIE } from '../../_lib/auth.js';

function fakeD1() {
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
          if (normalized.includes('from sessions') && normalized.includes('join accounts')) {
            return {
              tokenHash: 'hash-1',
              csrfToken: 'csrf-1',
              expiresAt: new Date(Date.now() + 60_000).toISOString(),
              userId: 'owner-1',
              username: 'owner',
              displayName: 'Owner',
              role: 'member',
              disabled: 0,
            };
          }
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

describe('private logout route', () => {
  it('puts the stream on off after deleting the current session', async () => {
    const DB = fakeD1();
    const request = new Request('https://cadence.test/api/auth/logout', {
      method: 'POST',
      headers: {
        Cookie: `${SESSION_COOKIE}=session-token`,
        Origin: 'https://cadence.test',
        'X-Cadence-CSRF': 'csrf-1',
      },
    });

    const response = await onRequestPost({ request, env: { DB } });

    expect(response.status).toBe(200);
    expect(DB.calls.filter((call) => call.sql.startsWith('delete from sessions'))).toHaveLength(1);
    const pause = DB.calls.find((call) => call.sql.startsWith('update scene_streams'));
    expect(pause.sql).toContain('paused_at');
    expect(pause.sql).toContain('not exists');
  });
});
