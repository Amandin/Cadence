import { t } from './i18n/index.js';
import { newTracker } from './logic.js';
import { makeTrackerTemplateFromTracker, normalizeTemplateStore } from './templates.js';

const GENERIC_TRACKERS = [
  { type: 'bar', nameKey: 'onboarding.trackers.health', max: 20, healthThresholds: true },
  { type: 'points', nameKey: 'onboarding.trackers.resource', max: 5, current: 3 },
];

const SYSTEM_TRACKERS = {
  'systemes/appel-de-cthulhu-7e': [
    { type: 'bar', nameKey: 'onboarding.trackers.health', max: 12, healthThresholds: true },
    { type: 'bar', nameKey: 'onboarding.trackers.sanity', max: 60 },
    { type: 'bar', nameKey: 'onboarding.trackers.luck', max: 50 },
    { type: 'bar', nameKey: 'onboarding.trackers.magicPoints', max: 10 },
  ],
  'systemes/cosmere-rpg': [
    { type: 'bar', nameKey: 'onboarding.trackers.health', max: 10, healthThresholds: true },
    { type: 'bar', nameKey: 'onboarding.trackers.focus', max: 10 },
    { type: 'points', nameKey: 'onboarding.trackers.investiture', max: 5, current: 3 },
  ],
  'systemes/d20-tactique-dd-pathfinder': [
    { type: 'bar', nameKey: 'onboarding.trackers.health', max: 20, healthThresholds: true },
    { type: 'number', nameKey: 'onboarding.trackers.armorClass', current: 10 },
    { type: 'points', nameKey: 'onboarding.trackers.mainResource', max: 5, current: 3 },
  ],
  'systemes/d20-boss-mythique': [
    { type: 'bar', nameKey: 'onboarding.trackers.health', max: 100, healthThresholds: true },
    { type: 'points', nameKey: 'onboarding.trackers.legendaryActions', max: 3, current: 3 },
    { type: 'points', nameKey: 'onboarding.trackers.legendaryResistances', max: 3, current: 3 },
    { type: 'number', nameKey: 'onboarding.trackers.bossPhase', current: 1 },
  ],
  'systemes/narratif-sans-initiative-pbta-vtm': [
    { type: 'boxes', nameKey: 'onboarding.trackers.harm', boxes: 4 },
    { type: 'points', nameKey: 'onboarding.trackers.narrativeResource', max: 5, current: 3 },
  ],
  'systemes/savage-worlds': [
    { type: 'boxes', nameKey: 'onboarding.trackers.wounds', boxes: 3 },
    { type: 'boxes', nameKey: 'onboarding.trackers.fatigue', boxes: 2 },
    { type: 'points', nameKey: 'onboarding.trackers.bennies', max: 5, current: 3 },
  ],
  'systemes/shadowrun-5': [
    { type: 'boxes', nameKey: 'onboarding.trackers.physicalMonitor', boxes: 10 },
    { type: 'boxes', nameKey: 'onboarding.trackers.stunMonitor', boxes: 10 },
    { type: 'boxes', nameKey: 'onboarding.trackers.overflowMonitor', boxes: 4 },
    { type: 'points', nameKey: 'onboarding.trackers.edge', max: 7, current: 3 },
  ],
};

function healthThresholds(max) {
  return [
    { value: Math.ceil(max / 2), basis: 'fixed', label: t('onboarding.trackers.threshold.wounded'), color: 'amber', operator: 'lte' },
    { value: 0, basis: 'fixed', label: t('onboarding.trackers.threshold.out'), color: 'red', operator: 'lte' },
  ];
}

function makeBoxesTracker(name, count) {
  const tracker = newTracker('boxes');
  const block = tracker.blocks[0];
  const line = block.lines[0];
  return {
    ...tracker,
    name,
    blocks: [{
      ...block,
      label: name,
      lines: [{
        ...line,
        label: name,
        boxes: Array.from({ length: count }, (_, position) => ({
          id: `${line.id}-${position + 1}`,
          position,
          mark: 0,
          initial: 0,
        })),
      }],
    }],
  };
}

function makeTracker(descriptor) {
  const name = t(descriptor.nameKey);
  if (descriptor.type === 'boxes') return makeBoxesTracker(name, descriptor.boxes);

  const tracker = newTracker(descriptor.type);
  if (descriptor.type === 'bar') {
    return {
      ...tracker,
      name,
      current: descriptor.max,
      initial: descriptor.max,
      max: descriptor.max,
      step: 1,
      thresholds: descriptor.healthThresholds ? healthThresholds(descriptor.max) : [],
    };
  }
  if (descriptor.type === 'points') {
    return {
      ...tracker,
      name,
      current: descriptor.current,
      initial: descriptor.current,
      max: descriptor.max,
    };
  }
  return {
    ...tracker,
    name,
    current: descriptor.current,
    initial: descriptor.current,
  };
}

export function onboardingTrackerTemplatesForPreset(preset) {
  const descriptors = SYSTEM_TRACKERS[preset?.catalogId] || GENERIC_TRACKERS;
  return descriptors.map((descriptor) => {
    const tracker = makeTracker(descriptor);
    return makeTrackerTemplateFromTracker(tracker, { name: tracker.name });
  });
}

export function addOnboardingTrackerTemplates(store, preset) {
  const current = normalizeTemplateStore(store);
  const existingNames = new Set(current.trackerTemplates.map((template) => template.name.toLocaleLowerCase()));
  const additions = onboardingTrackerTemplatesForPreset(preset)
    .filter((template) => !existingNames.has(template.name.toLocaleLowerCase()));

  return normalizeTemplateStore({
    ...current,
    trackerTemplates: [...current.trackerTemplates, ...additions],
  });
}
