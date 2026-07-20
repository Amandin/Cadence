import { chromium } from 'playwright';
import { createServer } from 'vite';
import fs from 'node:fs/promises';
import path from 'node:path';
import { makeTestCampaign } from '../../src/logic.js';
import { createStandardSources, standardSourceIds } from '../../src/random-system/defaults.js';
import { fixedValue, parameterValue } from '../../src/random-system/core/references.js';

let baseURL = '';
const STORAGE_KEY = 'cadence:campaign:v1';
const ONBOARDING_KEY = 'cadence:onboarding:first-run:v1';
const THEME_KEY = 'cadence:interface:theme-override:v1';
const PERFORMANCE_KEY = 'cadence:performance:preference:v1';
const VIEW_KEY = 'cadence:interface:view:v1';
const SCENE_INDEX_KEY = 'cadence:interface:scene-index:v1';
const HUB_TAB_KEY = 'cadence:interface:hub-tab:v1';
const outputDir = path.resolve('test-results/uiux');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function baseRandomSystem() {
  return {
    schemaVersion: 14,
    sources: createStandardSources(),
    definitions: [{
      id: 'uiux-d20-check',
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
        { id: 'total', type: 'aggregate', operation: 'sum', outputId: 'total', label: 'Total' },
        { id: 'modifier', type: 'modifier', targetAggregateId: 'total', value: parameterValue('modifier'), label: 'Modificateur' },
      ],
      primaryAggregateId: 'total',
    }],
    sourceStates: {},
    randomKits: [],
    lastResult: null,
    history: [],
  };
}

function campaignForRules(name, rulesPatch = {}, scenePatch = {}) {
  const campaign = makeTestCampaign();
  const firstScene = campaign.scenes[0];
  firstScene.round = 1;
  firstScene.activeId = firstScene.participants?.[0]?.id || '';
  firstScene.globalTracker = {
    enabled: true,
    name: 'Menace UI',
    mode: 'clock',
    current: 2,
    max: 6,
    auto: true,
    trigger: 'round',
    thresholds: [{ value: 4, label: 'Pression', color: 'amber', operator: 'gte' }],
  };
  firstScene.statuses = [
    { id: 'scene-status-uiux', name: 'Brouillard', duration: 2, remaining: 2, loop: false, inactive: false, limited: false, advanceOn: 'round', expired: false },
  ];
  firstScene.participants = (firstScene.participants || []).map((participant, index) => ({
    ...participant,
    kind: rulesPatch.manualMultipleActionScope === 'elite-only' && index === 0 ? 'Élite' : participant.kind,
    actionSlots: index === 0 ? [
      { id: `${participant.id}-slot-a`, value: Number(participant.initiative || 12), played: false },
      { id: `${participant.id}-slot-b`, value: Math.max(0, Number(participant.initiative || 12) - 5), played: false },
    ] : participant.actionSlots,
    statuses: index === 0 ? [
      { id: 'status-uiux-limited', name: 'Surpris', duration: 1, remaining: 1, loop: false, inactive: false, limited: true, advanceOn: 'activation', expired: false },
      { id: 'status-uiux-loop', name: 'Concentration', duration: 2, remaining: 0, loop: true, inactive: false, limited: false, advanceOn: 'activation', expired: true },
    ] : participant.statuses || [],
  }));
  Object.assign(firstScene, scenePatch);

  return {
    ...campaign,
    id: `uiux-${name}`,
    name: `UIUX ${name}`,
    format: 'cadence-campaign',
    schemaVersion: 2,
    savedAt: '2026-07-09T12:00:00.000Z',
    initiativeRules: {
      ...campaign.initiativeRules,
      startRound: 0,
      ...rulesPatch,
    },
    randomSystem: baseRandomSystem(),
  };
}

