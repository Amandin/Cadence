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

export const participantSymbols = ['●●', '⚔', '🛡', '⚙', '⏳', '🗡', '🧪', '🔥'];

export const defaultParticipantSymbol = uiGlyphs.avatarFallback;
export const defaultMechanicalSymbol = '⚙';
export const defaultReserveSymbol = '🛡';
