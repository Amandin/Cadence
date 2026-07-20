import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  FirstRunOnboarding,
  OnboardingRandomSetup,
  OnboardingStartActions,
  questionnaireSteps,
} from './FirstRunOnboarding.jsx';
import { onboardingAnswersFromRules, onboardingDefaultRules } from '../../domain/onboardingQuestionnaire.js';
import { createDefaultRandomSystemState } from '../../random-system/state.js';
import {
  createDnd5DefaultDefinitions,
  dnd5InitiativeDefinitionId,
} from '../../random-system/noCodeExamples.js';

function renderOnboarding(props = {}) {
  return renderToStaticMarkup(
    <FirstRunOnboarding
      dark={false}
      onToggleTheme={() => {}}
      onStartRules={() => {}}
      onStartCustomRules={() => {}}
      {...props}
    />,
  );
}

describe('FirstRunOnboarding', () => {
  it('opens directly on the campaign-rhythm questionnaire', () => {
    const html = renderOnboarding();

    expect(html).not.toContain('Étape 1 sur');
    expect(html).toContain('Comment les personnages prennent-ils leur tour');
    expect(html).toContain('Initiative classique');
    expect(html).toContain('Tours libres');
    expect(html).toContain('Rounds en plusieurs passes');
    expect(html).toContain('Round de surprise');
    expect(html).toContain('Déclaration puis résolution');
    expect(html).toContain('type="checkbox"');
    expect(html).not.toContain('Actions multiples');
    expect(html).toContain('Accéder aux règles avancées');
    expect(html).toContain('Passer rapidement');
    expect(html).toContain('Affiche un récapitulatif D&amp;D 5e avant d’appliquer la configuration.');
    expect(html).not.toContain('un prélude distinct');
    expect(html).not.toContain('Choisir une mécanique ou une famille');
    expect(html).toContain('Étape suivante');
    expect(html).not.toContain('Initiative seule');
  });

  it('warns before replacing existing campaign rules with the D&D 5e defaults', () => {
    const html = renderOnboarding({
      initialRules: { temporalite: 'souple', multipleActionMode: 'manual' },
      onCancel: () => {},
      offerSceneTutorial: false,
    });

    expect(html).toContain('Les règles actuelles seront remplacées');
    expect(html).toContain('Ce parcours repart du profil D&amp;D 5e');
    expect(html).toContain('Conserver les règles actuelles');
    expect(html).toContain('Initiative classique');
  });

  it('offers a direct start or the first-scene tutorial after the summary', () => {
    const html = renderToStaticMarkup(<OnboardingStartActions onStartDirect={() => {}} onStartTutorial={() => {}} />);
    expect(html).toContain('Suivre le tutoriel');
    expect(html).toContain('Commencer directement');
    expect(html).not.toContain('Quatre étapes guidées');
  });

  it('places the rules summary after the roll setup on first run', () => {
    const steps = questionnaireSteps(onboardingAnswersFromRules(onboardingDefaultRules), true);
    expect(steps.slice(-2).map((step) => step.id)).toEqual(['randomSetup', 'summary']);
    expect(questionnaireSteps(onboardingAnswersFromRules(onboardingDefaultRules), false).at(-1).id).toBe('summary');
  });

  it('lists available rolls and keeps advanced configuration optional', () => {
    const state = createDefaultRandomSystemState();
    const html = renderToStaticMarkup(
      <OnboardingRandomSetup
        randomSystem={{
          state,
          actions: {
            saveDefinition: (definition) => definition,
            deleteDefinition: () => true,
          },
        }}
        initiativeRequested
      />,
    );

    expect(html).toContain('Tirages disponibles');
    expect(html).toContain('Activez ou créez d’abord un tirage');
    expect(html).not.toContain('Syntaxe experte');
    expect(html).toContain('Accéder aux réglages avancés');
  });

  it('preselects the D&D5 starter rolls and uses the advantage d20 for initiative', () => {
    const state = createDefaultRandomSystemState();
    state.definitions = createDnd5DefaultDefinitions(state.sources);
    const html = renderToStaticMarkup(
      <OnboardingRandomSetup
        randomSystem={{
          state,
          actions: {
            saveDefinition: (definition) => definition,
            deleteDefinition: () => true,
          },
        }}
        initiativeRequested
        initiativeRollDefinitionId={dnd5InitiativeDefinitionId}
      />,
    );

    expect(html).toContain('d20 avec avantage et désavantage');
    expect(html).toContain('Jet de dés personnalisable');
    expect(html).toContain(`value="${dnd5InitiativeDefinitionId}" selected=""`);
  });
});