const scenarios = [
  {
    id: 'first-run-onboarding',
    view: 'hub',
    tab: 'scenes',
    campaign: campaignForRules('onboarding', { temporalite: 'classique' }),
    onboardingDone: false,
    interactions: ['onboarding-scan'],
  },
  {
    id: 'first-run-advanced',
    view: 'hub',
    tab: 'scenes',
    campaign: campaignForRules('onboarding-advanced', { temporalite: 'classique' }),
    onboardingDone: false,
    interactions: ['advanced-rules-entry'],
  },
  {
    id: 'hub-scenes',
    view: 'hub',
    tab: 'scenes',
    campaign: campaignForRules('classic', { temporalite: 'classique', multipleActionSlots: true }),
    interactions: ['hub-tabs'],
  },
  {
    id: 'random-use',
    view: 'hub',
    tab: 'tirages',
    campaign: campaignForRules('random', { temporalite: 'classique' }),
    interactions: ['random-use'],
  },
  {
    id: 'random-configuration',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('random-configuration', { temporalite: 'classique' }),
    interactions: ['random-configuration'],
  },
  {
    id: 'rules-classic',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('classic', { temporalite: 'classique', multipleActionMode: 'manual', multipleActionSlots: true }),
    interactions: ['rules-scan'],
  },
  {
    id: 'rules-flexible-declaration',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('flexible-declaration', { temporalite: 'souple', declarationMode: true, multipleActionMode: 'manual', multipleActionSlots: true }),
    interactions: ['rules-scan'],
  },
  {
    id: 'rules-phases-auto',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('phases-auto', { temporalite: 'phases', phaseActionMode: 'automatic', phaseCount: 3 }),
    interactions: ['rules-scan'],
  },
  {
    id: 'rules-phases-checked',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('phases-checked', { temporalite: 'phases', phaseActionMode: 'checked', phaseCount: 4 }),
    interactions: ['rules-scan'],
  },
  {
    id: 'rules-initiative-cost',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('initiative-cost', { temporalite: 'classique', multipleActionMode: 'initiative-cost', initiativeCostThreshold: 10, initiativeCostQuickCosts: [1, 2, 4] }),
    interactions: ['rules-scan'],
  },
  {
    id: 'rules-manual-elite-only',
    view: 'hub',
    tab: 'regles',
    campaign: campaignForRules('manual-elite-only', { temporalite: 'classique', multipleActionMode: 'manual', multipleActionSlots: true, manualMultipleActionScope: 'elite-only' }),
    interactions: ['rules-scan', 'elite-manual-scope'],
  },
  {
    id: 'models',
    view: 'hub',
    tab: 'templates',
    campaign: campaignForRules('models', { temporalite: 'classique' }),
    interactions: ['models-scan'],
  },
  {
    id: 'campaign-options-reference',
    view: 'hub',
    tab: 'campagnes',
    campaign: campaignForRules('options', { temporalite: 'classique' }),
    interactions: ['options-scan'],
  },
  {
    id: 'scene-classic',
    view: 'scene',
    tab: 'scenes',
    campaign: campaignForRules('scene-classic', { temporalite: 'classique', multipleActionMode: 'manual', multipleActionSlots: true }),
    interactions: ['scene-dialogs'],
  },
  {
    id: 'scene-manual-elite-only',
    view: 'scene',
    tab: 'scenes',
    campaign: campaignForRules('scene-manual-elite-only', { temporalite: 'classique', multipleActionMode: 'manual', multipleActionSlots: true, manualMultipleActionScope: 'elite-only' }),
    interactions: ['scene-dialogs'],
  },
  {
    id: 'scene-flexible-declaration',
    view: 'scene',
    tab: 'scenes',
    campaign: campaignForRules('scene-flexible-declaration', { temporalite: 'souple', declarationMode: true, multipleActionMode: 'manual', multipleActionSlots: true }),
    interactions: ['scene-dialogs', 'next-action'],
  },
  {
    id: 'scene-phases',
    view: 'scene',
    tab: 'scenes',
    campaign: campaignForRules('scene-phases', { temporalite: 'phases', phaseActionMode: 'checked', phaseCount: 4 }),
    interactions: ['scene-dialogs', 'next-action'],
  },
];

async function startServer() {
  const server = await createServer({
    configFile: path.resolve('vite.config.js'),
    logLevel: 'error',
    server: { host: '127.0.0.1', port: 0, strictPort: false },
  });
  await server.listen();
  baseURL = server.resolvedUrls.local[0];
  return server;
}

