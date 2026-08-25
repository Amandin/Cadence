import { describe, expect, it, vi } from 'vitest';
import { openCampaignFile, prefersStandardFileInput } from './campaignFileIO.js';

describe('campaign file picker mode', () => {
  const matchMedia = (matchesByQuery) => (query) => ({ matches: !!matchesByQuery[query] });

  it('uses the standard picker on the mobile breakpoint', () => {
    expect(prefersStandardFileInput(matchMedia({ '(max-width: 767px)': true }))).toBe(true);
  });

  it('uses the standard picker on coarse-pointer devices', () => {
    expect(prefersStandardFileInput(matchMedia({ '(pointer: coarse)': true }))).toBe(true);
  });

  it('keeps the writable picker on a desktop viewport', () => {
    expect(prefersStandardFileInput(matchMedia({}))).toBe(false);
  });
});

describe('campaign file picker', () => {
  it('uses the standard file input when the advanced picker is unavailable', async () => {
    const fallbackInput = { click: vi.fn() };
    const onFile = vi.fn();

    const result = await openCampaignFile({ fallbackInput, onFile });

    expect(result).toEqual({ method: 'input' });
    expect(fallbackInput.click).toHaveBeenCalledOnce();
    expect(onFile).not.toHaveBeenCalled();
  });

  it('keeps the writable handle when the advanced picker works', async () => {
    const file = { name: 'campagne.cad' };
    const handle = { getFile: vi.fn(async () => file) };
    const picker = vi.fn(async () => [handle]);
    const fallbackInput = { click: vi.fn() };
    const onFile = vi.fn(async () => {});

    const result = await openCampaignFile({ picker, fallbackInput, description: 'Campagne test', onFile });

    expect(result).toEqual({ method: 'picker' });
    expect(picker).toHaveBeenCalledWith({ multiple: false, types: [{ description: 'Campagne test', accept: { 'application/json': ['.cad'] } }] });
    expect(onFile).toHaveBeenCalledWith(file, { handle });
    expect(fallbackInput.click).not.toHaveBeenCalled();
  });

  it('falls back to the standard input when the advanced picker fails', async () => {
    const picker = vi.fn(async () => { throw new TypeError('Picker unsupported on this device'); });
    const fallbackInput = { click: vi.fn() };
    const onFile = vi.fn();

    const result = await openCampaignFile({ picker, fallbackInput, onFile });

    expect(result).toEqual({ method: 'input', fallback: true });
    expect(fallbackInput.click).toHaveBeenCalledOnce();
    expect(onFile).not.toHaveBeenCalled();
  });

  it('does not reopen a picker after a user cancellation', async () => {
    const picker = vi.fn(async () => { throw new DOMException('Cancelled', 'AbortError'); });
    const fallbackInput = { click: vi.fn() };

    const result = await openCampaignFile({ picker, fallbackInput, onFile: vi.fn() });

    expect(result).toEqual({ cancelled: true });
    expect(fallbackInput.click).not.toHaveBeenCalled();
  });
});
