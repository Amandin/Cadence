import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { APP_VERSION } from './constants.js';

async function readText(path) {
  return readFile(new URL(path, import.meta.url), 'utf8');
}

describe('version consistency', () => {
  it('keeps package, app constants and service worker cache version aligned', async () => {
    const packageJson = JSON.parse(await readText('../package.json'));
    const serviceWorker = await readText('../public/service-worker.js');
    const serviceWorkerVersion = serviceWorker.match(/const APP_VERSION = '([^']+)'/)?.[1];

    expect(APP_VERSION).toBe(packageJson.version);
    expect(serviceWorkerVersion).toBe(packageJson.version);
  });
});