async function seedAndOpen(page, scenario, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  await page.evaluate((seed) => { window.name = `cadence-uiux-seed:${JSON.stringify(seed)}`; }, {
    payload: scenario.campaign,
    selectedTheme: viewport.width <= 390 ? 'dark' : 'light',
    view: scenario.view,
    tab: scenario.tab,
    onboardingDone: scenario.onboardingDone !== false,
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('.initial-loading-shell').waitFor({ state: 'detached', timeout: 7_500 }).catch(() => {});
  await page.locator('.app').waitFor({ state: 'visible', timeout: 7_500 });
  await page.waitForFunction(() => document.querySelectorAll('button, h1, h2, h3').length > 0, undefined, { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(650);
}

async function auditSurface(page, id) {
  return page.evaluate((id) => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.display !== 'none'
        && style.visibility !== 'hidden';
    };
    const text = (element) => (element.textContent || '').replace(/\s+/g, ' ').trim();
    const accessibleName = (element) => (
      element.getAttribute('aria-label')
      || element.getAttribute('title')
      || [...(element.labels || [])].map((label) => text(label)).filter(Boolean).join(' ')
      || text(element)
      || ''
    ).replace(/\s+/g, ' ').trim();
    const controls = [...document.querySelectorAll('button, a[href], input, select, textarea, summary, [role="button"], [tabindex]:not([tabindex="-1"])')]
      .filter(visible);
    const glyphPattern = /^[+\-x×✓↩↺↑↓➜⏸⏳∞↻☀☾☰💾🎲⚀⚁⚂⚃⚄⚅♠♥♦♣★]+(?:\d+)?$/u;
    return {
      id,
      title: document.title,
      url: location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].filter(visible).map((heading) => `${heading.tagName}:${text(heading)}`).slice(0, 40),
      dialogs: [...document.querySelectorAll('[role="dialog"], .modal, .fenetre')].filter(visible).map(text).slice(0, 10),
      controlCount: controls.length,
      unnamedControls: controls.filter((control) => !accessibleName(control)).map((control) => control.outerHTML.slice(0, 160)).slice(0, 20),
      glyphButtons: [...document.querySelectorAll('button')].filter(visible).map((button) => ({
        text: text(button),
        aria: button.getAttribute('aria-label') || '',
        className: String(button.className || ''),
      })).filter((button) => glyphPattern.test(button.text)).slice(0, 40),
      buttons: [...document.querySelectorAll('button')].filter(visible).map((button) => ({
        text: text(button),
        aria: button.getAttribute('aria-label') || '',
        className: String(button.className || ''),
      })).slice(0, 80),
      iconMasks: [...document.querySelectorAll('.cadence-mask-icon')].filter(visible).map((icon) => [...icon.classList].find((name) => name.startsWith('cadence-mask-icon-') && name !== 'cadence-mask-icon')).filter(Boolean).slice(0, 80),
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  }, id);
}

async function verifyImmediateReloadAndClose(page, report, scenario) {
  try {
    const before = await page.evaluate(({ storageKey, viewKey }) => ({
      campaign: localStorage.getItem(storageKey),
      view: localStorage.getItem(viewKey),
    }), { storageKey: STORAGE_KEY, viewKey: VIEW_KEY });
    if (!before.campaign || !before.view) {
      report.actions.push({ label: `${scenario.id}: immediate persistence before reload`, status: 'error', reason: 'campaign or current view missing from local storage' });
      return;
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('.initial-loading-shell').waitFor({ state: 'detached', timeout: 7_500 }).catch(() => {});
    await page.waitForTimeout(650);
    const afterReload = await page.evaluate(({ viewKey }) => ({
      storedView: localStorage.getItem(viewKey),
      renderedView: document.querySelector('.scene-app') ? 'scene' : document.querySelector('.hub-app') ? 'hub' : 'unknown',
    }), { viewKey: VIEW_KEY });
    report.actions.push({
      label: `${scenario.id}: immediate reload restores campaign and view`,
      status: afterReload.storedView === before.view && afterReload.renderedView === before.view ? 'ok' : 'error',
      reason: afterReload.storedView === before.view && afterReload.renderedView === before.view ? undefined : `expected ${before.view}, got storage=${afterReload.storedView} rendered=${afterReload.renderedView}`,
    });

    await page.goto('about:blank', { waitUntil: 'domcontentloaded' });
    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
    await page.locator('.initial-loading-shell').waitFor({ state: 'detached', timeout: 7_500 }).catch(() => {});
    await page.waitForTimeout(650);
    const afterClose = await page.evaluate(({ storageKey, viewKey }) => ({
      campaign: localStorage.getItem(storageKey),
      storedView: localStorage.getItem(viewKey),
      renderedView: document.querySelector('.scene-app') ? 'scene' : document.querySelector('.hub-app') ? 'hub' : 'unknown',
    }), { storageKey: STORAGE_KEY, viewKey: VIEW_KEY });
    report.actions.push({
      label: `${scenario.id}: immediate close restores campaign and view`,
      status: afterClose.campaign && afterClose.storedView === before.view && afterClose.renderedView === before.view ? 'ok' : 'error',
      reason: afterClose.campaign && afterClose.storedView === before.view && afterClose.renderedView === before.view ? undefined : `expected ${before.view}, got storage=${afterClose.storedView} rendered=${afterClose.renderedView}`,
    });
  } catch (error) {
    report.actions.push({ label: `${scenario.id}: immediate reload and close persistence`, status: 'error', reason: String(error.message || error).split('\n')[0] });
  }
}

async function clickVisibleButton(page, report, label, { text = '', aria = '', selector = 'button', exact = false } = {}) {
  try {
    const result = await page.evaluate(({ text, aria, selector, exact }) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden';
      };
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const matches = (value, expected) => exact ? clean(value) === expected : clean(value).includes(expected);
      const buttons = [...document.querySelectorAll(selector)].filter(visible);
      const target = buttons.find((button) => (
        aria ? matches(button.getAttribute('aria-label'), aria) : matches(button.textContent, text)
      ));
      const samples = buttons.slice(0, 20).map((button) => ({
        text: clean(button.textContent),
        aria: clean(button.getAttribute('aria-label')),
        className: String(button.className || ''),
      }));
      if (!target) return { ok: false, samples };
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return {
        ok: true,
        clicked: {
          text: clean(target.textContent),
          aria: clean(target.getAttribute('aria-label')),
          className: String(target.className || ''),
        },
      };
    }, { text, aria, selector, exact });
    await page.waitForTimeout(300);
    if (result.ok) {
      report.actions.push({ label, status: 'ok', detail: result.clicked });
      return true;
    }
    report.actions.push({ label, status: 'skipped', reason: `visible button not found${text ? ` text=${text}` : ''}${aria ? ` aria=${aria}` : ''}`, samples: result.samples });
    return false;
  } catch (error) {
    report.actions.push({ label, status: 'error', reason: String(error.message || error).split('\n')[0] });
    return false;
  }
}

async function clickFirstVisible(page, report, label, selector) {
  try {
    const result = await page.evaluate((selector) => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && !element.disabled;
      };
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const target = [...document.querySelectorAll(selector)].find(visible);
      if (!target) return { ok: false };
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return { ok: true, clicked: { text: clean(target.textContent), aria: clean(target.getAttribute('aria-label')), className: String(target.className || '') } };
    }, selector);
    await page.waitForTimeout(300);
    if (result.ok) {
      report.actions.push({ label, status: 'ok', detail: result.clicked });
      return true;
    }
    report.actions.push({ label, status: 'skipped', reason: `visible selector not found ${selector}` });
    return false;
  } catch (error) {
    report.actions.push({ label, status: 'error', reason: String(error.message || error).split('\n')[0] });
    return false;
  }
}

