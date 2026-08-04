import { describe, expect, it, vi } from 'vitest';
import {
  StreamApiError,
  retryAfterMilliseconds,
  streamApi,
  streamRouteRequested,
  streamTokenFromLocation,
} from './api.js';

const VALID_TOKEN = 'a'.repeat(43);

function response(data, status = 200, headers = { 'Content-Type': 'application/json' }) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        const entry = Object.entries(headers)
          .find(([header]) => header.toLowerCase() === String(name).toLowerCase());
        return entry?.[1] ?? null;
      },
    },
    json: async () => data,
  };
}

describe('stream URL', () => {
  it('extracts a valid token from the stream fragment', () => {
    const location = { hash: `#/stream/${VALID_TOKEN}` };

    expect(streamRouteRequested(location)).toBe(true);
    expect(streamTokenFromLocation(location)).toBe(VALID_TOKEN);
    expect(streamTokenFromLocation({ hash: `#/stream/${VALID_TOKEN}/` })).toBe(VALID_TOKEN);
  });

  it.each([
    '#/stream/',
    `#/stream/${'a'.repeat(42)}`,
    `#/stream/${'a'.repeat(44)}`,
    `#/stream/${'a'.repeat(42)}!`,
    `#/other/${VALID_TOKEN}`,
    `#/stream/${VALID_TOKEN}?extra=1`,
  ])('rejects the invalid stream fragment %s', (hash) => {
    expect(streamTokenFromLocation({ hash })).toBe('');
  });
});

describe('streamApi guest requests', () => {
  it('parses numeric and HTTP-date Retry-After values', () => {
    const now = Date.parse('2026-08-01T12:00:00.000Z');
    expect(retryAfterMilliseconds('10', now)).toBe(10_000);
    expect(retryAfterMilliseconds('Sat, 01 Aug 2026 12:00:15 GMT', now)).toBe(15_000);
    expect(retryAfterMilliseconds('invalid', now)).toBe(0);
  });

  it('recognizes an edge-generated non-JSON 429 and preserves Retry-After', async () => {
    const fetchImpl = vi.fn(async () => response(null, 429, {
      'Content-Type': 'text/html',
      'Retry-After': '10',
    }));

    await expect(streamApi.guest(VALID_TOKEN, 12, { fetchImpl })).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: 10_000,
    });
  });

  it('uses the WAF mitigation window when a 429 omits Retry-After', async () => {
    const fetchImpl = vi.fn(async () => response(null, 429, {
      'Content-Type': 'text/html',
    }));

    await expect(streamApi.write(VALID_TOKEN, {}, { fetchImpl })).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: 10_000,
    });
  });

  it('uses a Bearer token without sending credentials', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, view: { scene: { id: 'scene-1' } } }));

    await streamApi.guest(VALID_TOKEN, 12, { fetchImpl });

    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith('/api/stream?since=12', expect.objectContaining({
      method: 'GET',
      credentials: 'omit',
      headers: expect.objectContaining({ Authorization: `Bearer ${VALID_TOKEN}` }),
    }));
  });

  it('turns a 204 response into a minimal unchanged result', async () => {
    const fetchImpl = vi.fn(async () => response(null, 204, {
      'X-Cadence-Stream-Revision': '37',
    }));

    await expect(streamApi.guest(VALID_TOKEN, 37, { fetchImpl })).resolves.toEqual({
      ok: true,
      unchanged: true,
      revision: 37,
    });
  });

  it('preserves the current indicator returned with a version conflict', async () => {
    const indicator = {
      id: 'health',
      version: 8,
      value: { current: 6 },
      writable: true,
    };
    const conflict = {
      ok: false,
      error: { code: 'INDICATOR_VERSION_CONFLICT', message: 'Version obsolète' },
      revision: 19,
      indicator,
    };
    const fetchImpl = vi.fn(async () => response(conflict, 409));

    const request = streamApi.write(VALID_TOKEN, {
      sceneId: 'scene-1',
      participantId: 'hero-1',
      indicatorId: 'health',
      baseVersion: 7,
      value: { current: 5 },
    }, { fetchImpl });

    await expect(request).rejects.toMatchObject({
      name: 'StreamApiError',
      status: 409,
      code: 'INDICATOR_VERSION_CONFLICT',
      data: conflict,
    });
    await expect(request).rejects.toBeInstanceOf(StreamApiError);
    expect(fetchImpl).toHaveBeenCalledWith('/api/stream', expect.objectContaining({
      method: 'PATCH',
      credentials: 'omit',
      headers: expect.objectContaining({ Authorization: `Bearer ${VALID_TOKEN}` }),
    }));
  });

  it('sends several indicator values in one PATCH request', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, revision: 15, results: [] }));
    const changes = [{
      sceneId: 'scene-1',
      participantId: 'hero-1',
      indicatorId: 'health',
      baseVersion: 4,
      value: { current: 6 },
    }, {
      sceneId: 'scene-1',
      participantId: 'hero-1',
      indicatorId: 'mana',
      baseVersion: 8,
      value: { current: 3 },
    }];

    await streamApi.writeBatch(VALID_TOKEN, changes, { fetchImpl });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init).toMatchObject({ method: 'PATCH', credentials: 'omit' });
    expect(JSON.parse(init.body)).toEqual({ changes });
  });
});

describe('streamApi owner publication', () => {
  it('toggles the current link without creating a new token', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, stream: { id: 'stream-1', paused: true } }));

    await streamApi.setLinkEnabled('stream-1', false, 'csrf-1', { fetchImpl });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init).toMatchObject({
      method: 'PATCH',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-Cadence-CSRF': 'csrf-1' }),
    });
    expect(JSON.parse(init.body)).toEqual({ streamId: 'stream-1', enabled: false });
  });

  it('binds a publication to the current link identifier', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, stream: { id: 'stream-1' } }));
    const scene = { id: 'scene-1', participants: [] };

    await streamApi.publish(scene, 'csrf-1', {
      streamId: 'stream-1',
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0];
    expect(init).toMatchObject({
      method: 'PUT',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-Cadence-CSRF': 'csrf-1' }),
    });
    expect(JSON.parse(init.body)).toEqual({ streamId: 'stream-1', scene });
  });
});
