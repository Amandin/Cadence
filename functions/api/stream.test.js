import { describe, expect, it } from 'vitest';
import { onRequestGet, onRequestPatch } from './stream.js';
import { STREAM_INACTIVITY_TTL_MS } from '../_lib/scene-stream.js';

const TOKEN = 'a'.repeat(43);
const ORIGIN = 'https://cadence.test';

const indicator = {
  id: 'health',
  label: 'Santé',
  type: 'bar',
  min: 0,
  max: 12,
  writable: true,
  value: { current: 8 },
};

const sharedView = {
  schemaVersion: 1,
  scene: {
    id: 'scene-1',
    title: 'La crypte',
    participants: [{
      id: 'hero-1',
      name: 'Ariane',
      indicators: [indicator],
    }],
    reserve: [],
  },
};

function streamRow(patch = {}) {
  const now = new Date().toISOString();
  return {
    id: 'stream-1',
    sceneId: 'scene-1',
    revision: 12,
    viewJson: JSON.stringify(sharedView),
    createdAt: now,
    updatedAt: now,
    ...patch,
  };
}

function indicatorRow(patch = {}) {
  return {
    sceneId: 'scene-1',
    participantId: 'hero-1',
    indicatorId: 'health',
    version: 4,
    valueJson: JSON.stringify({ current: 8 }),
    ownerValueJson: JSON.stringify({ current: 8 }),
    writable: 1,
    pending: 0,
    updatedAt: '2026-07-31T10:01:00.000Z',
    ...patch,
  };
}

function fakeD1({ stream = streamRow(), state = indicatorRow(), expireRaceStream = null } = {}) {
  const calls = [];
  let currentStream = stream;

  return {
    calls,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, ' ').trim().toLowerCase();
      const statement = {
        bindings: [],
        bind(...bindings) {
          this.bindings = bindings;
          return this;
        },
        async first() {
          calls.push({ method: 'first', sql: normalized, bindings: this.bindings });
          if (normalized.includes('join accounts')) return currentStream;
          if (normalized.includes('from scene_stream_indicators')) return state;
          if (normalized.includes('from scene_streams') && normalized.includes('where id = ?')) return currentStream;
          throw new Error(`Unexpected D1 first(): ${normalized}`);
        },
        async all() {
          calls.push({ method: 'all', sql: normalized, bindings: this.bindings });
          if (normalized.includes('from scene_stream_indicators')) {
            return { results: state ? [state] : [] };
          }
          throw new Error(`Unexpected D1 all(): ${normalized}`);
        },
        async run() {
          calls.push({ method: 'run', sql: normalized, bindings: this.bindings });
          if (normalized.startsWith('update scene_streams') && normalized.includes('set revoked_at = ?')) {
            if (expireRaceStream) {
              currentStream = expireRaceStream;
              return { meta: { changes: 0 } };
            }
            const [, id, updatedAt, cutoff] = this.bindings;
            if (currentStream?.id === id
              && currentStream.updatedAt === updatedAt
              && currentStream.updatedAt <= cutoff) {
              currentStream = null;
              return { meta: { changes: 1 } };
            }
            return { meta: { changes: 0 } };
          }
          throw new Error(`Unexpected D1 run(): ${normalized}`);
        },
      };
      return statement;
    },
  };
}

