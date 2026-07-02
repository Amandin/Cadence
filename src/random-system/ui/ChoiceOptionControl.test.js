import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ChoiceOptionControl, choiceControlKind } from './ChoiceOptionControl.jsx';

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

  it('renders three modes as ordered segments with the default in the middle', () => {
    const html = renderToStaticMarkup(createElement(ChoiceOptionControl, {
      option: {
        id: 'mode',
        label: 'Mode',
        control: 'slider',
        choices: [
          { value: 'disadvantage', label: 'Désavantage' },
          { value: 'normal', label: 'Normal' },
          { value: 'advantage', label: 'Avantage' },
        ],
      },
      value: 'normal',
      onChange: () => {},
    }));

    expect(html.indexOf('Désavantage')).toBeLessThan(html.indexOf('Normal'));
    expect(html.indexOf('Normal')).toBeLessThan(html.indexOf('Avantage'));
    expect(html).toContain('aria-pressed="true">Normal</button>');
  });
});
