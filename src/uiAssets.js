export const cadenceLogos = {
  light: '/branding/logo-cadence-light.svg',
  dark: '/branding/logo-cadence-dark.svg',
};

export function getCadenceLogo(dark = false) {
  return dark ? cadenceLogos.dark : cadenceLogos.light;
}

export const uiGlyphs = {
  avatarFallback: '●',
  close: '×',
  duplicate: '⧉',
  dice: '\u2684',
  edit: '✎',
  infinity: '∞',
  loop: '↻',
  menu: '☰',
  middleDot: '·',
  next: '➜',
  pause: '⏸',
  previousTurn: '↶',
  returnPreparation: '↤',
  save: '💾',
  stealth: '🥷',
  themeDark: '☾',
  themeLight: '☀',
  timer: '⏳',
};

export const uiSymbols = {
  remove: 'x',
  add: '+',
  subtract: '-',
  moveUp: '↑',
  moveDown: '↓',
  randomBack: '↩',
  history: '↺',
  draw: '✦',
  randomSource: '◈',
  resultOptions: '◌',
  weightedTable: '◍',
  cards: '♢',
  statistics: '◔',
  die1: '⚀',
  die2: '⚁',
  die3: '⚂',
  die4: '⚃',
  die5: '⚄',
  die6: '⚅',
  cardBack: '🂠',
  roll: '🎲🎲',
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  joker: '🃏',
  alert: '!',
  csvImport: '☰',
  tarotTrump: '★',
  confirm: '✓',
};

export const participantSymbols = ['●●', '⚔', '🛡', '⚙', '⏳', '🗡', '🧪', '🔥'];

export const defaultParticipantSymbol = uiGlyphs.avatarFallback;
export const defaultMechanicalSymbol = '⚙';
export const defaultReserveSymbol = '🛡';
