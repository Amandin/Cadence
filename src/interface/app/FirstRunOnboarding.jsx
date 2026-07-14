import { useEffect, useMemo, useState } from 'react';
import { initiativeProfileStatuses, initiativeProfilesForSystem, onboardingSupportSummary, quickRollProfilesForSystem } from '../../domain/systemProfiles.js';
import { t } from '../../i18n/index.js';
import { getCadenceLogo, uiGlyphs } from '../../uiAssets.js';

function SystemCard({ profile, selected, onSelect, onActivate }) {
  return (
    <button type="button" className={`choice onboarding-preset-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(profile.id)} onDoubleClick={() => onActivate?.(profile.id)}><span className="onboarding-preset-name">{profile.name}</span>{profile.description && <span className="onboarding-preset-description">{profile.description}</span>}</button>
  );
}

function EditionCard({ edition, selected, onSelect }) {
  return <button type="button" className={`choice onboarding-preset-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onSelect(edition.id)}><span className="onboarding-preset-name">{edition.label}</span></button>;
}

function InitiativeProfileCard({ profile, examples, selected, onSelect }) {
  const available = profile.status === initiativeProfileStatuses.AVAILABLE;
  return (
    <button
      type="button"
      className={`choice onboarding-preset-card ${selected ? 'selected' : ''} ${available ? '' : 'disabled'}`}
      onClick={() => available && onSelect(profile.id)}
      aria-pressed={selected}
      disabled={!available}
    >
      <span className="onboarding-preset-name">{profile.label}</span>
      <span className="onboarding-preset-description">{profile.description || profile.examples || examples}</span>
      {!available && <span className="onboarding-preset-description">{t('onboarding.profile.planned')}</span>}
    </button>
  );
}

function QuickRollProfileCard({ profile, selected, onToggle }) {
  return <button type="button" className={`choice onboarding-preset-card ${selected ? 'selected' : ''}`} aria-pressed={selected} onClick={() => onToggle(profile.id)}><span className="onboarding-preset-name">{profile.label}</span><span className="onboarding-preset-description">{profile.description}</span></button>;
}

function OnboardingSection({ title, children }) {
  return (
    <section className="onboarding-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function SupportSummary({ summary }) {
  const groups = [
    ['onboarding.summary.ready', summary.ready],
    ['onboarding.summary.atHand', summary.atHand],
    ['onboarding.summary.yourCall', summary.yourCall],
  ];
  return <div className="stack onboarding-support-summary">{groups.map(([labelKey, items]) => <div key={labelKey}><strong>{t(labelKey)}</strong><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></div>)}</div>;
}

export function OnboardingStartActions({ disabled = false, onStartDirect, onStartTutorial }) {
  return <div className="onboarding-start-choice"><button type="button" className="primary" onClick={onStartTutorial} disabled={disabled}>{t('onboarding.startChoice.tutorial')}</button><button type="button" className="small-btn" onClick={onStartDirect} disabled={disabled}>{t('onboarding.startChoice.direct')}</button></div>;
}

export function FirstRunOnboarding({ dark, systemProfiles = [], initialProfile = null, onToggleTheme, onStartProfile, onStartCustomRules, onCancel, showCustomRules = true, offerSceneTutorial = true }) {
  const preferredSystemProfileId = useMemo(() => systemProfiles.find((profile) => profile.id === 'system/dnd-pathfinder')?.id || systemProfiles[0]?.id || '', [systemProfiles]);
  const [systemProfileId, setSystemProfileId] = useState(() => initialProfile?.systemProfileId || preferredSystemProfileId);
  const systemProfile = useMemo(() => systemProfiles.find((profile) => profile.id === systemProfileId) || systemProfiles[0] || null, [systemProfileId, systemProfiles]);
  const [editionId, setEditionId] = useState(() => initialProfile?.editionId || '');
  const initiativeProfiles = useMemo(() => initiativeProfilesForSystem(systemProfile?.id, editionId), [editionId, systemProfile?.id]);
  const [initiativeProfileId, setInitiativeProfileId] = useState(() => initialProfile?.initiativeProfileId || '');
  const quickRollProfiles = useMemo(() => quickRollProfilesForSystem(systemProfile?.id, initiativeProfileId), [initiativeProfileId, systemProfile?.id]);
  const [randomQuickRollProfileIds, setRandomQuickRollProfileIds] = useState(() => initialProfile?.randomQuickRollProfileIds || []);
  const [quickRollSelectionSystemId, setQuickRollSelectionSystemId] = useState('');
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (systemProfiles.some((profile) => profile.id === systemProfileId)) return;
    setSystemProfileId(preferredSystemProfileId);
  }, [preferredSystemProfileId, systemProfileId, systemProfiles]);

  useEffect(() => {
    const editions = systemProfile?.editions || [];
    if (!editions.length) {
      setEditionId('');
      return;
    }
    if (editions.some((edition) => edition.id === editionId)) return;
    const recommendedEdition = editions.find((edition) => initiativeProfilesForSystem(systemProfile.id, edition.id)
      .some((profile) => profile.status === initiativeProfileStatuses.AVAILABLE));
    setEditionId((recommendedEdition || editions[0]).id);
  }, [editionId, systemProfile]);

  useEffect(() => {
    const available = initiativeProfiles.filter((profile) => profile.status === initiativeProfileStatuses.AVAILABLE);
    if (available.some((profile) => profile.id === initiativeProfileId)) return;
    setInitiativeProfileId(available[0]?.id || '');
  }, [initiativeProfileId, initiativeProfiles]);

  useEffect(() => {
    const selectionKey = `${systemProfile?.id || ''}:${initiativeProfileId}`;
    if (quickRollSelectionSystemId === selectionKey) return;
    setRandomQuickRollProfileIds(quickRollProfiles.length === 1 ? [quickRollProfiles[0].id] : []);
    setQuickRollSelectionSystemId(selectionKey);
  }, [initiativeProfileId, quickRollProfiles, quickRollSelectionSystemId, systemProfile?.id]);

  const selectedInitiativeProfile = initiativeProfiles.find((profile) => profile.id === initiativeProfileId) || null;
  const chooseSystem = (nextSystemProfileId) => {
    const nextSystem = systemProfiles.find((profile) => profile.id === nextSystemProfileId) || null;
    const nextEditionId = nextSystem?.editions?.[0]?.id || '';
    const nextInitiativeProfiles = initiativeProfilesForSystem(nextSystemProfileId, nextEditionId).filter((profile) => profile.status === initiativeProfileStatuses.AVAILABLE);
    setSystemProfileId(nextSystemProfileId);
    setEditionId(nextEditionId);
    setInitiativeProfileId(nextInitiativeProfiles[0]?.id || '');
    const nextQuickRollProfiles = quickRollProfilesForSystem(nextSystemProfileId, nextInitiativeProfiles[0]?.id || '');
    setRandomQuickRollProfileIds(nextQuickRollProfiles.length === 1 ? [nextQuickRollProfiles[0].id] : []);
    setStepIndex(0);
  };
  const chooseEdition = (nextEditionId) => {
    const nextInitiativeProfiles = initiativeProfilesForSystem(systemProfile?.id, nextEditionId).filter((profile) => profile.status === initiativeProfileStatuses.AVAILABLE);
    setEditionId(nextEditionId);
    setInitiativeProfileId(nextInitiativeProfiles[0]?.id || '');
  };
  const toggleQuickRollProfile = (profileId) => setRandomQuickRollProfileIds((current) => current.includes(profileId) ? current.filter((id) => id !== profileId) : [...current, profileId]);
  const supportSummary = useMemo(() => onboardingSupportSummary({ initiativeProfileId, randomQuickRollProfileIds }), [initiativeProfileId, randomQuickRollProfileIds]);
  const steps = useMemo(() => [
    { id: 'system', title: t('onboarding.system.title') },
    ...(systemProfile?.editions?.length > 1 ? [{ id: 'edition', title: t('onboarding.edition.title') }] : []),
    ...(initiativeProfiles.length > 1 ? [{ id: 'initiative', title: t('onboarding.initiative.title') }] : []),
    ...(quickRollProfiles.length > 1 ? [{ id: 'quick-rolls', title: t('onboarding.quickRolls.title') }] : []),
    { id: 'summary', title: t('onboarding.summary.title') },
  ], [initiativeProfiles.length, quickRollProfiles.length, systemProfile?.editions?.length]);
  const step = steps[stepIndex] || steps[0];

  useEffect(() => {
    if (stepIndex < steps.length) return;
    setStepIndex(Math.max(0, steps.length - 1));
  }, [stepIndex, steps.length]);

  const canContinue = step?.id !== 'initiative' || !!selectedInitiativeProfile;
  const next = () => setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  const previous = () => setStepIndex((current) => Math.max(current - 1, 0));
  const startSelection = { systemProfileId: systemProfile?.id, editionId, initiativeProfileId: selectedInitiativeProfile?.id, randomQuickRollProfileIds };

  return (
    <div className={`app welcome-app ${dark ? 'dark' : ''}`} data-skin="cadence" data-mode={dark ? 'dark' : 'light'}>
      <main className="welcome-shell">
        <section className="panel welcome-panel">
          <div className="welcome-topbar">
            <div className="loading-mark welcome-mark">
              <img src={getCadenceLogo(dark)} alt="Cadence" />
            </div>
            <button className={`theme-toggle ${dark ? 'dark-on' : 'light-on'}`} onClick={() => onToggleTheme?.(!dark)} aria-label={t('onboarding.toggleTheme')}><span>{uiGlyphs.themeLight}</span><span>{uiGlyphs.themeDark}</span><i /></button>
          </div>
          <div className="welcome-copy">
            <strong className="brand-title">Cadence</strong>
            <h1>{t('onboarding.title')}</h1>
            <p>{t('onboarding.description')}</p>
          </div>
          <div className="onboarding-step-progress" aria-live="polite">{t('onboarding.progress', { current: stepIndex + 1, total: steps.length })}</div>
          <div className="onboarding-step" key={step?.id}>
            {step?.id === 'system' && <OnboardingSection title={step.title}><div className="stack onboarding-preset-list" role="list" aria-label={step.title}>{systemProfiles.map((profile) => <SystemCard key={profile.id} profile={profile} selected={profile.id === systemProfile?.id} onSelect={chooseSystem} onActivate={(profileId) => { chooseSystem(profileId); setStepIndex(1); }} />)}</div></OnboardingSection>}
            {step?.id === 'edition' && <OnboardingSection title={step.title}><div className="stack onboarding-preset-list" role="list" aria-label={step.title}>{systemProfile.editions.map((edition) => <EditionCard key={edition.id} edition={edition} selected={edition.id === editionId} onSelect={chooseEdition} />)}</div></OnboardingSection>}
            {step?.id === 'initiative' && <OnboardingSection title={step.title}><div className="stack onboarding-preset-list" role="list" aria-label={step.title}>{initiativeProfiles.map((profile) => <InitiativeProfileCard key={profile.id} profile={profile} examples={systemProfile?.examples} selected={profile.id === initiativeProfileId} onSelect={setInitiativeProfileId} />)}</div></OnboardingSection>}
            {step?.id === 'quick-rolls' && <OnboardingSection title={step.title}><p className="onboarding-section-note">{t('onboarding.quickRolls.help')}</p><div className="stack onboarding-preset-list" role="list" aria-label={step.title}>{quickRollProfiles.map((profile) => <QuickRollProfileCard key={profile.id} profile={profile} selected={randomQuickRollProfileIds.includes(profile.id)} onToggle={toggleQuickRollProfile} />)}</div></OnboardingSection>}
            {step?.id === 'summary' && <OnboardingSection title={step.title}><p className="onboarding-section-note">{t('onboarding.summary.help')}</p><SupportSummary summary={supportSummary} /></OnboardingSection>}
          </div>
          <div className="welcome-actions onboarding-step-actions">
            {stepIndex > 0 && <button type="button" className="small-btn" onClick={previous}>{t('onboarding.back')}</button>}
            {step?.id === 'system' && showCustomRules && <button type="button" className="primary onboarding-custom-action" onClick={() => onStartCustomRules?.()}>{t('onboarding.defineRules')}</button>}
            {stepIndex < steps.length - 1 ? <button type="button" className="primary" onClick={next} disabled={!canContinue}>{t('onboarding.next')}</button> : <>{offerSceneTutorial ? <OnboardingStartActions disabled={!systemProfile || !selectedInitiativeProfile} onStartDirect={() => selectedInitiativeProfile && onStartProfile?.(startSelection, false)} onStartTutorial={() => selectedInitiativeProfile && onStartProfile?.(startSelection, true)} /> : <button type="button" className="primary" onClick={() => selectedInitiativeProfile && onStartProfile?.(startSelection, false)} disabled={!systemProfile || !selectedInitiativeProfile}>{t('onboarding.start')}</button>}{showCustomRules && <button type="button" className="small-btn onboarding-custom-action" onClick={() => onStartCustomRules?.()}><span className="onboarding-preset-name">{t('onboarding.customRules')}</span></button>}{onCancel && <button type="button" className="small-btn" onClick={onCancel}>{t('common.cancel')}</button>}</>}
          </div>
        </section>
      </main>
    </div>
  );
}