async function safeClick(page, report, label, locator) {
  try {
    const count = await locator.count();
    if (count !== 1) {
      report.actions.push({ label, status: 'skipped', reason: `locator count ${count}` });
      return false;
    }
    await locator.click({ timeout: 3_000 });
    await page.waitForTimeout(200);
    report.actions.push({ label, status: 'ok' });
    return true;
  } catch (error) {
    report.actions.push({ label, status: 'error', reason: String(error.message || error).split('\n')[0] });
    return false;
  }
}

async function closeDialog(page, report, label) {
  try {
    const result = await page.evaluate(() => {
      const visible = (element) => {
        const rect = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden'
          && !element.disabled;
      };
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim();
      const containers = [...document.querySelectorAll('[role="dialog"], .modal, .fenetre, dialog')]
        .filter(visible);
      const buttons = containers.flatMap((container) => [...container.querySelectorAll('button')])
        .filter(visible);
      if (!containers.length) return { ok: true, alreadyClosed: true };
      const target = buttons.find((button) => clean(button.getAttribute('aria-label')) === 'Fermer')
        || buttons.find((button) => clean(button.textContent) === 'Annuler')
        || buttons.find((button) => clean(button.textContent) === 'Retour')
        || buttons.find((button) => clean(button.textContent) === 'Fermer');
      const samples = buttons.slice(0, 20).map((button) => ({
        text: clean(button.textContent),
        aria: clean(button.getAttribute('aria-label')),
        className: String(button.className || ''),
      }));
      if (!target) return { ok: false, samples };
      target.scrollIntoView({ block: 'center', inline: 'center' });
      target.click();
      return {
        ok: true,
        clicked: {
          text: clean(target.textContent),
          aria: clean(target.getAttribute('aria-label')),
          className: String(target.className || ''),
        },
      };
    });
    await page.waitForTimeout(300);
    if (result.ok) {
      report.actions.push({ label: `${label}: close dialog`, status: 'ok', detail: result.alreadyClosed ? 'already closed' : result.clicked });
      return true;
    }
    report.actions.push({ label: `${label}: close dialog`, status: 'skipped', reason: 'visible close/cancel button not found', samples: result.samples });
    return false;
  } catch (error) {
    report.actions.push({ label: `${label}: close dialog`, status: 'error', reason: String(error.message || error).split('\n')[0] });
    return false;
  }
}

