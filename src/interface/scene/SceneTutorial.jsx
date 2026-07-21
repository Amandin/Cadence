import { useLayoutEffect, useRef, useState } from 'react';
import { t } from '../../i18n/index.js';
import { sceneTutorialSteps } from '../../sceneTutorial.js';

const contentByStep = {
  [sceneTutorialSteps.ADD_PARTICIPANT]: ['sceneTutorial.add.title', 'sceneTutorial.add.body'],
  [sceneTutorialSteps.CHOOSE_SOURCE]: ['sceneTutorial.choose.title', 'sceneTutorial.choose.body'],
  [sceneTutorialSteps.IDENTITY]: ['sceneTutorial.identity.title', 'sceneTutorial.identity.body'],
  [sceneTutorialSteps.QUICK_INFO]: ['sceneTutorial.quickInfo.title', 'sceneTutorial.quickInfo.body'],
  [sceneTutorialSteps.ADD_INDICATOR]: ['sceneTutorial.indicator.title', 'sceneTutorial.indicator.body'],
  [sceneTutorialSteps.CONFIGURE_INDICATOR]: ['sceneTutorial.configure.title', 'sceneTutorial.configure.body'],
  [sceneTutorialSteps.SAVE_CHARACTER]: ['sceneTutorial.save.title', 'sceneTutorial.save.body'],
  [sceneTutorialSteps.DONE]: ['sceneTutorial.done.title', 'sceneTutorial.done.body'],
};

const navigableSteps = new Set([sceneTutorialSteps.IDENTITY, sceneTutorialSteps.QUICK_INFO]);
const previousSteps = new Set([sceneTutorialSteps.QUICK_INFO]);

const targetSelectorByStep = {
  [sceneTutorialSteps.ADD_PARTICIPANT]: '.bottom-add-participant',
  [sceneTutorialSteps.CHOOSE_SOURCE]: '.character-add-sheet .choice',
  [sceneTutorialSteps.IDENTITY]: '.character-edit-sheet .character-identity-fields',
  [sceneTutorialSteps.QUICK_INFO]: '.character-edit-sheet .quick-info-editor',
  [sceneTutorialSteps.ADD_INDICATOR]: '.character-edit-sheet .add-tracker-btn',
  [sceneTutorialSteps.CONFIGURE_INDICATOR]: '.character-edit-sheet .tracker-add-panel',
  [sceneTutorialSteps.SAVE_CHARACTER]: '.character-edit-sheet .validate-edit-btn',
  [sceneTutorialSteps.DONE]: '.initiative-card:first-of-type',
};

function tutorialPlacement(panel, target) {
  const gap = 12;
  const margin = 8;
  const panelRect = panel.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const horizontal = Math.min(Math.max(margin, targetRect.left), viewportWidth - panelRect.width - margin);
  const vertical = Math.min(Math.max(margin, targetRect.top), viewportHeight - panelRect.height - margin);
  const below = targetRect.bottom + gap;
  const above = targetRect.top - panelRect.height - gap;
  const right = targetRect.right + gap;
  const left = targetRect.left - panelRect.width - gap;

  if (below + panelRect.height <= viewportHeight - margin) return { top: below, left: horizontal };
  if (above >= margin) return { top: above, left: horizontal };
  if (right + panelRect.width <= viewportWidth - margin) return { top: vertical, left: right };
  if (left >= margin) return { top: vertical, left };
  return { top: margin, left: Math.max(margin, (viewportWidth - panelRect.width) / 2) };
}

export function SceneTutorial({ step = 0, onPrevious, onNext, onFinish }) {
  const [titleKey, bodyKey] = contentByStep[step] || contentByStep[sceneTutorialSteps.ADD_PARTICIPANT];
  const done = step === sceneTutorialSteps.DONE;
  const panelRef = useRef(null);
  const [placement, setPlacement] = useState(null);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    const selector = targetSelectorByStep[step];
    if (!panel || !selector) return undefined;
    let frame = 0;
    const updatePlacement = () => {
      const target = document.querySelector(selector);
      if (!target) return;
      setPlacement(tutorialPlacement(panel, target));
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updatePlacement);
    };
    schedule();
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
    };
  }, [step]);

  return <aside ref={panelRef} className="scene-tutorial" data-step={step} aria-live="polite" style={placement ? { top: `${placement.top}px`, left: `${placement.left}px`, right: 'auto', bottom: 'auto' } : undefined}><div className="scene-tutorial-progress">{t('sceneTutorial.progress', { current: step + 1, total: 8 })}</div><strong>{t(titleKey)}</strong><p>{t(bodyKey)}</p><div className="scene-tutorial-actions"><button type="button" className="small-btn" onClick={onFinish}>{done ? t('sceneTutorial.close') : t('sceneTutorial.skip')}</button>{previousSteps.has(step) && <button type="button" className="small-btn" onClick={onPrevious}>{t('onboarding.back')}</button>}{navigableSteps.has(step) && <button type="button" className="primary" onClick={onNext}>{t('onboarding.next')}</button>}{!navigableSteps.has(step) && !done && <span className="scene-tutorial-wait">{t('sceneTutorial.useInterface')}</span>}{done && <button type="button" className="primary" onClick={onFinish}>{t('sceneTutorial.finish')}</button>}</div></aside>;
}
