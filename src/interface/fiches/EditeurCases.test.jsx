import { describe, expect, it } from 'vitest';
import { nouveauSuiviPourMode } from './EditeurCases.jsx';

describe('nouveauSuiviPourMode', () => {
  it('creates the selected tracker type for a custom indicator', () => {
    expect(nouveauSuiviPourMode('clock')).toMatchObject({ type: 'clock', name: 'Horloge' });
    expect(nouveauSuiviPourMode('boxes')).toMatchObject({ type: 'boxes', name: 'Cases' });
  });

  it('disables activation automation when it is unavailable', () => {
    expect(nouveauSuiviPourMode('clock', false).autoReset).toBe('never');
  });
});