async function runInteractions(page, scenario, report) {
  for (const group of scenario.interactions) {
    if (group === 'onboarding-scan') {
      report.surfaces.push(await auditSurface(page, `${scenario.id}/welcome`));
      await clickVisibleButton(page, report, 'onboarding theme toggle', { aria: 'Basculer thème clair ou sombre', exact: true });
      report.actions.push({
        label: 'onboarding rhythm choices visible',
        status: await page.getByRole('button', { name: /Initiative classique/ }).count() === 1 ? 'ok' : 'error',
      });
      await safeClick(page, report, 'onboarding choose flexible rhythm', page.getByRole('button', { name: /Tours libres/ }));
      await safeClick(page, report, 'onboarding open flexible initiative', page.getByRole('button', { name: 'Étape suivante', exact: true }));
      report.actions.push({
        label: 'multiple actions remain visible with flexible initiative',
        status: await page.getByText('Actions multiples', { exact: true }).count() === 1 ? 'ok' : 'error',
      });
      await safeClick(page, report, 'onboarding disable flexible initiative', page.getByRole('button', { name: /Non, jouer sans initiative/ }));
      report.actions.push({
        label: 'multiple actions remain visible without flexible initiative',
        status: await page.getByText('Actions multiples', { exact: true }).count() === 1 ? 'ok' : 'error',
      });
      await safeClick(page, report, 'onboarding enable flexible initiative', page.getByRole('button', { name: /Oui, garder l’initiative/ }));
      await safeClick(page, report, 'onboarding open flexible initiative format', page.getByRole('button', { name: 'Étape suivante', exact: true }));
      report.actions.push({
        label: 'multiple actions are not repeated on flexible initiative format',
        status: await page.getByText('Actions multiples', { exact: true }).count() === 0 ? 'ok' : 'error',
      });
      for (let step = 1; step <= 12; step += 1) {
        const next = page.getByRole('button', { name: 'Étape suivante', exact: true });
        if (await next.count() !== 1 || !await next.isVisible()) break;
        await safeClick(page, report, `onboarding next step ${step}`, next);
        report.surfaces.push(await auditSurface(page, `${scenario.id}/step-${step}`));
      }
      await safeClick(page, report, 'onboarding choose first-scene tutorial', page.getByRole('button', { name: 'Suivre le tutoriel', exact: true }));
      await page.locator('.scene-tutorial').waitFor({ state: 'visible', timeout: 3_000 });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/scene-tutorial-welcome`));
      await safeClick(page, report, 'tutorial use real Add control', page.locator('.bottom-add-participant'));
      await page.locator('.character-add-sheet').waitFor({ state: 'visible', timeout: 3_000 });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/scene-tutorial-character-add`));
    }

    if (group === 'advanced-rules-entry') {
      await safeClick(page, report, 'open advanced rules from onboarding', page.getByRole('button', { name: 'Accéder aux règles avancées', exact: true }));
      await page.locator('.hub-app').waitFor({ state: 'visible', timeout: 3_000 });
      report.actions.push({
        label: 'advanced onboarding opens the rules tab',
        status: await page.getByRole('button', { name: 'Règles', exact: true }).getAttribute('aria-current') === 'page' ? 'ok' : 'error',
      });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/rules`));
    }

    if (group === 'hub-tabs') {
      for (const name of ['Tirages', 'Règles', 'Modèles', 'Options', 'Scènes']) {
        await safeClick(page, report, `hub tab ${name}`, page.getByRole('button', { name, exact: true }));
        report.surfaces.push(await auditSurface(page, `${scenario.id}/${name}`));
      }
    }

    if (group === 'random-use') {
      await clickVisibleButton(page, report, 'random roll d20', { text: 'Lancer' });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/after-roll`));
    }

    if (group === 'random-configuration') {
      for (const name of ['Tirages disponibles', 'Types de tirage', 'Dés, cartes et tables']) {
        await clickVisibleButton(page, report, `random configuration ${name}`, { text: name });
        await page.waitForTimeout(650);
        report.surfaces.push(await auditSurface(page, `${scenario.id}/${name}`));
      }
    }

    if (group === 'rules-scan') {
      for (const summary of await page.locator('details > summary').all()) {
        await summary.click({ timeout: 1_500 }).catch(() => {});
      }
      report.surfaces.push(await auditSurface(page, `${scenario.id}/details-open`));
    }

    if (group === 'elite-manual-scope') {
      const eliteScope = page.getByRole('radio', { name: /Actions multiples pour les Élites/ });
      await safeClick(page, report, 'manual actions Elite-only scope', eliteScope);
      report.surfaces.push(await auditSurface(page, `${scenario.id}/elite-only-selected`));
    }

    if (group === 'models-scan') {
      await clickVisibleButton(page, report, 'models create first visible', { aria: 'Ajouter un modèle', exact: true });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/after-create-attempt`));
      await closeDialog(page, report, 'models');
    }

    if (group === 'options-scan') {
      await clickVisibleButton(page, report, 'options statistics', { text: 'Ouvrir', exact: true });
      await page.waitForTimeout(650);
      report.surfaces.push(await auditSurface(page, `${scenario.id}/statistics`));
      await closeDialog(page, report, 'statistics');
      await page.evaluate(() => {
        document.querySelectorAll('details').forEach((details) => {
          if (details.textContent.includes('Actions avanc')) details.open = true;
        });
      });
      await clickVisibleButton(page, report, 'options admin presets', { text: 'Admin presets règles/tirages', exact: true });
      await page.waitForTimeout(650);
      report.surfaces.push(await auditSurface(page, `${scenario.id}/admin-presets`));
      const adminActionMode = page.getByLabel('Actions multiples');
      if (await adminActionMode.count() === 1) {
        await adminActionMode.selectOption('manual');
        report.actions.push({ label: 'admin rules manual action mode', status: 'ok' });
        const adminScope = page.getByLabel('Portée manuelle');
        await adminScope.selectOption('elite-only');
        report.actions.push({ label: 'admin rules Elite-only scope', status: 'ok' });
        report.surfaces.push(await auditSurface(page, `${scenario.id}/admin-rules-elite-only`));
      } else {
        report.actions.push({ label: 'admin rules manual action mode', status: 'error', reason: `locator count ${await adminActionMode.count()}` });
      }
      await clickVisibleButton(page, report, 'admin presets back', { text: 'Retour aux options' });
      await page.evaluate(() => {
        document.querySelectorAll('details').forEach((details) => {
          if (details.textContent.includes('Actions avanc')) details.open = true;
        });
      });
      await clickVisibleButton(page, report, 'options style reference', { text: 'Référence CSS et symboles', exact: true });
      await page.waitForTimeout(650);
      report.surfaces.push(await auditSurface(page, `${scenario.id}/style-reference`));
      await clickVisibleButton(page, report, 'style reference back', { text: 'Retour aux options' });
    }

    if (group === 'scene-dialogs') {
      await clickVisibleButton(page, report, 'scene dice launcher', { aria: 'Ouvrir le lanceur de tirages', exact: true });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/dice-dialog`));
      await closeDialog(page, report, 'dice');

      await clickFirstVisible(page, report, 'scene menu', '.bottom-menu-btn');
      report.surfaces.push(await auditSurface(page, `${scenario.id}/menu`));
      await clickVisibleButton(page, report, 'scene indicator dialog', { text: 'indicateur' });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/scene-indicator`));
      await closeDialog(page, report, 'scene indicator');
      await clickVisibleButton(page, report, 'scene status dialog', { text: 'état' });
      report.surfaces.push(await auditSurface(page, `${scenario.id}/scene-status`));
      await closeDialog(page, report, 'scene status');
      await closeDialog(page, report, 'scene menu');
    }

    if (group === 'next-action') {
      await clickFirstVisible(page, report, 'next action / round', '.turn-btn.next, .bottom-next-action');
      report.surfaces.push(await auditSurface(page, `${scenario.id}/after-next`));
    }
  }
}

function srcPathFromUrl(url) {
  if (!url.includes('/src/')) return '';
  const parsed = new URL(url);
  const withoutQuery = decodeURIComponent(parsed.pathname).replace(/^\/+/, '');
  return withoutQuery.replace(/\//g, path.sep);
}

async function sourceFunctionInventory() {
  const files = [];
  async function walk(dir) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (/\.(js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) files.push(full);
    }
  }
  await walk(path.resolve('src'));
  const inventory = [];
  const patterns = [
    /(?:export\s+)?function\s+([A-Za-z0-9_$]+)/g,
    /(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:memo\()?function\b/g,
    /(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/g,
  ];
  for (const file of files) {
    const text = await fs.readFile(file, 'utf8');
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(text))) {
        inventory.push({
          file: path.relative(process.cwd(), file),
          name: match[1],
          index: match.index,
        });
      }
    }
  }
  return inventory;
}

function summarizeCoverage(rawCoverage, inventory) {
  const srcEntries = rawCoverage
    .map((entry) => ({ ...entry, srcPath: srcPathFromUrl(entry.url) }))
    .filter((entry) => entry.srcPath);
  const loadedFiles = new Set(srcEntries.map((entry) => entry.srcPath));
  const functions = [];
  for (const entry of srcEntries) {
    for (const fn of entry.functions || []) {
      const name = fn.functionName || '(anonymous)';
      const called = fn.ranges?.some((range) => range.count > 0) || false;
      functions.push({ file: entry.srcPath, name, called });
    }
  }
  const namedFunctions = functions.filter((fn) => fn.name && fn.name !== '(anonymous)');
  return {
    loadedFileCount: loadedFiles.size,
    staticFunctionCount: inventory.length,
    observedFunctionCount: functions.length,
    namedCalledCount: namedFunctions.filter((fn) => fn.called).length,
    namedUncalledCount: namedFunctions.filter((fn) => !fn.called).length,
    unloadedSourceFiles: [...new Set(inventory.map((item) => item.file))]
      .filter((file) => !loadedFiles.has(file))
      .sort(),
    namedUncalledFunctions: namedFunctions
      .filter((fn) => !fn.called)
      .map((fn) => `${fn.file} :: ${fn.name}`)
      .sort()
      .slice(0, 300),
  };
}

function anomaliesFromSurface(surface) {
  const anomalies = [];
  if (surface.horizontalOverflow) anomalies.push({ level: 'high', surface: surface.id, message: 'Débordement horizontal détecté.' });
  if (surface.unnamedControls.length) anomalies.push({ level: 'high', surface: surface.id, message: `${surface.unnamedControls.length} contrôle(s) visible(s) sans nom accessible.` });
  if (surface.glyphButtons.length) anomalies.push({ level: 'medium', surface: surface.id, message: `Glyphes texte visibles dans des boutons : ${surface.glyphButtons.map((button) => button.text).join(', ')}` });
  return anomalies;
}

function markdownReport(report) {
  const anomalies = report.surfaces.flatMap(anomaliesFromSurface);
  const actionErrors = report.actions.filter((action) => action.status !== 'ok');
  return `# Rapport UI/UX complet Cadence

