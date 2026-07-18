import { expect, test } from '@playwright/test';
import path from 'node:path';
import { makeTestCampaign } from '../../src/logic.js';
import { createStandardSources, standardSourceIds } from '../../src/random-system/defaults.js';
import { fixedValue, parameterValue } from '../../src/random-system/core/references.js';

// This suffix keeps Playwright scenarios outside Vitest's *.spec.js discovery.

const STORAGE_KEY = 'cadence:campaign:v1';
const ONBOARDING_KEY = 'cadence:onboarding:first-run:v1';
const THEME_KEY = 'cadence:interface:theme-override:v1';
const PERFORMANCE_KEY = 'cadence:performance:preference:v1';
const VIEW_KEY = 'cadence:interface:view:v1';
const SCENE_INDEX_KEY = 'cadence:interface:scene-index:v1';
const HUB_TAB_KEY = 'cadence:interface:hub-tab:v1';
const SCREENSHOT_STYLE_PATH = path.resolve('tests/visual/screenshot.css');

const viewports = {
  narrow: { width: 320, height: 720 },
  reference: { width: 390, height: 844 },
  wide: { width: 1440, height: 900 },
};

const surfaceState = {
  hub: { view: 'hub', tab: 'scenes' },
  random: { view: 'hub', tab: 'tirages' },
  rules: { view: 'hub', tab: 'regles' },
  models: { view: 'hub', tab: 'templates' },
  scene: { view: 'scene', tab: 'scenes' },
  modal: { view: 'scene', tab: 'scenes' },
  configuration: { view: 'hub', tab: 'regles' },
};

const referenceSurfaces = ['hub', 'random', 'rules', 'models', 'scene', 'modal'];
const scenarios = [
  ...['light', 'dark'].flatMap((theme) => referenceSurfaces.map((surface) => ({
    surface,
    theme,
    viewport: 'reference',
  }))),
  ...['hub', 'random', 'scene'].map((surface) => ({
    surface,
    theme: 'dark',
    viewport: 'narrow',
  })),
  ...['hub', 'random', 'scene', 'configuration'].map((surface) => ({
    surface,
    theme: 'dark',
    viewport: 'wide',
  })),
];

function visualCampaign() {
  const campaign = makeTestCampaign();
  const firstScene = campaign.scenes[0];
  firstScene.round = 1;
  firstScene.activeId = 'creature-vive';
  return {
    ...campaign,
    format: 'cadence-campaign',
    schemaVersion: 2,
    savedAt: '2026-01-01T12:00:00.000Z',
    randomSystem: {
      schemaVersion: 14,
      sources: createStandardSources(),
      definitions: [{
        id: 'visual-d20-check',
        kind: 'roll',
        name: 'Test au d20',
        visualId: 'd20',
        active: true,
        exposed: true,
        parameters: [{
          id: 'modifier',
          label: 'Modificateur',
          type: 'integer',
          defaultValue: 0,
          min: -20,
          max: 20,
        }],
        options: [],
        components: [{
          id: 'd20',
          label: 'd20',
          source: fixedValue(standardSourceIds.D20),
          count: fixedValue(1),
        }],
        pipeline: [
          {
            id: 'total',
            type: 'aggregate',
            operation: 'sum',
            outputId: 'total',
            label: 'Total',
          },
          {
            id: 'modifier',
            type: 'modifier',
            targetAggregateId: 'total',
            value: parameterValue('modifier'),
            label: 'Modificateur',
          },
        ],
        primaryAggregateId: 'total',
      }],
      sourceStates: {},
      randomKits: [],
      lastResult: null,
      history: [],
    },
  };
}

async function prepareStorage(page, { surface, theme }) {
  const state = surfaceState[surface];
  await page.addInitScript(
    ({ payload, keys, selectedTheme, view, tab }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(keys.storage, JSON.stringify(payload));
      localStorage.setItem(keys.onboarding, 'done');
      localStorage.setItem(keys.theme, selectedTheme);
      localStorage.setItem(keys.performance, 'normal');
      sessionStorage.setItem(keys.view, view);
      sessionStorage.setItem(keys.sceneIndex, '0');
      sessionStorage.setItem(keys.hubTab, tab);
    },
    {
      payload: visualCampaign(),
      keys: {
        storage: STORAGE_KEY,
        onboarding: ONBOARDING_KEY,
        theme: THEME_KEY,
        performance: PERFORMANCE_KEY,
        view: VIEW_KEY,
        sceneIndex: SCENE_INDEX_KEY,
        hubTab: HUB_TAB_KEY,
      },
      selectedTheme: theme,
      view: state.view,
      tab: state.tab,
    },
  );
}

