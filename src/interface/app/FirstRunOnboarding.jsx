import { useEffect, useMemo, useRef, useState } from 'react';
import { phaseActionModes, temporalityModes } from '../../constants.js';
import {
  campaignRulesFromOnboardingAnswers,
  onboardingAnswersFromRules,
  onboardingForcesNumericInitiative,
  onboardingInitiativeFormats,
  onboardingLabelPresets,
  onboardingMultipleActionModes,
  onboardingDefaultRules,
  onboardingUsesInitiative,
} from '../../domain/onboardingQuestionnaire.js';
import { activeRuleSummary } from '../../domain/ruleCompatibility.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';
import { DefinitionEditor } from '../../random-system/ui/DefinitionEditor.jsx';
import { randomKitCatalog } from '../../random-system/rulePresetKits.js';
import {
  createDnd5DefaultDefinitions,
  dnd5InitiativeDefinitionId,
} from '../../random-system/noCodeExamples.js';
import '../../random-system/styles/base.css';
import '../../random-system/styles/choice-controls.css';
import '../../random-system/styles/configuration.css';
import '../../random-system/styles/results.css';

function ChoiceCard({ option, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`choice onboarding-preset-card ${selected ? 'selected' : ''}`}
      aria-pressed={selected}
      onClick={() => onSelect(option.value)}
    >
      <span className="onboarding-preset-name">{option.label}</span>
      {option.description && <span className="onboarding-preset-description">{option.description}</span>}
    </button>
  );
}

function multipleActionOptions(answers) {
  const options = [
    { value: onboardingMultipleActionModes.NEVER, label: t('onboarding.answer.multiple.never') },
    { value: onboardingMultipleActionModes.ELITES, label: t('onboarding.answer.multiple.elites') },
    { value: onboardingMultipleActionModes.EVERYONE, label: t('onboarding.answer.multiple.everyone') },
  ];
  const automaticAvailable = answers.organization === temporalityModes.CLASSIC
    && answers.initiativeFormat === onboardingInitiativeFormats.DESCENDING
    && !answers.declarationMode;
  options.push({
    value: onboardingMultipleActionModes.AUTOMATIC,
    label: automaticAvailable
      ? t('onboarding.answer.multiple.automatic')
      : t(answers.organization === temporalityModes.FLEXIBLE
        ? 'onboarding.answer.multiple.automaticUnavailableFlexible'
        : 'onboarding.answer.multiple.automaticUnavailable'),
    disabled: !automaticAvailable,
  });
  return options;
}