Date : ${new Date().toISOString()}

## Résumé

- Scénarios parcourus : ${report.scenarios.length}
- Surfaces observées : ${report.surfaces.length}
- Actions OK : ${report.actions.filter((action) => action.status === 'ok').length}
- Actions ignorées/en erreur : ${actionErrors.length}
- Anomalies structurelles relevées : ${anomalies.length}
- Fichiers source chargés pendant le parcours : ${report.coverage.loadedFileCount}
- Fonctions nommées appelées : ${report.coverage.namedCalledCount}
- Fonctions nommées non appelées dans les fichiers chargés : ${report.coverage.namedUncalledCount}
- Fichiers source avec fonctions inventoriées mais non chargés : ${report.coverage.unloadedSourceFiles.length}

## Scénarios

${report.scenarios.map((scenario) => `- ${scenario.id} : vue \`${scenario.view}\`, onglet \`${scenario.tab}\`, interactions ${scenario.interactions.join(', ')}`).join('\n')}

## Actions non couvertes ou fragiles

${actionErrors.length ? actionErrors.map((action) => `- ${action.label} : ${action.status}${action.reason ? ` (${action.reason})` : ''}`).join('\n') : '- Aucune action fragile détectée.'}

## Anomalies UI/UX détectées automatiquement

${anomalies.length ? anomalies.map((item) => `- [${item.level}] ${item.surface} — ${item.message}`).join('\n') : '- Aucune anomalie automatique détectée.'}

