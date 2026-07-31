import { describe, expect, it } from 'vitest';
import {
  applyCampaignPatch,
  campaignContentHash,
  campaignSyncSignature,
  createCampaignPatch,
  serializedBytes,
  validateCampaignPatch,
} from './cloud-sync-protocol.js';

describe('cloud sync protocol', () => {
  it('ignores volatile metadata in signatures and hashes', async () => {
    const base = { format: 'cadence-campaign', savedAt: 'a', appVersion: '1', scenes: [{ id: 'one' }] };
    const changedMetadata = { ...base, savedAt: 'b', appVersion: '2' };
    expect(campaignSyncSignature(base)).toBe(campaignSyncSignature(changedMetadata));
    expect(await campaignContentHash(base)).toBe(await campaignContentHash(changedMetadata));
  });

  it('creates a small nested patch and reconstructs the next campaign', () => {
    const previous = {
      format: 'cadence-campaign',
      schemaVersion: 2,
      scenes: [{ id: 'one', title: 'Avant', participants: [{ id: 'p1', hp: 10 }] }],
    };
    const next = structuredClone(previous);
    next.scenes[0].participants[0].hp = 7;
    const patch = createCampaignPatch(previous, next);
    expect(patch.operations).toEqual([{ op: 'set', path: ['scenes', 0, 'participants', 0, 'hp'], value: 7 }]);
    expect(applyCampaignPatch(previous, patch)).toEqual(next);
    expect(serializedBytes(patch)).toBeLessThan(serializedBytes(next));
  });

  it('replaces arrays when their length changes', () => {
    const previous = { scenes: [{ id: 'one' }] };
    const next = { scenes: [{ id: 'one' }, { id: 'two' }] };
    const patch = createCampaignPatch(previous, next);
    expect(patch.operations).toEqual([{ op: 'set', path: ['scenes'], value: next.scenes }]);
    expect(applyCampaignPatch(previous, patch)).toEqual(next);
  });

  it('rejects prototype-polluting paths', () => {
    expect(validateCampaignPatch({
      version: 1,
      operations: [{ op: 'set', path: ['__proto__', 'polluted'], value: true }],
    })).toBe(false);
  });
});
