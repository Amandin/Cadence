export class CloudApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', data = null } = {}) {
    super(message);
    this.name = 'CloudApiError';
    this.status = status;
    this.code = code;
    this.data = data;
  }
}

async function apiRequest(path, { method = 'GET', body, csrfToken, fetchImpl = globalThis.fetch } = {}) {
  let response;
  try {
    response = await fetchImpl(path, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(csrfToken ? { 'X-Cadence-CSRF': csrfToken } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    throw new CloudApiError('Le service de synchronisation est inaccessible.', { data: error });
  }

  const contentType = response.headers?.get?.('Content-Type') || '';
  if (!contentType.includes('application/json')) {
    throw new CloudApiError('Le service de synchronisation n’est pas configuré sur ce déploiement.', { status: response.status });
  }
  const data = await response.json();
  if (!response.ok || data?.ok === false) {
    throw new CloudApiError(data?.error?.message || 'La synchronisation a échoué.', {
      status: response.status,
      code: data?.error?.code,
      data,
    });
  }
  return data;
}

export const cloudApi = {
  session(options) {
    return apiRequest('/api/auth/session', options);
  },
  login(username, password, options) {
    return apiRequest('/api/auth/login', { ...options, method: 'POST', body: { username, password } });
  },
  logout(csrfToken, options) {
    return apiRequest('/api/auth/logout', { ...options, method: 'POST', csrfToken });
  },
  campaign(options) {
    return apiRequest('/api/campaign', options);
  },
  saveCampaign(payload, baseRevision, csrfToken, options) {
    return apiRequest('/api/campaign', {
      ...options,
      method: 'PUT',
      body: { payload, baseRevision },
      csrfToken,
    });
  },
};