async function waitForSurface(page, surface) {
  await expect(page.locator('.initial-loading-shell')).toHaveCount(0);
  if (surface === 'hub') await expect(page.locator('.hub-scene-card').filter({ hasText: 'Rencontre simple' })).toBeVisible();
  if (surface === 'random') await expect(page.locator('.rs-result-view')).toBeVisible();
  if (surface === 'rules') await expect(page.getByRole('heading', { name: 'Règles d’initiative' })).toBeVisible();
  if (surface === 'models') await expect(page.getByRole('navigation', { name: 'Modèles' })).toBeVisible();
  if (surface === 'scene' || surface === 'modal') await expect(page.locator('.scene-main')).toBeVisible();
  if (surface === 'configuration') {
    await page.getByRole('button', { name: 'Types de tirage', exact: true }).click();
    await expect(page.locator('.rs-config-workspace')).toBeVisible();
  }
  if (surface === 'modal') {
    await page.getByRole('button', { name: 'Ouvrir le lanceur de tirages' }).click();
    await expect(page.getByRole('dialog', { name: 'Lancer un tirage' })).toBeVisible();
  }
}

for (const scenario of scenarios) {
  const { surface, theme, viewport } = scenario;
  test(`${surface} · ${viewport} · ${theme}`, async ({ page }) => {
    await page.setViewportSize(viewports[viewport]);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await prepareStorage(page, scenario);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app')).toHaveAttribute('data-mode', theme);
    await waitForSurface(page, surface);
    await page.addStyleTag({ path: SCREENSHOT_STYLE_PATH });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(async (image) => {
        if (!image.complete) {
          await new Promise((resolve) => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
          });
        }
        try {
          await image.decode();
        } catch {
          // A failed decorative image should not block the remaining visual checks.
        }
      }));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(surface === 'configuration' ? 1_000 : 250);
    const clip = surface === 'configuration'
      ? { x: 0, y: 110, width: viewports[viewport].width, height: viewports[viewport].height - 110 }
      : undefined;
    const screenshot = await page.screenshot({
      animations: 'disabled',
      caret: 'hide',
      clip,
    });
    expect(screenshot).toMatchSnapshot(`${surface}-${viewport}-${theme}.png`);
  });
}

const accessibilitySurfaces = [
  'hub',
  'random',
  'rules',
  'models',
  'scene',
  'modal',
  'configuration',
];

for (const surface of accessibilitySurfaces) {
  test(`${surface} · structure accessible`, async ({ page }) => {
    const scenario = { surface, theme: 'light', viewport: 'reference' };
    await page.setViewportSize(viewports.reference);
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await prepareStorage(page, scenario);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('.app')).toHaveAttribute('data-mode', 'light');
    await waitForSurface(page, surface);

    const audit = await page.evaluate(() => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      };
      const referencedText = (element, attribute) => String(element.getAttribute(attribute) || '')
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent?.trim() || '')
        .filter(Boolean)
        .join(' ');
      const accessibleName = (element) => (
        element.getAttribute('aria-label')
        || referencedText(element, 'aria-labelledby')
        || [...(element.labels || [])].map((label) => label.textContent?.trim() || '').filter(Boolean).join(' ')
        || element.getAttribute('title')
        || element.textContent?.trim()
        || ''
      ).replace(/\s+/g, ' ').trim();
      const controls = [...document.querySelectorAll(
        'button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])',
      )].filter(visible);
      const ids = [...document.querySelectorAll('[id]')].map((element) => element.id).filter(Boolean);
      const headings = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
        .filter(visible)
        .map((heading) => ({
          level: Number(heading.tagName.slice(1)),
          text: heading.textContent?.trim() || '',
        }));
      const headingJumps = headings
        .map((heading, index) => ({ ...heading, previous: headings[index - 1]?.level || 0 }))
        .filter((heading) => heading.level > heading.previous + 1);
      return {
        duplicateIds: [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))],
        headingJumps,
        htmlLang: document.documentElement.lang,
        mainCount: document.querySelectorAll('main').length,
        unnamedControls: controls
          .filter((control) => !accessibleName(control))
          .map((control) => control.outerHTML.slice(0, 180)),
      };
    });

    expect(audit.htmlLang).toBe('fr');
    expect(audit.mainCount).toBe(1);
    expect(audit.duplicateIds).toEqual([]);
    expect(audit.unnamedControls).toEqual([]);
    expect(audit.headingJumps).toEqual([]);

    if (surface === 'modal') {
      const dialog = page.getByRole('dialog', { name: 'Lancer un tirage' });
      await expect(dialog).toHaveAttribute('aria-modal', 'true');
      await expect(dialog).toHaveAttribute('aria-labelledby', /.+/);
    }
  });
}

test('la fenêtre de lancer conserve et restaure le focus', async ({ page }) => {
  const scenario = { surface: 'scene', theme: 'light', viewport: 'reference' };
  await page.setViewportSize(viewports.reference);
  await prepareStorage(page, scenario);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await waitForSurface(page, 'scene');

  const launcher = page.getByRole('button', { name: 'Ouvrir le lanceur de tirages' });
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: 'Lancer un tirage' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(launcher).toBeFocused();
});
