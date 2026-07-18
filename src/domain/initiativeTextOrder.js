const clean = (value) => String(value ?? '').trim();
const cleanSeparator = (value) => String(value ?? '');
const key = (value) => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const arr = (value) => Array.isArray(value) ? value : [];
const cardAliases = {
  joker: '\u{1F0CF}',
  excuse: '\u{1F0CF}',
  as: 'A',
  roi: 'R',
  dame: 'D',
  cavalier: 'C',
  valet: 'V',
  pique: '\u2660',
  coeur: '\u2665',
  'c\u0153ur': '\u2665',
  carreau: '\u2666',
  trefle: '\u2663',
  'tr\u00e8fle': '\u2663',
  pic: '\u2660',
  atout: '\u2605',
};
const uniq = (values) => {
  const seen = new Set();
  return arr(values)
    .map(clean)
    .filter(Boolean)
    .filter((value) => {
      const normalized = key(value);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
};

export const initiativeTextOrderPresetIds = { CARDS: 'cards', TAROT: 'tarot', POSTURES: 'postures' };
export const initiativeTextOrderPresets = {
  cards: {
    label: 'Paquet de cartes',
    separator: '',
    separators: [''],
    parts: [
      { label: 'Valeur', values: ['\u{1F0CF}', 'A', 'R', 'D', 'V', '10', '9', '8', '7', '6', '5', '4', '3', '2'] },
      { label: 'Couleur', values: ['\u2660', '\u2665', '\u2666', '\u2663'] },
    ],
  },
  tarot: {
    label: 'Tarot',
    separator: '',
    separators: [''],
    parts: [
      { label: 'Valeur', values: ['\u{1F0CF}', '21', '20', '19', '18', '17', '16', '15', '14', '13', '12', '11', '10', '9', '8', '7', '6', '5', '4', '3', '2', '1', 'R', 'D', 'C', 'V'] },
      { label: 'Famille', values: ['\u2605', '\u2660', '\u2665', '\u2666', '\u2663'] },
    ],
  },
  postures: {
    label: 'Postures / attitudes',
    separator: ' - ',
    separators: [' - '],
    parts: [
      { label: 'Posture', values: ['Foudroyante', 'Agressive', '\u00c9quilibr\u00e9e', 'D\u00e9fensive', 'Prudente', 'H\u00e9sitante'] },
      { label: 'Priorit\u00e9', values: ['Haute', 'Normale', 'Basse'] },
    ],
  },
};

function presetIds() {
  return Object.values(initiativeTextOrderPresetIds);
}

function canonicalKey(value) {
  const normalized = key(value);
  return key(cardAliases[normalized] || value);
}

function normalizeSeparators(source, parts) {
  const fallback = cleanSeparator(source.separator);
  const raw = arr(source.separators);
  return Array.from({ length: Math.max(0, parts.length - 1) }, (_, index) => (
    raw[index] == null ? fallback : cleanSeparator(raw[index])
  ));
}

export function normalizeInitiativeTextOrder(config = {}) {
  const preset = config.preset && initiativeTextOrderPresets[config.preset] ? initiativeTextOrderPresets[config.preset] : null;
  const source = preset ? { ...preset, ...config } : config;
  const parts = arr(source.parts)
    .map((part, index) => ({
      label: clean(part?.label) || `Partie ${index + 1}`,
      values: uniq(part?.values),
    }))
    .filter((part) => part.values.length);
  const separators = normalizeSeparators(source, parts);
  return {
    enabled: !!source.enabled,
    preset: clean(source.preset),
    sourceId: clean(source.sourceId || source.cardSourceId),
    cardSourceId: clean(source.cardSourceId),
    separator: separators[0] ?? cleanSeparator(source.separator) ?? ' de ',
    separators,
    unknown: source.unknown === 'first' ? 'first' : 'last',
    parts,
  };
}

export const initiativeTextOrderEnabled = (config) => {
  const normalized = normalizeInitiativeTextOrder(config);
  return normalized.enabled && normalized.parts.length > 0;
};

export const presetInitiativeTextOrder = (id) => normalizeInitiativeTextOrder({
  ...(initiativeTextOrderPresets[id] || initiativeTextOrderPresets.cards),
  preset: id,
  enabled: true,
});

function cardWeight(card = {}) {
  if (Number.isFinite(Number(card.value))) return Number(card.value);
  const value = canonicalKey(card.value || card.rank || card.label || card.id);
  if (value === canonicalKey('\u{1F0CF}') || value === 'joker' || value === 'excuse') return 1000;
  return 0;
}

function orderedCardFieldValues(cards = [], field) {
  const byValue = new Map();
  arr(cards).forEach((card, index) => {
    const value = clean(card?.[field]);
    if (!value) return;
    const existing = byValue.get(canonicalKey(value));
    const weight = cardWeight(card);
    if (!existing || weight > existing.weight) {
      byValue.set(canonicalKey(value), { value, weight, index });
    }
  });
  return [...byValue.values()]
    .sort((left, right) => right.weight - left.weight || left.index - right.index)
    .map((item) => item.value);
}

function cardRankValue(card = {}) {
  return clean(card.rank) || clean(card.label) || clean(card.value) || clean(card.id);
}

export function initiativeTextOrderFromCardSource(source = {}, baseConfig = {}) {
  const cards = arr(source.cards);
  const ranks = orderedCardFieldValues(cards.map((card) => ({ ...card, rank: cardRankValue(card) })), 'rank');
  const suits = orderedCardFieldValues(cards, 'suit');
  const parts = [
    { label: 'Valeur', values: ranks },
    ...(suits.length ? [{ label: 'Couleur', values: suits }] : []),
  ].filter((part) => part.values.length);
  return normalizeInitiativeTextOrder({
    ...baseConfig,
    enabled: baseConfig.enabled ?? true,
    preset: initiativeTextOrderPresetIds.CARDS,
    sourceId: source.id || baseConfig.sourceId || baseConfig.cardSourceId || '',
    cardSourceId: source.id || baseConfig.cardSourceId || '',
    separator: '',
    separators: Array.from({ length: Math.max(0, parts.length - 1) }, () => ''),
    unknown: baseConfig.unknown || 'last',
    parts,
  });
}

export function initiativeTextOrderFromRandomSource(source = {}, baseConfig = {}) {
  if (source?.kind === 'cards') return initiativeTextOrderFromCardSource(source, baseConfig);
  const values = arr(source?.outcomes)
    .map((outcome) => clean(outcome?.label || outcome?.value))
    .filter(Boolean);
  return normalizeInitiativeTextOrder({
    ...baseConfig,
    enabled: baseConfig.enabled ?? true,
    preset: 'source',
    sourceId: source?.id || baseConfig.sourceId || '',
    cardSourceId: '',
    separator: '',
    separators: [],
    parts: [{ label: source?.name || 'Résultat', values }],
  });
}

function separatorAt(config, index) {
  return config.separators[index] ?? config.separator ?? '';
}

function splitByKnownParts(value, config) {
  let rest = value;
  const labels = [];
  for (let index = 0; index < config.parts.length; index += 1) {
    if (index > 0) {
      const separator = separatorAt(config, index - 1);
      if (separator && rest.startsWith(separator)) rest = rest.slice(separator.length);
    }
    const candidates = [...config.parts[index].values].sort((left, right) => right.length - left.length);
    const match = candidates.find((candidate) => canonicalKey(rest.slice(0, candidate.length)) === canonicalKey(candidate));
    if (!match) {
      labels.push('');
      continue;
    }
    labels.push(match);
    rest = rest.slice(match.length);
  }
  return rest.length === 0 && labels.some(Boolean) ? labels : null;
}

function splitBySeparators(value, separators) {
  if (!separators.some(Boolean)) return null;
  const labels = [];
  let rest = value;
  for (let index = 0; index < separators.length; index += 1) {
    const separator = separators[index];
    if (!separator) return null;
    const position = rest.indexOf(separator);
    if (position < 0) return null;
    labels.push(clean(rest.slice(0, position)));
    rest = rest.slice(position + separator.length);
  }
  labels.push(clean(rest));
  return labels.filter(Boolean).length ? labels : null;
}

export function splitInitiativeLabel(label, config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  const value = clean(label);
  if (!value) return [];
  const knownParts = splitByKnownParts(value, normalized);
  if (knownParts) return knownParts;
  const bySeparators = splitBySeparators(value, normalized.separators);
  if (bySeparators) return bySeparators;
  if (normalized.separator && value.includes(normalized.separator)) return value.split(normalized.separator).map(clean).filter(Boolean);
  const match = value.match(/^(.+?)\s+d[eu\u2019']\s+(.+)$/i);
  return match ? [clean(match[1]), clean(match[2])] : [value];
}

export function composeInitiativeLabel(parts = [], config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  let result = '';
  let previousIndex = -1;
  arr(parts).map(clean).forEach((part, index) => {
    if (!part) return;
    if (result) result += separatorAt(normalized, Math.max(0, previousIndex));
    result += part;
    previousIndex = index;
  });
  return result;
}

function indexInPart(value, part, unknown) {
  const index = part.values.findIndex((candidate) => canonicalKey(candidate) === canonicalKey(value));
  if (index >= 0) return index;
  return unknown === 'first' ? -1 : part.values.length;
}

export function initiativeTextValue(label, config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  if (!initiativeTextOrderEnabled(normalized)) return null;
  const labels = splitInitiativeLabel(label, normalized);
  if (!labels.length) return null;
  let total = 0;
  let multiplier = 1;
  const ranks = normalized.parts.map((part, index) => Math.max(0, part.values.length - indexInPart(labels[index], part, normalized.unknown)));
  for (let index = ranks.length - 1; index >= 0; index -= 1) {
    total += ranks[index] * multiplier;
    multiplier *= Math.max(1, normalized.parts[index].values.length + 2);
  }
  return total;
}

export function initiativeToNumber(value, config = {}, fallback = 0) {
  const number = Number(value);
  if (Number.isFinite(number)) return number;
  const ranked = initiativeTextValue(value, config);
  return Number.isFinite(ranked) ? ranked : fallback;
}

export function initiativeValueForMode(value, config = {}, fallback = 0) {
  const raw = clean(value);
  if (initiativeTextOrderEnabled(config)) return raw || fallback;
  const number = Number(raw);
  return Number.isFinite(number) ? number : fallback;
}

export function initiativeInputIsValid(value, config = {}) {
  const raw = clean(value);
  if (!initiativeTextOrderEnabled(config)) return Number.isFinite(Number(raw));
  if (!raw) return false;
  const normalized = normalizeInitiativeTextOrder(config);
  const labels = splitInitiativeLabel(raw, normalized);
  return labels.some((label, index) => normalized.parts[index]?.values.some((option) => canonicalKey(option) === canonicalKey(label)))
    && labels.every((label, index) => !label || normalized.parts[index]?.values.some((option) => canonicalKey(option) === canonicalKey(label)));
}

export function initiativeMatchesMode(value, config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  const raw = clean(value);
  if (!initiativeTextOrderEnabled(normalized)) return raw !== '' && Number.isFinite(Number(raw));
  return !!raw && !Number.isFinite(Number(raw)) && initiativeInputIsValid(raw, normalized);
}

function comparable(config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  return {
    separators: normalized.separators,
    unknown: normalized.unknown,
    sourceId: normalized.sourceId,
    parts: normalized.parts.map((part) => ({ label: part.label, values: part.values })),
  };
}

function cardCandidates(card = {}) {
  const label = clean(card.label);
  const labelParts = label
    .split(/\s+d[eu\u2019']\s+|\s*[-/]\s*/i)
    .map(clean)
    .filter(Boolean);
  return uniq([
    card.rank,
    card.suit,
    card.color,
    label,
    ...labelParts,
    card.value,
    card.id,
    ...(card.markers || []),
    card.symbol,
  ]);
}

function cardValueForPart(card, part) {
  const candidates = cardCandidates(card);
  return part.values.find((value) => (
    candidates.some((candidate) => canonicalKey(candidate) === canonicalKey(value))
  )) || '';
}

export function initiativeLabelFromCard(card, config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  if (!initiativeTextOrderEnabled(normalized)) return clean(card?.label);
  const parts = normalized.parts.map((part) => cardValueForPart(card, part));
  const label = composeInitiativeLabel(parts, normalized);
  return label || clean(card?.label);
}

export function initiativeLabelFromCardDraw(drawResult, config = {}) {
  const card = arr(drawResult?.cards)[0];
  if (!card) return '';
  const label = initiativeLabelFromCard(card, config);
  return initiativeInputIsValid(label, config) ? label : '';
}

export function sameInitiativeTextOrder(left = {}, right = {}) {
  return JSON.stringify(comparable(left)) === JSON.stringify(comparable(right));
}

export function initiativeTextOrderPresetId(config = {}) {
  const normalized = normalizeInitiativeTextOrder(config);
  if (!initiativeTextOrderEnabled(normalized)) return '';
  if (normalized.preset === initiativeTextOrderPresetIds.CARDS && normalized.cardSourceId) return initiativeTextOrderPresetIds.CARDS;
  if (normalized.preset && presetIds().includes(normalized.preset) && sameInitiativeTextOrder(normalized, presetInitiativeTextOrder(normalized.preset))) return normalized.preset;
  return presetIds().find((id) => sameInitiativeTextOrder(normalized, presetInitiativeTextOrder(id))) || '';
}

export function initiativeTextOrderPresetLabel(config = {}) {
  const presetId = initiativeTextOrderPresetId(config);
  return presetId ? initiativeTextOrderPresets[presetId].label : 'Perso';
}
