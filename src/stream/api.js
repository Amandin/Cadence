import { SCENE_STREAM_TOKEN_PATTERN } from '../../shared/scene-stream-protocol.js';

export class StreamApiError extends Error {
  constructor(message, {
    status = 0,
    code = 'NETWORK_ERROR',
    data = null,
    retryAfterMs = 0,
  } = {}) {
    super(message);
    this.name = 'StreamApiError';
    this.status = status;
    this.code = code;
    this.data = data;
    this.retryAfterMs = retryAfterMs;
  }
}

export function retryAfterMilliseconds(value, now = Date.now()) {
  if (typeof value !== 'string' || value.trim() === '') return 0;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.ceil(seconds * 1_000);
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.max(0, date - now) : 0;
}

async function streamRequest(path, {
  method = 'GET',
  body,
  csrfToken,
  bearerToken,
  keepalive = false,
  credentials = 'include',
  fetchImpl = globalThis.fetch,
} = {}) {
  let response;
  try {
    response = await fetchImpl(path, {
      method,
      credentials,
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-Cadence-CSRF': csrfToken } : {}),
        ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
      },
      keepalive,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new StreamApiError('La diffusion est momentanément inaccessible.', { data: error });
  }

  if (response.status === 204) {
    return {
      ok: true,
      unchanged: true,
      revision: Number(response.headers?.get?.('X-Cadence-Stream-Revision') || 0),
    };
  }

  if (response.status === 429) {
    throw new StreamApiError('La diffusion reçoit trop de requêtes. La dernière valeur sera renvoyée automatiquement.', {
      status: 429,
      code: 'RATE_LIMITED',
      retryAfterMs: retryAfterMilliseconds(response.headers?.get?.('Retry-After')) || 10_000,
    });
  }

  const contentType = response.headers?.get?.('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new StreamApiError('La diffusion n’est pas configurée sur ce déploiement.', { status: response.status });
  }
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new StreamApiError(data?.error?.message || 'La synchronisation de la diffusion a échoué.', {
      status: response.status,
      code: data?.error?.code,
      data,
    });
  }
  return data;
}

export const streamApi = {
  link(options) {
    return streamRequest('/api/stream/link', options);
  },
  createLink(csrfToken, options = {}) {
    return streamRequest('/api/stream/link', { ...options, method: 'POST', csrfToken });
  },
  revokeLink(csrfToken, options = {}) {
    return streamRequest('/api/stream/link', { ...options, method: 'DELETE', csrfToken });
  },
  setLinkEnabled(streamId, enabled, csrfToken, options = {}) {
    return streamRequest('/api/stream/link', {
      ...options,
      method: 'PATCH',
      body: { streamId, enabled },
      csrfToken,
    });
  },
  owner(since, options = {}) {
    const query = Number.isInteger(since) ? `?since=${since}` : '';
    return streamRequest(`/api/stream/owner${query}`, options);
  },
  publish(scene, csrfToken, options = {}) {
    const { streamId, ...requestOptions } = options;
    return streamRequest('/api/stream/owner', {
      ...requestOptions,
      method: 'PUT',
      body: { streamId, scene },
      csrfToken,
    });
  },
  guest(token, since, options = {}) {
    const query = Number.isInteger(since) ? `?since=${since}` : '';
    return streamRequest(`/api/stream${query}`, {
      ...options,
      bearerToken: token,
      credentials: 'omit',
    });
  },
  write(token, change, options = {}) {
    return streamRequest('/api/stream', {
      ...options,
      method: 'PATCH',
      body: change,
      bearerToken: token,
      credentials: 'omit',
    });
  },
  writeBatch(token, changes, options = {}) {
    return streamRequest('/api/stream', {
      ...options,
      method: 'PATCH',
      body: { changes },
      bearerToken: token,
      credentials: 'omit',
    });
  },
};

export function streamTokenFromLocation(location = globalThis.location) {
  const hash = String(location?.hash || '');
  const match = hash.match(/^#\/stream\/([A-Za-z0-9_-]+)\/?$/);
  return match && SCENE_STREAM_TOKEN_PATTERN.test(match[1]) ? match[1] : '';
}

export function streamRouteRequested(location = globalThis.location) {
  return /^#\/stream(?:\/|$)/.test(String(location?.hash || ''));
}

export function streamShareUrl(token, location = globalThis.location) {
  if (!SCENE_STREAM_TOKEN_PATTERN.test(token || '')) return '';
  return `${location.origin}${location.pathname || '/'}#/stream/${token}`;
}
