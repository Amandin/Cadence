import { describe, expect, it } from 'vitest';
import baseSource from './translations.csv?raw';
import randomSource from './translations-random.csv?raw';
import { getAvailableLocales, t } from './index.js';

const applicationSources = import.meta.glob('../**/*.{js,jsx}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === ',' && !quoted) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

function placeholders(value) {
  return [...String(value || '').matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();
}

describe('i18n', () => {
  it('traduit toutes les cles litterales affichees par l interface', () => {
    const translatedKeys = new Set(
      [baseSource, randomSource].flatMap((source) => parseCsv(source).slice(1).map(([key]) => key)),
    );
    const missing = [];
    const literalTranslation = /(?<![A-Za-z0-9_$])t\(\s*(['"])([a-z][a-zA-Z0-9_.-]+)\1/g;

    Object.entries(applicationSources)
      .filter(([path]) => !path.includes('.test.'))
      .forEach(([path, source]) => {
        for (const match of String(source).matchAll(literalTranslation)) {
          if (!translatedKeys.has(match[2])) missing.push(`${match[2]} (${path})`);
        }
      });

    expect(missing).toEqual([]);
  });

  it('ne laisse pas de texte produit code en dur dans le JSX', () => {
    const rawText = [];
    const textNode = /<[A-Za-z][^>]*>\s*([A-Za-zÀ-ÖØ-öø-ÿ][^<>{}\n]*?)\s*</g;
    const literalAttribute = /\b(?:aria-label|title|placeholder)=(['"])([^'"{}]*[A-Za-zÀ-ÿ][^'"{}]*)\1/g;
    const allowedText = new Set(['Cadence', '×']);
    const developmentPages = ['StyleReferencePage.jsx', 'StyleReferenceSymbols.jsx', 'AdminPresetsPage.jsx', 'AdminPresetsPageForms.jsx'];

    Object.entries(applicationSources)
      .filter(([path]) => !path.includes('.test.') && !path.includes('.tests/') && !developmentPages.some((page) => path.endsWith(page)))
      .forEach(([path, source]) => {
        for (const match of String(source).matchAll(textNode)) {
          const value = match[1].trim();
          if (value && !allowedText.has(value)) rawText.push(`${value} (${path})`);
        }
        for (const match of String(source).matchAll(literalAttribute)) {
          if (!/^https?:\/\/\.\.\.$/.test(match[2])) rawText.push(`${match[2]} (${path})`);
        }
      });

    expect(rawText).toEqual([]);
  });

  it('garde les fichiers CSV bien formes', () => {
    const sources = [baseSource, randomSource];
    const keys = new Set();

    sources.forEach((source) => {
      const [header, ...records] = parseCsv(source);
      expect(header).toEqual(['key', 'fr']);

      records.forEach((record) => {
        expect(record).toHaveLength(header.length);
        const [key, ...values] = record;
        expect(key).not.toBe('');
        expect(keys.has(key)).toBe(false);
        keys.add(key);

        values.forEach((value) => {
          expect(String(value).trim()).not.toBe('');
          expect(placeholders(value)).toEqual(placeholders(values[0]));
        });
      });
    });
  });

  it('lit les textes depuis le CSV', () => {
    expect(getAvailableLocales()).toContain('fr');
    expect(t('common.add')).toBe('Ajouter');
  });

  it('stabilise les namespaces partages', () => {
    expect(t('menu.title')).toBe('Menu');
    expect(t('menu.returnHub')).toBe('Retour au hub de campagne');
    expect(t('dialogs.sceneIndicator.title')).toBe('Indicateur de scène');
    expect(t('dialogs.returnPreparation.title')).toBe('Retour à la Préparation');
    expect(t('dialogs.resetCadence.title')).toBe('Réinitialiser Cadence');
    expect(t('trackers.global.title')).toBe('Indicateur de scène');
    expect(t('trackers.global.templateLabel')).toBe('Modèle d’indicateur de scène');
    expect(t('trackers.step.label')).toBe('Pas');
    expect(t('trackers.common.frozen')).toBe('figé');
    expect(t('trackers.common.freezeAutomation')).toBe('Figer cet automatisme');
    expect(t('trackers.boxes.stepLabel')).toBe('Nombre de clics par case');
    expect(t('trackers.counter.edit', { label: 'Compteur' })).toBe('Modifier Compteur');
    expect(t('trackers.global.thresholds.help.counter')).toBe('Pour un compteur, les seuils lisent simplement la valeur courante.');
    expect(t('trackers.global.thresholds.target.loop', { value: 2, suffix: 's' })).toBe('cible : 2 boucles');
    expect(t('rules.compat.unavailableFlexible')).toBe('Indisponible en mode souple.');
    expect(t('rules.summary.declaration')).toBe('Déclaration puis résolution');
  });

  it('remplace les paramètres dans les textes', () => {
    expect(t('status.add.title', { name: 'Mira' })).toBe('Ajouter un état · Mira');
    expect(t('menu.brandMeta', { version: '0.10.0-work' })).toBe('Menu · v0.10.0-work');
  });

  it('stabilise les petites zones applicatives statiques', () => {
    expect(t('common.loading')).toBe('Chargement');
    expect(t('app.loading.preparing')).toBe('Cadence se prépare...');
    expect(t('errors.title')).toBe('Cadence a rencontré une erreur');
    expect(t('onboarding.title')).toBe('Configurer les règles de la table');
    expect(t('onboarding.family.system')).toBe('Systèmes');
    expect(t('onboarding.description')).toContain('règles courantes de D&D 5e');
    expect(t('onboarding.presets.systemNote')).toBe('Configurations compatibles, non officielles.');
    expect(t('rules.title')).toBe('Règles d’initiative');
    expect(t('rules.preset.saveTitle')).toBe('Enregistrer le preset');
    expect(t('rules.preset.family.generic')).toBe('Presets génériques');
    expect(t('rules.categories.delete', { category: 'Brioche' })).toBe('Supprimer Brioche');
    expect(t('common.create')).toBe('Créer');
    expect(t('common.remove')).toBe('Retirer');
    expect(t('common.expand')).toBe('Déplier');
    expect(t('common.validate')).toBe('Valider');
    expect(t('characterAdd.title')).toBe('Ajouter un personnage');
    expect(t('export.defaultName')).toBe('Campagne Cadence');
    expect(t('initiativeCost.defaultParticipant')).toBe('ce personnage');
    expect(t('initiativeAdjust.defaultParticipant')).toBe('ce participant');
    expect(t('reserve.empty')).toBe('Vide');
    expect(t('declarations.actions.attack')).toBe('Attaque');
    expect(t('sheet.tracker.reset')).toBe('Réinitialiser');
    expect(t('scene.status.active')).toBe('Actif');
    expect(t('scene.status.add')).toBe('+ état');
    expect(t('initiative.choose')).toBe('À choisir');
  });

  it('stabilise le namespace sheet pour la fenêtre d’édition', () => {
    expect(t('sheet.advancedOptions')).toBe('Options avancées');
    expect(t('sheet.defaultState')).toBe('État par défaut');
    expect(t('sheet.defaultState.min')).toBe('Minimum');
    expect(t('sheet.defaultState.custom')).toBe('Personnalisé');
    expect(t('sheet.currentValue', { value: 12 })).toBe('valeur actuelle : 12');
    expect(t('sheet.clock.direction')).toBe('Sens');
    expect(t('sheet.clock.direction.ascending')).toBe('Croissant');
    expect(t('sheet.clock.direction.descending')).toBe('Décroissant');
    expect(t('sheet.clock.segments')).toBe('Nombre de segments');
    expect(t('sheet.advanced.thresholds')).toBe('Seuils');
    expect(t('sheet.advanced.automatisms')).toBe('Automatisme');
    expect(t('sheet.reset.autoAdvance')).toBe('activer les automatismes');
    expect(t('sheet.reset.canFreeze')).toBe('peut être figé');
    expect(t('sheet.reset.when')).toBe('Déclenchement');
    expect(t('sheet.reset.when.round')).toBe('Début de round');
    expect(t('sheet.reset.when.activation')).toBe('À l’activation');
    expect(t('status.color')).toBe('Couleur');
    expect(t('status.tintParticipant')).toBe('Teinter le personnage');
    expect(t('status.tintScene')).toBe('Teinter le fond de scène');
    expect(t('sheet.reset.action.default')).toBe('Revenir à l’état par défaut');
    expect(t('sheet.reset.action.limit')).toBe('Jusqu’à la limite');
    expect(t('sheet.reset.action.always')).toBe('Toujours');
    expect(t('sheet.points.autoCounter')).toBe('Modifier le compteur');
    expect(t('sheet.validate')).toBe('Valider');
    expect(t('sheet.initiative.extra', { index: 3 })).toBe('Initiative 3');
    expect(t('sheet.actions.count', { count: 2 })).toBe('2 actions');
    expect(t('sheet.trackers.add')).toBe('Ajouter un indicateur');
    expect(t('sheet.character.hide')).toBe('dissimuler');
    expect(t('sheet.character.hideTitle')).toBe('Dissimuler la fiche');
    expect(t('sheet.character.revealTitle')).toBe('Ne plus dissimuler la fiche');
    expect(t('sheet.thresholds.targetValue', { value: 8 })).toBe('valeur cible : 8');
    expect(t('sheet.clock.endMode.overflow')).toBe('Dépasser avec zone rouge');
    expect(t('sheet.boxes.addBlock')).toBe('+ bloc');
  });

  it('stabilise les namespaces hub et templates', () => {
    expect(t('hub.tabs.scenes')).toBe('Scènes');
    expect(t('hub.campaigns.status.local')).toBe('Sauvegarde locale active.');
    expect(t('hub.campaigns.loadTest')).toBe('Charger la campagne de test');
    expect(t('templates.hub.title')).toBe('Modèles');
    expect(t('templates.error.categoryExists')).toBe('Cette catégorie existe déjà.');
    expect(t('campaign.status.localActive')).toBe('Sauvegarde locale active.');
    expect(t('templates.personnages.uncategorized')).toBe('Sans catégorie');
    expect(t('templates.sections.sceneCounters.title')).toBe('Indicateurs de scène');
    expect(t('templates.status.summary.duration', { impact: '[o] normal', duration: 3, rythme: 'round(s)' })).toBe('[o] normal | 3 round(s)');
    expect(t('templates.counterScene.timer', { minutes: 5 })).toBe('minuteur 5 min');
    expect(t('templates.editor.sceneCounter.title')).toBe("Modèle d'indicateur de scène");
    expect(t('templates.editor.saved', { name: 'Blessure' })).toBe('Blessure enregistr\u00e9 comme mod\u00e8le.');
    expect(t('templates.editor.tracker.saveCurrent')).toBe('Enregistrer cet indicateur comme mod\u00e8le');
    expect(t('templates.editor.status.saveCurrent')).toBe('Enregistrer comme mod\u00e8le');
    expect(t('templates.editor.sceneCounter.saveCurrent')).toBe('Enregistrer cet indicateur comme mod\u00e8le');
  });
});
