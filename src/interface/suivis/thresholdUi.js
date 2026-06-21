export const thresholdColorOptions = [
  ['neutral', 'trackers.global.thresholds.color.neutral'],
  ['green', 'trackers.global.thresholds.color.green'],
  ['amber', 'trackers.global.thresholds.color.amber'],
  ['red', 'trackers.global.thresholds.color.red'],
  ['blue', 'trackers.global.thresholds.color.blue'],
  ['violet', 'trackers.global.thresholds.color.violet'],
];

export const thresholdColorStyles = {
  neutral: { backgroundColor: '#e2e8f0', color: '#334155' },
  green: { backgroundColor: '#dcfce7', color: '#166534' },
  amber: { backgroundColor: '#fef3c7', color: '#92400e' },
  red: { backgroundColor: '#fee2e2', color: '#991b1b' },
  blue: { backgroundColor: '#dbeafe', color: '#1e40af' },
  violet: { backgroundColor: '#ede9fe', color: '#5b21b6' },
};

export const thresholdGlowColors = {
  neutral: '#94a3b8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

export const thresholdOperatorOptions = [
  ['gte', '>='],
  ['lte', '<='],
  ['gt', '>'],
  ['lt', '<'],
  ['eq', '='],
];

export const thresholdOperatorOptionsByMode = {
  timer: [
    ['lte', '<='],
    ['lt', '<'],
  ],
  stopwatch: [
    ['gte', '>='],
    ['gt', '>'],
  ],
};

export const trackerThresholdBasisOptions = [
  ['fixed', 'trackers.global.thresholds.basis.fixed'],
  ['percent', 'trackers.global.thresholds.basis.percent'],
  ['fromMax', 'sheet.thresholds.basis.fromMax'],
];

export const globalThresholdBasisOptionsByMode = {
  timer: [
    ['fixed', 'trackers.global.thresholds.basis.fixed'],
    ['percent', 'trackers.global.thresholds.basis.percent'],
  ],
};

export function thresholdGlowStyle(thresholds = []) {
  if (!thresholds.length) return {};
  return {
    '--threshold-a': thresholdGlowColors[thresholds[0]?.color] || thresholdGlowColors.neutral,
    '--threshold-b': thresholdGlowColors[thresholds[1]?.color] || thresholdGlowColors[thresholds[0]?.color] || thresholdGlowColors.neutral,
  };
}

export function thresholdOperatorsForMode(mode, scope = 'current') {
  if (scope === 'loops') return thresholdOperatorOptionsByMode.stopwatch;
  return thresholdOperatorOptionsByMode[mode] || thresholdOperatorOptions;
}

export function validThresholdOperator(mode, scope, operator) {
  const operators = thresholdOperatorsForMode(mode, scope);
  return operators.some(([value]) => value === operator) ? operator : operators[0][0];
}