function getRequest(suffix = '', token = TOKEN) {
  return new Request(`${ORIGIN}/api/stream${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

function patchRequest(body) {
  return new Request(`${ORIGIN}/api/stream`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Origin: ORIGIN,
    },
    body: JSON.stringify(body),
  });
}

describe('public scene stream route', () => {
  it('returns the hydrated shared view for a valid link', async () => {
    const DB = fakeD1();
    const response = await onRequestGet({ request: getRequest(), env: { DB } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      stream: { id: 'stream-1', sceneId: 'scene-1', revision: 12, serverTime: expect.any(String) },
      view: {
        scene: {
          id: 'scene-1',
          participants: [{
            id: 'hero-1',
            indicators: [{
              id: 'health',
              writable: true,
              version: 4,
              value: { current: 8 },
            }],
          }],
        },
      },
    });
  });

  it('expires an inactive link with the same generic response as an invalid link', async () => {
    const DB = fakeD1({
      stream: streamRow({ updatedAt: new Date(Date.now() - STREAM_INACTIVITY_TTL_MS - 1).toISOString() }),
    });
    const response = await onRequestGet({ request: getRequest(), env: { DB } });

    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'STREAM_UNAVAILABLE' },
    });
    expect(DB.calls.filter((call) => call.method === 'run')).toHaveLength(1);
  });

  it('keeps a stream refreshed concurrently with its conditional expiration', async () => {
    const expired = streamRow({ updatedAt: new Date(Date.now() - STREAM_INACTIVITY_TTL_MS - 1).toISOString() });
    const refreshed = streamRow({ updatedAt: new Date().toISOString(), revision: 13 });
    const DB = fakeD1({ stream: expired, expireRaceStream: refreshed });
    const response = await onRequestGet({ request: getRequest(), env: { DB } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ stream: { revision: 13 } });
  });

  it('uses the same generic response for an invalid token and a revoked or missing link', async () => {
    const invalidDb = fakeD1();
    const invalid = await onRequestGet({
      request: getRequest('', 'too-short'),
      env: { DB: invalidDb },
    });
    const unavailableDb = fakeD1({ stream: null });
    const unavailable = await onRequestGet({
      request: getRequest(),
      env: { DB: unavailableDb },
    });

    expect(invalid.status).toBe(404);
    expect(unavailable.status).toBe(404);
    expect(await invalid.json()).toEqual(await unavailable.json());
    expect(invalidDb.calls).toHaveLength(0);
  });

  it('returns a minimal 204 when the requested revision is unchanged', async () => {
    const DB = fakeD1();
    const response = await onRequestGet({
      request: getRequest('?since=12'),
      env: { DB },
    });

    expect(response.status).toBe(204);
    expect(response.headers.get('X-Cadence-Stream-Revision')).toBe('12');
    expect(await response.text()).toBe('');
    expect(DB.calls.filter((call) => call.method === 'all')).toHaveLength(0);
  });

  it('returns the initial snapshot when revision zero is requested without since', async () => {
    const DB = fakeD1({
      stream: streamRow({
        revision: 0,
        sceneId: '',
        viewJson: null,
      }),
      state: null,
    });
    const response = await onRequestGet({ request: getRequest(), env: { DB } });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      stream: { id: 'stream-1', revision: 0 },
      view: null,
    });
  });

  it('rejects an obsolete write with the current value and version', async () => {
    const DB = fakeD1({
      state: indicatorRow({
        version: 5,
        valueJson: JSON.stringify({ current: 6 }),
        ownerValueJson: JSON.stringify({ current: 6 }),
      }),
    });
    const response = await onRequestPatch({
      request: patchRequest({
        sceneId: 'scene-1',
        participantId: 'hero-1',
        indicatorId: 'health',
        baseVersion: 4,
        value: { current: 3 },
      }),
      env: { DB },
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'INDICATOR_VERSION_CONFLICT' },
      revision: 12,
      stream: { id: 'stream-1', serverTime: expect.any(String) },
      indicator: {
        id: 'health',
        writable: true,
        version: 5,
        value: { current: 6 },
      },
    });
    expect(DB.calls.filter((call) => call.method === 'run')).toHaveLength(0);
  });

  it('rejects a write when server-side write permission is disabled', async () => {
    const DB = fakeD1({ state: indicatorRow({ writable: 0 }) });
    const response = await onRequestPatch({
      request: patchRequest({
        sceneId: 'scene-1',
        participantId: 'hero-1',
        indicatorId: 'health',
        baseVersion: 4,
        value: { current: 3 },
      }),
      env: { DB },
    });

    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({
      ok: false,
      error: { code: 'STREAM_WRITE_FORBIDDEN' },
    });
    expect(DB.calls.filter((call) => call.method === 'run')).toHaveLength(0);
  });

  it('returns independent outcomes for every indicator in one batch', async () => {
    const DB = fakeD1({
      state: indicatorRow({
        version: 5,
        valueJson: JSON.stringify({ current: 6 }),
        ownerValueJson: JSON.stringify({ current: 6 }),
      }),
    });
    const response = await onRequestPatch({
      request: patchRequest({
        changes: [{
          sceneId: 'scene-1',
          participantId: 'hero-1',
          indicatorId: 'health',
          baseVersion: 4,
          value: { current: 3 },
        }, {
          sceneId: 'scene-1',
          participantId: 'hero-1',
          indicatorId: 'missing',
          baseVersion: 1,
          value: { current: 1 },
        }],
      }),
      env: { DB },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      revision: 12,
      results: [{
        ok: false,
        status: 409,
        error: { code: 'INDICATOR_VERSION_CONFLICT' },
        indicator: { id: 'health', version: 5, value: { current: 6 } },
      }, {
        ok: false,
        status: 403,
        error: { code: 'STREAM_WRITE_FORBIDDEN' },
      }],
    });
  });

  it('rejects an oversized or empty write batch before touching indicators', async () => {
    const DB = fakeD1();
    const response = await onRequestPatch({
      request: patchRequest({ changes: [] }),
      env: { DB },
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: { code: 'STREAM_BATCH_INVALID' } });
    expect(DB.calls.some((call) => call.sql.includes('scene_stream_indicators'))).toBe(false);
  });
});