function CompactFlowOptions({ answers, onSetAnswer }) {
  const actionsAvailable = answers.organization !== temporalityModes.PHASES;
  return (
    <div className="onboarding-flow-options">
      {actionsAvailable && (
        <label className="onboarding-inline-select">
          <span>{t('onboarding.question.multiple.compact')}</span>
          <select value={answers.multipleActions} onChange={(event) => onSetAnswer('multipleActions', event.target.value)}>
            {multipleActionOptions(answers).map((option) => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function OnboardingQuestion({ question, value, onChange, answers, onSetAnswer }) {
  return (
    <section className="onboarding-section">
      <div className="onboarding-question-heading">
        <span>{question.eyebrow}</span>
        <h2>{question.title}</h2>
        {question.help && <p className="onboarding-section-note">{question.help}</p>}
      </div>
      {question.type === 'text'
        ? <label className="field onboarding-text-answer"><span>{question.inputLabel}</span><input autoFocus value={value || ''} onChange={(event) => onChange(event.target.value)} /></label>
        : <div className="stack onboarding-preset-list" role="list" aria-label={question.title}>{question.options.map((option) => <ChoiceCard key={option.value} option={option} selected={option.value === value} onSelect={onChange} />)}</div>}
      {question.id === 'organization' && (
        <div className="onboarding-opening-options">
          <label className={`global-switch onboarding-inline-switch ${answers.surpriseRound ? 'active' : ''}`}>
            <span>{t('onboarding.question.surprise.switch')}</span>
            <input type="checkbox" checked={!!answers.surpriseRound} onChange={(event) => onSetAnswer('surpriseRound', event.target.checked)} />
          </label>
          <label className={`global-switch onboarding-inline-switch ${answers.declarationMode ? 'active' : ''}`}>
            <span>{t('onboarding.question.declaration.compact')}</span>
            <input type="checkbox" checked={!!answers.declarationMode} onChange={(event) => onSetAnswer('declarationMode', event.target.checked)} />
          </label>
        </div>
      )}
      {question.id === 'phaseType' && (
        <label className="field onboarding-number-answer">
          <span>{t(answers.phaseType === phaseActionModes.AUTOMATIC ? 'onboarding.question.phase.decrement' : 'onboarding.question.phase.count')}</span>
          <input type="number" inputMode="numeric" min="1" max={answers.phaseType === phaseActionModes.CHECKED ? 20 : undefined} step="1" value={answers.phaseType === phaseActionModes.AUTOMATIC ? answers.phaseDecrement : answers.phaseCount} onChange={(event) => onSetAnswer(answers.phaseType === phaseActionModes.AUTOMATIC ? 'phaseDecrement' : 'phaseCount', event.target.value)} />
        </label>
      )}
      {question.id === 'tiebreakerVisible' && answers.tiebreakerVisible && (
        <label className="field onboarding-inline-text-answer">
          <span>{t('onboarding.question.tiebreakerLabel.input')}</span>
          <input value={answers.tiebreakerLabel || ''} onChange={(event) => onSetAnswer('tiebreakerLabel', event.target.value)} />
        </label>
      )}
      {question.compactFlowOptions && <CompactFlowOptions answers={answers} onSetAnswer={onSetAnswer} />}
    </section>
  );
}

function RulesSummary({ rules, answers, definitions = [] }) {
  const summary = activeRuleSummary(rules);
  return (
    <section className="onboarding-section">
      <div className="onboarding-question-heading">
        <span>{t('onboarding.question.summary.eyebrow')}</span>
        <h2>{t('onboarding.question.summary.title')}</h2>
        <p className="onboarding-section-note">{t('onboarding.question.summary.help')}</p>
      </div>
      <div className="onboarding-rule-summary">
        {summary.map((item) => <span key={item}>{item}</span>)}
        {answers.surpriseRound && <span>{t('onboarding.summary.surpriseRound')}</span>}
        {answers.initiativeSource === 'roll' && onboardingUsesInitiative(answers) && answers.initiativeFormat !== onboardingInitiativeFormats.LABELS && <span>{t('onboarding.summary.randomInitiative')}</span>}
      </div>
      <div className="onboarding-rule-summary">
        <strong>{t('onboarding.summary.rolls')}</strong>
        {definitions.filter((definition) => definition.exposed !== false && definition.active !== false).map((definition) => <span key={definition.id}>{definition.name}</span>)}
      </div>
    </section>
  );
}

export function OnboardingRandomSetup({ randomSystem, initiativeRequested = false, initiativeRollDefinitionId = '', onSelectInitiative }) {
  const [advanced, setAdvanced] = useState(false);
  const [selectedKitId, setSelectedKitId] = useState('');
  const definitions = randomSystem?.state?.definitions || [];
  const sources = (randomSystem?.state?.sources || []).filter((source) => source.kind !== 'cards');
  const availableDefinitions = definitions.filter((definition) => definition.exposed !== false);
  const selectableDefinitions = availableDefinitions.filter((definition) => definition.active !== false);
  const cardSources = (randomSystem?.state?.sources || []).filter((source) => source.kind === 'cards');
  const savedKits = randomSystem?.state?.randomKits || [];
  return (
    <section className="onboarding-section onboarding-random-setup">
      <div className="onboarding-question-heading">
        <span>{t('onboarding.random.eyebrow')}</span>
        <h2>{t('onboarding.random.title')}</h2>
        <p className="onboarding-section-note">{t('onboarding.random.help')}</p>
      </div>
      <div className="onboarding-initiative-roll">
        <label className="field">{t('random.kits.savedGroups')}
          <select value={selectedKitId} onChange={(event) => setSelectedKitId(event.target.value)}>
            <option value="">{t('random.kits.choose')}</option>
            <optgroup label={t('random.kits.catalog')}>{randomKitCatalog.map((kit) => <option key={kit.id} value={kit.id}>{kit.label}</option>)}</optgroup>
            {savedKits.length > 0 && <optgroup label={t('random.kits.personalGroups')}>{savedKits.map((kit) => <option key={kit.id} value={kit.id}>{kit.label}</option>)}</optgroup>}
          </select>
        </label>
        <button type="button" className="small-btn" disabled={!selectedKitId} onClick={() => randomSystem?.actions?.applyRandomKitSelection?.(selectedKitId)}>{t('random.kits.apply')}</button>
      </div>
      {initiativeRequested && (
        <div className="onboarding-initiative-roll">
          <label className="field">
            {t('onboarding.random.initiativeRoll')}
            <select
              value={initiativeRollDefinitionId}
              disabled={!selectableDefinitions.length}
              onChange={(event) => onSelectInitiative?.(event.target.value)}
            >
              {!selectableDefinitions.length && <option value="">{t('onboarding.random.initiativeMissing')}</option>}
              {selectableDefinitions.map((definition) => <option value={definition.id} key={definition.id}>{definition.name}</option>)}
            </select>
          </label>
          <p className={selectableDefinitions.length ? 'muted compact-help' : 'rule-warning'}>
            {t(selectableDefinitions.length ? 'onboarding.random.initiativeHelp' : 'onboarding.random.initiativeRequired')}
          </p>
        </div>
      )}
      <div className="rs-roll-availability-list onboarding-roll-availability-list">
        {availableDefinitions.map((definition) => (
          <label className={`global-switch ${definition.active !== false ? 'active' : ''}`} key={definition.id}>
            <span>{definition.name}</span>
            <input type="checkbox" checked={definition.active !== false} onChange={(event) => randomSystem?.actions?.setDefinitionActive?.(definition.id, event.target.checked)} />
          </label>
        ))}
        {cardSources.map((source) => (
          <label className={`global-switch ${source.exposed !== false ? 'active' : ''}`} key={source.id}>
            <span>{source.name}</span>
            <input type="checkbox" checked={source.exposed !== false} onChange={(event) => randomSystem?.actions?.saveSource?.({ ...source, exposed: event.target.checked })} />
          </label>
        ))}
      </div>
      <button type="button" className="small-btn" onClick={() => setAdvanced((current) => !current)}>{t(advanced ? 'onboarding.random.hideAdvanced' : 'onboarding.random.advanced')}</button>
      {advanced && <DefinitionEditor definitions={definitions} sources={sources} rulePool={randomSystem?.state?.rulePool} actions={randomSystem?.actions} initialNoCodeView="essential" />}
      <p className="muted compact-help onboarding-random-later">{t('onboarding.random.later')}</p>
    </section>
  );
}

export function OnboardingStartActions({ disabled = false, onStartDirect, onStartTutorial }) {
  return <div className="onboarding-start-choice"><button type="button" className="primary" onClick={onStartTutorial} disabled={disabled}>{t('onboarding.startChoice.tutorial')}</button><button type="button" className="small-btn" onClick={onStartDirect} disabled={disabled}>{t('onboarding.startChoice.direct')}</button></div>;
}

export function questionnaireSteps(answers, includeRandomSetup = false) {
  const usesInitiative = onboardingUsesInitiative(answers);
  const forcedNumeric = onboardingForcesNumericInitiative(answers);
  const labelInitiative = usesInitiative && !forcedNumeric && answers.initiativeFormat === onboardingInitiativeFormats.LABELS;
  const steps = [
    {
      id: 'organization',
      eyebrow: t('onboarding.question.organization.eyebrow'),
      title: t('onboarding.question.organization.title'),
      help: t('onboarding.question.organization.help'),
      options: [
        { value: temporalityModes.CLASSIC, label: t('onboarding.answer.organization.classic'), description: t('onboarding.answer.organization.classicHelp') },
        { value: temporalityModes.FLEXIBLE, label: t('onboarding.answer.organization.flexible'), description: t('onboarding.answer.organization.flexibleHelp') },
        { value: temporalityModes.PHASES, label: t('onboarding.answer.organization.phases'), description: t('onboarding.answer.organization.phasesHelp') },
      ],
    },
  ];

  if (answers.organization === temporalityModes.FLEXIBLE) {
    steps.push({
      id: 'flexibleInitiative',
      compactFlowOptions: true,
      eyebrow: t('onboarding.question.flexibleInitiative.eyebrow'),
      title: t('onboarding.question.flexibleInitiative.title'),
      help: t('onboarding.question.flexibleInitiative.help'),
      options: [
        { value: true, label: t('onboarding.answer.flexibleInitiative.yes'), description: t('onboarding.answer.flexibleInitiative.yesHelp') },
        { value: false, label: t('onboarding.answer.flexibleInitiative.no'), description: t('onboarding.answer.flexibleInitiative.noHelp') },
      ],
    });
  }

  if (answers.organization === temporalityModes.PHASES) {
    steps.push({
      id: 'phaseType',
      eyebrow: t('onboarding.question.phaseType.eyebrow'),
      title: t('onboarding.question.phaseType.title'),
      help: t('onboarding.question.phaseType.help'),
      options: [
        { value: phaseActionModes.AUTOMATIC, label: t('onboarding.answer.phaseType.automatic'), description: t('onboarding.answer.phaseType.automaticHelp') },
        { value: phaseActionModes.CHECKED, label: t('onboarding.answer.phaseType.checked'), description: t('onboarding.answer.phaseType.checkedHelp') },
      ],
    });
  }

  if (usesInitiative && !(answers.organization === temporalityModes.PHASES && answers.phaseType === phaseActionModes.AUTOMATIC)) {
    steps.push({
      id: 'initiativeFormat',
      compactFlowOptions: answers.organization === temporalityModes.CLASSIC,
      eyebrow: t('onboarding.question.initiativeFormat.eyebrow'),
      title: t('onboarding.question.initiativeFormat.title'),
      help: t('onboarding.question.initiativeFormat.help'),
      options: [
        { value: onboardingInitiativeFormats.DESCENDING, label: t('onboarding.answer.initiativeFormat.desc'), description: t('onboarding.answer.initiativeFormat.descHelp') },
        { value: onboardingInitiativeFormats.ASCENDING, label: t('onboarding.answer.initiativeFormat.asc'), description: t('onboarding.answer.initiativeFormat.ascHelp') },
        { value: onboardingInitiativeFormats.LABELS, label: t('onboarding.answer.initiativeFormat.labels'), description: t('onboarding.answer.initiativeFormat.labelsHelp') },
      ],
    });
  }

  if (
    (answers.organization === temporalityModes.PHASES && answers.phaseType === phaseActionModes.AUTOMATIC)
    || answers.multipleActions === onboardingMultipleActionModes.AUTOMATIC
  ) {
    steps.push({
      id: 'phaseReroll',
      eyebrow: t('onboarding.question.reroll.eyebrow'),
      title: t('onboarding.question.reroll.title'),
      help: t('onboarding.question.reroll.help'),
      options: [
        { value: true, label: t('onboarding.answer.reroll.yes'), description: t('onboarding.answer.reroll.yesHelp') },
        { value: false, label: t('onboarding.answer.reroll.no'), description: t('onboarding.answer.reroll.noHelp') },
      ],
    });
  }

  if (labelInitiative) {
    steps.push({
      id: 'labelPreset',
      eyebrow: t('onboarding.question.labels.eyebrow'),
      title: t('onboarding.question.labels.title'),
      help: t('onboarding.question.labels.help'),
      options: [
        { value: onboardingLabelPresets.FAST_SLOW, label: t('onboarding.answer.labels.fastSlow'), description: t('onboarding.answer.labels.fastSlowHelp') },
        { value: onboardingLabelPresets.CARDS, label: t('onboarding.answer.labels.cards'), description: t('onboarding.answer.labels.cardsHelp') },
        { value: onboardingLabelPresets.TAROT, label: t('onboarding.answer.labels.tarot'), description: t('onboarding.answer.labels.tarotHelp') },
      ],
    });
  }

  if (usesInitiative) {
    steps.push({
      id: 'tiebreakerVisible',
      eyebrow: t('onboarding.question.tiebreaker.eyebrow'),
      title: t('onboarding.question.tiebreaker.title'),
      help: t('onboarding.question.tiebreaker.help'),
      options: [
        { value: true, label: t('onboarding.answer.tiebreaker.yes'), description: t('onboarding.answer.tiebreaker.yesHelp') },
        { value: false, label: t('onboarding.answer.tiebreaker.no'), description: t('onboarding.answer.tiebreaker.noHelp') },
      ],
    });
  }

  if (usesInitiative && !labelInitiative) {
    steps.push({
      id: 'initiativeSource',
      eyebrow: t('onboarding.question.initiativeSource.eyebrow'),
      title: t('onboarding.question.initiativeSource.title'),
      help: t('onboarding.question.initiativeSource.help'),
      options: [
        { value: 'fixed', label: t('onboarding.answer.initiativeSource.fixed'), description: t('onboarding.answer.initiativeSource.fixedHelp') },
        { value: 'roll', label: t('onboarding.answer.initiativeSource.roll'), description: t('onboarding.answer.initiativeSource.rollHelp') },
      ],
    });
  }

  return [...steps, ...(includeRandomSetup ? [{ id: 'randomSetup' }] : []), { id: 'summary' }];
}

export function FirstRunOnboarding({ dark, initialRules = null, randomSystem = null, onToggleTheme, onStartRules, onStartCustomRules, onCancel, showCustomRules = true, offerSceneTutorial = true }) {
  const [answers, setAnswers] = useState(() => onboardingAnswersFromRules(onboardingDefaultRules));
  const [stepIndex, setStepIndex] = useState(0);
  const seededDnd5Rolls = useRef(false);
  useEffect(() => {
    if (!randomSystem || seededDnd5Rolls.current) return;
    seededDnd5Rolls.current = true;
    const definitions = createDnd5DefaultDefinitions(randomSystem.state?.sources || []);
    const knownIds = new Set((randomSystem.state?.definitions || []).map((definition) => definition.id));
    [...definitions].reverse().filter((definition) => !knownIds.has(definition.id)).forEach((definition) => randomSystem.actions?.saveDefinition(definition));
    setAnswers((current) => ({
      ...current,
      initiativeRollDefinitionId: dnd5InitiativeDefinitionId,
    }));
  }, [randomSystem]);
  const steps = useMemo(() => questionnaireSteps(answers, !!randomSystem), [answers, randomSystem]);
  const safeStepIndex = Math.min(stepIndex, steps.length - 1);
  const step = steps[safeStepIndex];
  const displayedStep = step;
  const selectableDefinitions = (randomSystem?.state?.definitions || []).filter((definition) => definition.exposed !== false && definition.active !== false);
  const initiativeRequested = answers.initiativeSource === 'roll'
    && onboardingUsesInitiative(answers)
    && answers.initiativeFormat !== onboardingInitiativeFormats.LABELS;
  const initiativeRollDefinitionId = selectableDefinitions.some((definition) => definition.id === answers.initiativeRollDefinitionId)
    ? answers.initiativeRollDefinitionId
    : selectableDefinitions[0]?.id || '';
  const rules = useMemo(() => ({
    ...campaignRulesFromOnboardingAnswers(answers, onboardingDefaultRules),
    initiativeBonusRollDefinitionId: initiativeRequested ? initiativeRollDefinitionId : '',
  }), [answers, initiativeRequested, initiativeRollDefinitionId]);
  const value = displayedStep?.id === 'summary' ? null : answers[displayedStep?.id];
  const inlineTiebreakerComplete = displayedStep?.id !== 'tiebreakerVisible' || !answers.tiebreakerVisible || String(answers.tiebreakerLabel || '').trim().length > 0;
  const phaseValue = Number(answers.phaseType === phaseActionModes.AUTOMATIC ? answers.phaseDecrement : answers.phaseCount);
  const inlinePhaseNumberComplete = displayedStep?.id !== 'phaseType'
    || (Number.isInteger(phaseValue) && phaseValue >= 1 && (answers.phaseType !== phaseActionModes.CHECKED || phaseValue <= 20));
  const canContinue = inlineTiebreakerComplete
    && inlinePhaseNumberComplete
    && (displayedStep?.id !== 'randomSetup' || !initiativeRequested || !!initiativeRollDefinitionId)
    && (['summary', 'randomSetup'].includes(displayedStep?.id) || (displayedStep?.type === 'text' ? String(value || '').trim().length > 0 : value !== undefined && value !== null));
  const setAnswer = (nextValue) => setAnswers((current) => ({
    ...current,
    [step.id]: nextValue,
    ...(step.id === 'organization'
      && nextValue !== temporalityModes.CLASSIC
      && current.multipleActions === onboardingMultipleActionModes.AUTOMATIC
      ? { multipleActions: onboardingMultipleActionModes.NEVER }
      : {}),
    ...(step.id === 'initiativeFormat'
      && nextValue !== onboardingInitiativeFormats.DESCENDING
      && current.multipleActions === onboardingMultipleActionModes.AUTOMATIC
      ? { multipleActions: onboardingMultipleActionModes.NEVER }
      : {}),
  }));
  const setNamedAnswer = (id, nextValue) => setAnswers((current) => ({
    ...current,
    [id]: nextValue,
    ...(id === 'multipleActions' && nextValue === onboardingMultipleActionModes.AUTOMATIC
      ? { declarationMode: false, initiativeFormat: onboardingInitiativeFormats.DESCENDING }
      : {}),
    ...(id === 'declarationMode' && nextValue && current.multipleActions === onboardingMultipleActionModes.AUTOMATIC
      ? { multipleActions: onboardingMultipleActionModes.NEVER }
      : {}),
  }));
  const next = () => setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  const previous = () => setStepIndex((current) => Math.max(current - 1, 0));
  const start = (tutorial) => onStartRules?.({ rules, randomSystem: randomSystem?.state || null }, tutorial);
  const skipConfiguration = () => {
    setAnswers((current) => ({ ...onboardingAnswersFromRules(onboardingDefaultRules), initiativeRollDefinitionId: dnd5InitiativeDefinitionId, surpriseRound: current.surpriseRound }));
    setStepIndex(Math.max(0, steps.length - 2));
  };

  return (
    <div className={`app welcome-app ${dark ? 'dark' : ''}`} data-skin="cadence" data-mode={dark ? 'dark' : 'light'}>
      <main className={`welcome-shell ${displayedStep?.id === 'randomSetup' ? 'onboarding-random-shell' : ''}`}>
        <section className="panel welcome-panel">
          <div className="welcome-topbar">
            <div className="loading-mark welcome-mark"><img src={getCadenceLogo(dark)} alt="Cadence" /></div>
            <div className="welcome-topbar-actions">
              {showCustomRules && <button type="button" className="small-btn onboarding-advanced-entry" onClick={() => onStartCustomRules?.()}>{t('onboarding.advanced')}</button>}
              <button className={`theme-toggle ${dark ? 'dark-on' : 'light-on'}`} onClick={() => onToggleTheme?.(!dark)} aria-label={t('onboarding.toggleTheme')}><span>{uiGlyphs.themeLight}</span><span>{uiGlyphs.themeDark}</span><i /></button>
            </div>
          </div>
          <div className="welcome-copy">
            <strong className="brand-title">Cadence</strong>
            <h1>{t('onboarding.title')}</h1>
            <p>{t('onboarding.description')}</p>
          </div>
          {initialRules && safeStepIndex === 0 && (
            <div className="onboarding-reset-warning" role="alert">
              <div>
                <strong>{t('onboarding.resetWarning.title')}</strong>
                <p>{t('onboarding.resetWarning.body')}</p>
              </div>
              {onCancel && <button type="button" className="small-btn" onClick={onCancel}>{t('onboarding.resetWarning.cancel')}</button>}
            </div>
          )}
          <div className="onboarding-step" key={displayedStep?.id}>
            {displayedStep?.id === 'summary'
              ? <RulesSummary rules={rules} answers={answers} definitions={randomSystem?.state?.definitions || []} />
              : displayedStep?.id === 'randomSetup'
                ? <OnboardingRandomSetup randomSystem={randomSystem} initiativeRequested={initiativeRequested} initiativeRollDefinitionId={initiativeRollDefinitionId} onSelectInitiative={(definitionId) => setNamedAnswer('initiativeRollDefinitionId', definitionId)} />
                : <OnboardingQuestion question={displayedStep} value={value} onChange={setAnswer} answers={answers} onSetAnswer={setNamedAnswer} />}
          </div>
          <div className={`welcome-actions onboarding-step-actions ${displayedStep?.id === 'summary' ? 'onboarding-summary-actions' : ''}`.trim()}>
            {safeStepIndex > 0 && <button type="button" className="small-btn" onClick={previous}>{t('onboarding.back')}</button>}
            {safeStepIndex < steps.length - 1
              ? <button type="button" className="primary" onClick={next} disabled={!canContinue}>{t('onboarding.next')}</button>
              : <>{offerSceneTutorial ? <OnboardingStartActions disabled={!canContinue} onStartDirect={() => start(false)} onStartTutorial={() => start(true)} /> : <button type="button" className="primary" disabled={!canContinue} onClick={() => start(false)}>{t('onboarding.apply')}</button>}{onCancel && <button type="button" className="small-btn" onClick={onCancel}>{t('common.cancel')}</button>}</>}
            {safeStepIndex === 0 && (
              <div className="onboarding-skip-config">
                <button type="button" className="small-btn" onClick={skipConfiguration}>{t('onboarding.skip')}</button>
                <span>{t('onboarding.skipHelp')}</span>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