## Fonctions non appelées dans les fichiers chargés

Ces lignes ne prouvent pas que le code est mort : elles indiquent les fonctions que ce parcours n’a pas activées alors que leur module a été chargé.

${report.coverage.namedUncalledFunctions.length ? report.coverage.namedUncalledFunctions.map((item) => `- ${item}`).join('\n') : '- Aucune fonction nommée non appelée dans les fichiers chargés.'}

## Fichiers source non chargés pendant ce parcours

Ces fichiers demandent soit un scénario UI supplémentaire, soit une décision de code mort si aucun chemin produit ne doit les charger.

${report.coverage.unloadedSourceFiles.length ? report.coverage.unloadedSourceFiles.map((file) => `- ${file}`).join('\n') : '- Tous les fichiers inventoriés ont été chargés.'}
`;
}

function blockingFailures(report) {
  return [
    ...report.consoleErrors.map((entry) => `console ${entry.type}: ${entry.text}`),
    ...report.actions.filter((action) => action.status !== 'ok').map((action) => `action ${action.label}: ${action.status}${action.reason ? ` (${action.reason})` : ''}`),
    ...report.surfaces.flatMap(anomaliesFromSurface).filter((anomaly) => anomaly.level === 'high').map((anomaly) => `UI/UX ${anomaly.surface}: ${anomaly.message}`),
  ];
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({
    locale: 'fr-FR',
    serviceWorkers: 'block',
    timezoneId: 'Europe/Paris',
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const prefix = 'cadence-uiux-seed:';
    if (!window.name.startsWith(prefix)) return;
    const seed = JSON.parse(window.name.slice(prefix.length));
    window.name = '';
    localStorage.clear();
    sessionStorage.clear();
    if (seed.onboardingDone) {
      localStorage.setItem('cadence:campaign:v1', JSON.stringify(seed.payload));
      localStorage.setItem('cadence:onboarding:first-run:v1', 'done');
    }
    localStorage.setItem('cadence:interface:theme-override:v1', seed.selectedTheme);
    localStorage.setItem('cadence:performance:preference:v1', 'normal');
    sessionStorage.setItem('cadence:interface:view:v1', seed.view);
    sessionStorage.setItem('cadence:interface:scene-index:v1', '0');
    sessionStorage.setItem('cadence:interface:hub-tab:v1', seed.tab);
  });
  const client = await context.newCDPSession(page);
  const report = {
    scenarios: scenarios.map(({ campaign, ...scenario }) => scenario),
    actions: [],
    surfaces: [],
    consoleErrors: [],
    coverage: {},
  };
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      report.consoleErrors.push({ type: message.type(), text: message.text() });
    }
  });
  page.on('pageerror', (error) => {
    report.consoleErrors.push({ type: 'pageerror', text: String(error?.message || error) });
  });

  await client.send('Profiler.enable');
  await client.send('Profiler.startPreciseCoverage', { callCount: true, detailed: true });

  try {
    for (const scenario of scenarios) {
      for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
        await seedAndOpen(page, scenario, viewport);
        report.surfaces.push(await auditSurface(page, `${scenario.id}/${viewport.width}`));
        await runInteractions(page, scenario, report);
        if (viewport.width === 390 && ['first-run-onboarding', 'scene-classic'].includes(scenario.id)) {
          await verifyImmediateReloadAndClose(page, report, scenario);
        }
      }
    }
  } finally {
    const rawCoverage = await client.send('Profiler.takePreciseCoverage');
    await client.send('Profiler.stopPreciseCoverage').catch(() => {});
    await client.send('Profiler.disable').catch(() => {});
    await browser.close();
    await server.close();
    const inventory = await sourceFunctionInventory();
    report.coverage = summarizeCoverage(rawCoverage.result || [], inventory);
    await fs.writeFile(path.join(outputDir, 'uiux-report.json'), JSON.stringify(report, null, 2), 'utf8');
    await fs.writeFile(path.join(outputDir, 'uiux-report.md'), markdownReport(report), 'utf8');
    const failures = blockingFailures(report);
    if (failures.length) throw new Error(`Routine UI/UX bloquante : ${failures.length} anomalie(s).\n${failures.slice(0, 20).join('\n')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
