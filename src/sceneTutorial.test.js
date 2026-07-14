import { describe, expect, it } from 'vitest';
import { advanceSceneTutorial } from './sceneTutorial.js';

describe('first scene tutorial', () => {
  it('advances only when the real creation interfaces are opened', () => {
    expect(advanceSceneTutorial({ active: true, step: 0 }, { participants: [] }, { addSheetOpen: false }).step).toBe(0);
    expect(advanceSceneTutorial({ active: true, step: 0 }, { participants: [] }, { addSheetOpen: true }).step).toBe(1);
    expect(advanceSceneTutorial({ active: true, step: 1 }, { participants: [] }, { editingCharacter: true }).step).toBe(2);
  });

  it('finishes character creation only after the real editor closes', () => {
    expect(advanceSceneTutorial({ active: true, step: 6 }, { participants: [{ id: 'hero' }] }, { editingCharacter: true }).step).toBe(6);
    expect(advanceSceneTutorial({ active: true, step: 6 }, { participants: [{ id: 'hero' }] }, { editingCharacter: false }).step).toBe(7);
  });
});
