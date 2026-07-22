import { describe, expect, it, vi } from 'vitest';
import { writeCadenceFile } from './campaignFilePersistence.js';

describe('writeCadenceFile', () => {
  it('does not open a writable file when write permission is denied', async () => {
    const handle = {
      queryPermission: vi.fn(async () => 'prompt'),
      requestPermission: vi.fn(async () => 'denied'),
      createWritable: vi.fn(),
    };

    await expect(writeCadenceFile(handle, '{"campaign":{}}')).resolves.toBe(false);
    expect(handle.createWritable).not.toHaveBeenCalled();
  });

  it('writes and closes the Cadence file before reporting success', async () => {
    const writable = { write: vi.fn(async () => {}), close: vi.fn(async () => {}) };
    const handle = { createWritable: vi.fn(async () => writable) };

    await expect(writeCadenceFile(handle, '{"campaign":{}}')).resolves.toBe(true);
    expect(writable.write).toHaveBeenCalledOnce();
    expect(writable.close).toHaveBeenCalledOnce();
  });
});
