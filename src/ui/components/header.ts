/**
 * Header component - Large ASCII title with big stats
 */
import blessed from 'blessed';
import { COLORS } from '../colors.js';

// Figlet "small" style title - 4 lines
const TITLE_ART = [
  `{${COLORS.title}-fg}╦ ╦┌─┐┬─┐┬┌─┌┬┐┬─┐┌─┐┌─┐{/}  {${COLORS.titleAccent}-fg}╦ ╦┬┌─┐┌─┐┬─┐┌┬┐{/}`,
  `{${COLORS.title}-fg}║║║│ │├┬┘├┴┐ │ ├┬┘├┤ ├┤ {/}  {${COLORS.titleAccent}-fg}║║║│┌─┘├─┤├┬┘ ││{/}`,
  `{${COLORS.title}-fg}╚╩╝└─┘┴└─┴ ┴ ┴ ┴└─└─┘└─┘{/}  {${COLORS.titleAccent}-fg}╚╩╝┴└─┘┴ ┴┴└──┴┘{/}`,
];

// Big block digits for stats (3 lines tall)
const BIG_DIGITS: Record<string, string[]> = {
  '0': ['█▀█', '█ █', '▀▀▀'],
  '1': [' ▀█', '  █', '  ▀'],
  '2': ['▀▀█', '█▀▀', '▀▀▀'],
  '3': ['▀▀█', ' ▀█', '▀▀▀'],
  '4': ['█ █', '▀▀█', '  ▀'],
  '5': ['█▀▀', '▀▀█', '▀▀▀'],
  '6': ['█▀▀', '█▀█', '▀▀▀'],
  '7': ['▀▀█', '  █', '  ▀'],
  '8': ['█▀█', '█▀█', '▀▀▀'],
  '9': ['█▀█', '▀▀█', '▀▀▀'],
};

function renderBigNumber(num: number, color: string): string[] {
  const digits = String(num).padStart(3, ' ').split('');
  const lines = ['', '', ''];

  for (const d of digits) {
    if (d === ' ') {
      lines[0] += '   ';
      lines[1] += '   ';
      lines[2] += '   ';
    } else {
      const glyph = BIG_DIGITS[d] || ['   ', '   ', '   '];
      lines[0] += glyph[0] + ' ';
      lines[1] += glyph[1] + ' ';
      lines[2] += glyph[2] + ' ';
    }
  }

  return lines.map(line => `{${color}-fg}${line}{/}`);
}

export interface HeaderOptions {
  parent: blessed.Widgets.Node;
}

export function createHeader(options: HeaderOptions): blessed.Widgets.BoxElement {
  const { parent } = options;

  const header = blessed.box({
    parent,
    top: 0,
    left: 0,
    width: '100%',
    height: 5,
    tags: true,
  });

  // ASCII art title
  for (let i = 0; i < TITLE_ART.length; i++) {
    blessed.box({
      parent: header,
      top: i,
      left: 2,
      width: 60,
      height: 1,
      content: TITLE_ART[i],
      tags: true,
    });
  }

  // Tagline
  blessed.box({
    parent: header,
    top: 3,
    left: 3,
    width: 30,
    height: 1,
    content: `{${COLORS.tagline}-fg}Git worktree manager{/}`,
    tags: true,
  });

  return header;
}

// Subtle divider
export function createDivider(parent: blessed.Widgets.Node, top: number): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    top,
    left: 0,
    width: '100%',
    height: 1,
    content: `{${COLORS.divider}-fg}${'─'.repeat(120)}{/}`,
    tags: true,
  });
}

// Stats panel with big numbers
export interface StatsOptions {
  parent: blessed.Widgets.Node;
  top: number;
}

export interface StatsPanel {
  element: blessed.Widgets.BoxElement;
  update: (issueCount: number, worktreeCount: number) => void;
}

export function createStatsPanel(options: StatsOptions): StatsPanel {
  const { parent, top } = options;

  const panel = blessed.box({
    parent,
    top,
    left: 2,
    width: '100%',
    height: 4,
    tags: true,
  });

  // Issue count section
  const issueLabel = blessed.box({
    parent: panel,
    top: 0,
    left: 0,
    width: 12,
    height: 1,
    content: '{#6a9fb5-fg}ISSUES{/}',
    tags: true,
  });

  const issueNum = blessed.box({
    parent: panel,
    top: 1,
    left: 0,
    width: 16,
    height: 3,
    content: '',
    tags: true,
  });

  // Separator
  blessed.box({
    parent: panel,
    top: 0,
    left: 18,
    width: 1,
    height: 4,
    content: `{${COLORS.divider}-fg}│\n│\n│\n│{/}`,
    tags: true,
  });

  // Worktree count section
  const worktreeLabel = blessed.box({
    parent: panel,
    top: 0,
    left: 22,
    width: 12,
    height: 1,
    content: '{#90a959-fg}ACTIVE{/}',
    tags: true,
  });

  const worktreeNum = blessed.box({
    parent: panel,
    top: 1,
    left: 22,
    width: 16,
    height: 3,
    content: '',
    tags: true,
  });

  const update = (issueCount: number, worktreeCount: number) => {
    const issueLines = renderBigNumber(issueCount, '#6a9fb5');
    const worktreeLines = renderBigNumber(worktreeCount, '#90a959');

    issueNum.setContent(issueLines.join('\n'));
    worktreeNum.setContent(worktreeLines.join('\n'));
  };

  update(0, 0);

  return { element: panel, update };
}
