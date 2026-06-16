import { describe, expect, it } from 'vitest';
import { getAvailableLocales, t } from './index.js';

describe('i18n', () => {
  it('lit les textes depuis le CSV', () => {
    expect(getAvailableLocales()).toContain('fr');
    expect(t('common.add')).toBe('Ajouter');
  });

  it('stabilise les namespaces partages', () => {
    expect(t('menu.title')).toBe('Menu');
    expect(t('menu.returnHub')).toBe('Retour au hub de campagne');
    expect(t('dialogs.sceneIndicator.title')).toBe('Indicateur de scène');
    expect(t('dialogs.returnPreparation.title')).toBe('Retour à la Préparation');
    expect(t('trackers.global.title')).toBe('Indicateur de scène');
    expect(t('trackers.global.templateLabel')).toBe('Modèle d’indicateur de scène');
    expect(t('trackers.step.label')).toBe('Pas');
    expect(t('trackers.clock.freeze')).toBe('Figer cette horloge');
    expect(t('trackers.boxes.stepLabel')).toBe('Nombre de clics par case');
    expect(t('trackers.counter.edit', { label: 'Compteur' })).toBe('Modifier Compteur');
    expect(t('trackers.global.thresholds.help.counter')).toBe('Pour un compteur, les seuils lisent simplement la valeur courante.');
    expect(t('trackers.global.thresholds.target.loop', { value: 2, suffix: 's' })).toBe('cible : 2 boucles');
    expect(t('rules.compat.unavailableFlexible')).toBe('Indisponible en mode souple.');
    expect(t('rules.summary.declaration')).toBe('Déclaration puis résolution');
  });

  it('remplace les paramètres dans les textes', () => {
    expect(t('status.add.title', { name: 'Mira' })).toBe('Ajouter un état · Mira');
    expect(t('menu.brandMeta', { version: '0.8.30-work' })).toBe('Menu · v0.8.30-work');
  });

  it('stabilise les petites zones applicatives statiques', () => {
    expect(t('common.loading')).toBe('Chargement');
    expect(t('app.loading.preparing')).toBe('Cadence se prépare...');
    expect(t('errors.title')).toBe('Cadence a rencontré une erreur');
    expect(t('onboarding.title')).toBe('Choisis comment commencer');
    expect(t('onboarding.family.system')).toBe('Systèmes');
    expect(t('onboarding.description')).toContain('preset générique');
    expect(t('onboarding.presets.systemNote')).toBe('Configurations compatibles, non officielles.');
    expect(t('rules.title')).toBe('Règles d’initiative');
    expect(t('rules.preset.saveTitle')).toBe('Enregistrer le preset');
    expect(t('rules.preset.family.generic')).toBe('Presets génériques');
    expect(t('rules.categories.delete', { category: 'Brioche' })).toBe('Supprimer Brioche');
    expect(t('common.create')).toBe('Créer');
    expect(t('common.remove')).toBe('Retirer');
    expect(t('common.expand')).toBe('Dérouler');
    expect(t('characterAdd.title')).toBe('Ajouter un personnage');
    expect(t('export.defaultName')).toBe('Campagne Cadence');
    expect(t('initiativeCost.defaultParticipant')).toBe('ce personnage');
    expect(t('initiativeAdjust.defaultParticipant')).toBe('ce participant');
    expect(t('declarations.actions.attack')).toBe('Attaque');
    expect(t('sheet.tracker.reset')).toBe('Réinitialiser');
    expect(t('scene.status.active')).toBe('Actif');
    expect(t('initiative.choose')).toBe('À choisir');
  });

  it('stabilise le namespace sheet pour la fenêtre d’édition', () => {
    expect(t('sheet.advancedOptions')).toBe('Options avancées');
    expect(t('sheet.validate')).toBe('Valider');
    expect(t('sheet.initiative.extra', { index: 3 })).toBe('Initiative 3');
    expect(t('sheet.actions.count', { count: 2 })).toBe('2 actions');
    expect(t('sheet.trackers.add')).toBe('Ajouter un indicateur');
    expect(t('sheet.thresholds.targetValue', { value: 8 })).toBe('valeur cible : 8');
    expect(t('sheet.clock.endMode.overflow')).toBe('Dépasser avec zone rouge');
    expect(t('sheet.boxes.addBlock')).toBe('+ bloc');
  });

  it('stabilise les namespaces hub et templates', () => {
    expect(t('hub.tabs.scenes')).toBe('Scènes');
    expect(t('hub.campaigns.status.local')).toBe('Sauvegarde locale active.');
    expect(t('templates.hub.title')).toBe('Modèles');
    expect(t('templates.personnages.uncategorized')).toBe('Sans catégorie');
    expect(t('templates.sections.sceneCounters.title')).toBe('Indicateurs de scène');
    expect(t('templates.status.summary.duration', { impact: '[o] normal', duration: 3, rythme: 'round(s)' })).toBe('[o] normal | 3 round(s)');
    expect(t('templates.counterScene.timer', { minutes: 5 })).toBe('minuteur 5 min');
    expect(t('templates.editor.sceneCounter.title')).toBe("Modèle d'indicateur de scène");
  });
});
