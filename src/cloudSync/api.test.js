import { describe, expect, it, vi } from 'vitest';
import { cloudApi, CloudApiError } from './api.js';
import { campaignSyncSignature } from './useCloudSync.js';

function response(data, status = 200, contentType = 'application/json') {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => contentType },
    json: async () => data,
  };
}

describe('cloudApi', () => {
  it('sends the session cookie and CSRF token on campaign saves', async () => {
    const fetchImpl = vi.fn(async () => response({ ok: true, campaign: { revision: 2 } }));
    await cloudApi.saveCampaign({ format: 'cadence-campaign' }, 1, 'csrf-test', { fetchImpl });
    expect(fetchImpl).toHaveBeenCalledWith('/api/campaign', expect.objectContaining({
      method: 'PUT',
      credentials: 'include',
      headers: expect.objectContaining({ 'X-Cadence-CSRF': 'csrf-test' }),
    }));
  });

  it('preserves conflict metadata for the resolution UI', async () => {
    const campaign = { revision: 4, payload: { format: 'cadence-campaign' } };
    const fetchImpl = vi.fn(async () => response({
      ok: false,
      error: { code: 'REVISION_CONFLICT', message: 'Conflit' },
      campaign,
    }, 409));
    await expect(cloudApi.saveCampaign({}, 2, 'csrf', { fetchImpl })).rejects.toMatchObject({
      name: 'CloudApiError',
      code: 'REVISION_CONFLICT',
      status: 409,
      data: { campaign },
    });
  });

  it('detects a deployment without API functions', async () => {
    const fetchImpl = vi.fn(async () => response({}, 200, 'text/html'));
    await expect(cloudApi.session({ fetchImpl })).rejects.toBeInstanceOf(CloudApiError);
  });
});

describe('campaignSyncSignature', () => {
  it('ignores timestamps and application versions but detects campaign changes', () => {
    const base = { format: 'cadence-campaign', savedAt: 'a', appVersion: '1', scenes: [{ id: 'scene-1' }] };
    expect(campaignSyncSignature(base)).toBe(campaignSyncSignature({ ...base, savedAt: 'b', appVersion: '2' }));
    expect(campaignSyncSignature(base)).not.toBe(campaignSyncSignature({ ...base, scenes: [{ id: 'scene-2' }] }));
  });
});
