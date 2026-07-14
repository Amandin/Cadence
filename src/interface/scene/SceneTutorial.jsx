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

export function SceneTutorial({ step = 0, onPrevious, onNext, onFinish }) {
  const [titleKey, bodyKey] = contentByStep[step] || contentByStep[sceneTutorialSteps.ADD_PARTICIPANT];
  const done = step === sceneTutorialSteps.DONE;
  return <aside className="scene-tutorial" data-step={step} aria-live="polite"><div className="scene-tutorial-progress">{t('sceneTutorial.progress', { current: step + 1, total: 8 })}</div><strong>{t(titleKey)}</strong><p>{t(bodyKey)}</p><div className="scene-tutorial-actions"><button type="button" className="small-btn" onClick={onFinish}>{done ? t('sceneTutorial.close') : t('sceneTutorial.skip')}</button>{previousSteps.has(step) && <button type="button" className="small-btn" onClick={onPrevious}>{t('onboarding.back')}</button>}{navigableSteps.has(step) && <button type="button" className="primary" onClick={onNext}>{t('onboarding.next')}</button>}{!navigableSteps.has(step) && !done && <span className="scene-tutorial-wait">{t('sceneTutorial.useInterface')}</span>}{done && <button type="button" className="primary" onClick={onFinish}>{t('sceneTutorial.finish')}</button>}</div></aside>;
}
