import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Suivi } from './Suivi.jsx';

const baseClock = {
  id: 'clock',
  type: 'clock',
  name: 'Horloge',
  current: 2,
  min: 0,
  max: 6,
  step: 1,
  autoReset: 'activation',
  frozen: false,
};

describe('Suivi clock metronome', () => {
  it('shows an animated freeze button for every automated clock', () => {
    const html = renderToStaticMarkup(<Suivi suivi={{ ...baseClock, freezeAllowed: false }} onModifier={() => {}} onSupprimer={() => {}} />);
    expect(html).toContain('freeze-btn');
    expect(html).toContain('is-running');
    expect(html).toContain('Figer cet automatisme');
  });

  it('keeps the freeze button and stopped state when freezing is enabled', () => {
    const html = renderToStaticMarkup(<Suivi suivi={{ ...baseClock, freezeAllowed: true, frozen: true }} onModifier={() => {}} onSupprimer={() => {}} />);
    expect(html).toContain('freeze-btn active');
    expect(html).toContain('is-stopped');
  });
});

describe('Suivi accessible controls', () => {
  it('labels point controls and exposes their pressed state', () => {
    const html = renderToStaticMarkup(<Suivi suivi={{ id: 'points', type: 'points', name: 'Élan', current: 2, min: 0, max: 3, autoReset: 'never' }} onModifier={() => {}} onSupprimer={() => {}} />);
    expect(html).toContain('aria-label="Basculer le point 1 de Élan"');
    expect(html).toContain('aria-pressed="true"');
  });

  it('labels counter increment and decrement controls', () => {
    const html = renderToStaticMarkup(<Suivi suivi={{ id: 'counter', type: 'number', name: 'Ressources', current: 2, step: 1, autoReset: 'never' }} onModifier={() => {}} onSupprimer={() => {}} />);
    expect(html).toContain('aria-label="Diminuer Ressources"');
    expect(html).toContain('aria-label="Augmenter Ressources"');
  });
});
