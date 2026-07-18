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
    expect(html).toContain('Passer la configuration');
    expect(html).toContain('Cadence utilisera les règles courantes de D&amp;D 5e');
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

  it('places the no-code setup after the rules summary on first run', () => {
    const steps = questionnaireSteps(onboardingAnswersFromRules(onboardingDefaultRules), true);
    expect(steps.slice(-2).map((step) => step.id)).toEqual(['summary', 'randomSetup']);
    expect(questionnaireSteps(onboardingAnswersFromRules(onboardingDefaultRules), false).at(-1).id).toBe('summary');
  });

  it('embeds the essential no-code editor and requires a saved initiative roll when requested', () => {
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

    expect(html).toContain('Quels jets veux-tu préparer');
    expect(html).toContain('Essentiel');
    expect(html).toContain('Toutes les options');
    expect(html).toContain('Crée et enregistre d’abord un jet');
    expect(html).not.toContain('Syntaxe experte');
    expect(html).not.toContain('Options avancées');
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
    expect(html).toContain('Dés standards');
    expect(html).toContain(`value="${dnd5InitiativeDefinitionId}" selected=""`);
  });
});
