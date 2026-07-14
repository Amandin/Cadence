import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { systemProfileCatalog } from '../../domain/systemProfiles.js';
import { FirstRunOnboarding, OnboardingStartActions } from './FirstRunOnboarding.jsx';

function renderOnboarding() {
  return renderToStaticMarkup(
    <FirstRunOnboarding
      dark={false}
      systemProfiles={systemProfileCatalog}
      onToggleTheme={() => {}}
      onStartProfile={() => {}}
      onStartCustomRules={() => {}}
    />,
  );
}

describe('FirstRunOnboarding', () => {
  it('shows one welcoming step at a time instead of a long setup form', () => {
    const html = renderOnboarding();

    expect(html).toContain('Étape 1 sur 4');
    expect(html).toContain('Choisir une mécanique ou une famille');
    expect(html).not.toContain('Choisir un style d’initiative');
    expect(html).not.toContain('Votre table est prête');
    expect(html).toContain('Étape suivante');
  });

  it('offers a direct start or the first-scene tutorial after the summary', () => {
    const html = renderToStaticMarkup(<OnboardingStartActions onStartDirect={() => {}} onStartTutorial={() => {}} />);
    expect(html).toContain('Suivre le tutoriel');
    expect(html).toContain('Commencer directement');
    expect(html).not.toContain('Quatre étapes guidées');
  });
});
