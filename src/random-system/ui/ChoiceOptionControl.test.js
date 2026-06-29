import { describe, expect, it } from 'vitest';
import { choiceControlKind } from './ChoiceOptionControl.jsx';

describe('RandomSystem choice option control', () => {
  it('adapts to the number of configured choices', () => {
    expect(choiceControlKind(1)).toBe('hidden');
    expect(choiceControlKind(2)).toBe('switch');
    expect(choiceControlKind(3)).toBe('slider');
    expect(choiceControlKind(5)).toBe('slider');
    expect(choiceControlKind(6)).toBe('select');
  });

  it('honors an explicit presentation when it fits the choices', () => {
    expect(choiceControlKind(2, 'select')).toBe('select');
    expect(choiceControlKind(3, 'slider')).toBe('slider');
    expect(choiceControlKind(2, 'switch')).toBe('switch');
    expect(choiceControlKind(3, 'switch')).toBe('slider');
  });
});
