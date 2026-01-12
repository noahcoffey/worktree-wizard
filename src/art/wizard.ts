/**
 * ASCII Art assets for Worktree Wizard
 */

// Small wizard for header (5 lines)
export const WIZARD_SMALL = `
    /\\
   /  \\
  |    |  *
  | () |
   \\__/
`.trim();

// Wizard with staff
export const WIZARD_MEDIUM = `
      *
     /|\\
    / | \\
   /  |  \\
  |  ~~~  |
  | (o o) |
   \\ --- /
    \\   /
     | |
    /| |\\
`.trim();

// Wizard hat only (compact)
export const WIZARD_HAT = `
    *
   /\\
  /  \\
 /____\\
`.trim();

// Sparkle characters for animations
export const SPARKLES = ['✦', '✧', '★', '☆', '·', '°', '*'];

// Border characters
export const BORDERS = {
  topLeft: '╔',
  topRight: '╗',
  bottomLeft: '╚',
  bottomRight: '╝',
  horizontal: '═',
  vertical: '║',
  // Fancy alternatives
  scrollTopLeft: '┌',
  scrollTopRight: '┐',
  scrollBottomLeft: '└',
  scrollBottomRight: '┘',
  scrollHorizontal: '─',
  scrollVertical: '│',
};

// Header banner
export const HEADER_BANNER = `
╔══════════════════════════════════════╗
║     ✧ WORKTREE WIZARD ✧              ║
║        ~ Summon Your Code ~          ║
╚══════════════════════════════════════╝
`.trim();

// Compact header
export const HEADER_COMPACT = '✧ WORKTREE WIZARD ✧';

// Status indicators
export const INDICATORS = {
  active: '●',      // Has worktree
  inactive: '○',    // No worktree
  locked: '🔒',     // Sealed
  unlocked: '🔓',   // Unsealed
  creating: '✧',    // Summoning
  success: '✓',     // Success
  error: '✗',       // Error
  loading: '◐',     // Loading (can animate through ◐◓◑◒)
};

// Loading animation frames
export const LOADING_FRAMES = ['◐', '◓', '◑', '◒'];

// Spell casting frames (for progress)
export const SPELL_FRAMES = [
  '  ✧  ',
  ' ✧ ✧ ',
  '✧ ✧ ✧',
  ' ✧ ✧ ',
  '  ✧  ',
  '     ',
];

// Section dividers
export const DIVIDERS = {
  thin: '─'.repeat(40),
  thick: '═'.repeat(40),
  dots: '·'.repeat(40),
  sparkle: '✧ · ✧ · ✧ · ✧ · ✧ · ✧ · ✧ · ✧ · ✧ · ✧',
};

// Color palette (for reference, actual colors applied in components)
export const COLORS = {
  primary: 'magenta',
  secondary: 'cyan',
  accent: 'yellow',
  success: 'green',
  error: 'red',
  muted: 'gray',
};

// Terminology mapping
export const TERMS = {
  // Actions
  create: 'Summon',
  remove: 'Banish',
  lock: 'Seal',
  unlock: 'Unseal',
  move: 'Teleport',
  repair: 'Mend',
  prune: 'Purge',
  refresh: 'Scry',

  // Nouns
  worktree: 'Spirit',
  worktrees: 'Spirits',
  issue: 'Quest',
  issues: 'Quests',
  branch: 'Path',
  config: 'Arcane Configuration',

  // States
  loading: 'Channeling...',
  success: 'Enchantment Complete',
  error: 'Curse',
  active: 'Active',
  inactive: 'Dormant',
};

/**
 * Get a random sparkle character
 */
export function randomSparkle(): string {
  return SPARKLES[Math.floor(Math.random() * SPARKLES.length)];
}

/**
 * Get the next loading frame
 */
export function getLoadingFrame(index: number): string {
  return LOADING_FRAMES[index % LOADING_FRAMES.length];
}

/**
 * Wrap text in a simple box
 */
export function boxText(text: string, width: number = 40): string {
  const lines = text.split('\n');
  const maxLen = Math.max(...lines.map(l => l.length), width - 4);
  const innerWidth = maxLen + 2;

  const top = BORDERS.topLeft + BORDERS.horizontal.repeat(innerWidth) + BORDERS.topRight;
  const bottom = BORDERS.bottomLeft + BORDERS.horizontal.repeat(innerWidth) + BORDERS.bottomRight;

  const middle = lines.map(line => {
    const padding = ' '.repeat(maxLen - line.length);
    return `${BORDERS.vertical} ${line}${padding} ${BORDERS.vertical}`;
  }).join('\n');

  return `${top}\n${middle}\n${bottom}`;
}
