/**
 * Split panel list - Issues on left, Worktrees on right
 */
import blessed from 'blessed';
import { Worktree } from '../../services/git.js';
import { GitHubIssue } from '../../services/github.js';
import { COLORS } from '../colors.js';

export interface ListItem {
  id: string;
  type: 'create-custom' | 'custom-worktree' | 'issue';
  label: string;
  issue?: GitHubIssue;
  worktree?: Worktree;
  hasWorktree: boolean;
}

export interface SplitListOptions {
  parent: blessed.Widgets.Node;
  top: number;
  onSelect: (item: ListItem) => void;
}

export interface SplitListResult {
  issueList: blessed.Widgets.ListElement;
  worktreeList: blessed.Widgets.ListElement;
  setIssues: (issues: GitHubIssue[], worktrees: Worktree[]) => void;
  setWorktrees: (worktrees: Worktree[]) => void;
  focusIssues: () => void;
  focusWorktrees: () => void;
}

export function createSplitList(options: SplitListOptions): SplitListResult {
  const { parent, top, onSelect } = options;

  let issueItems: ListItem[] = [];
  let worktreeItems: ListItem[] = [];
  let activePanel: 'issues' | 'worktrees' = 'issues';
  let selectionCooldown = false;

  // Container for both panels
  const container = blessed.box({
    parent,
    top,
    left: 0,
    width: '100%',
    height: '100%-' + (top + 3),
    tags: true,
  });

  // Left panel - Issues
  const issueList = blessed.list({
    parent: container,
    top: 0,
    left: 1,
    width: '50%-2',
    height: '100%',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: '│',
      track: {
        bg: 'black',
      },
      style: {
        bg: COLORS.border,
      },
    },
    style: {
      selected: {
        bg: COLORS.selected,
        fg: 'white',
        bold: true,
      },
      item: {
        fg: COLORS.text,
      },
      border: {
        fg: COLORS.border,
      },
    },
    border: {
      type: 'line',
      fg: COLORS.border as any,
    },
    label: ` {${COLORS.label}-fg}Issues{/} `,
    scrollable: true,
    alwaysScroll: true,
  });

  // Right panel - Worktrees
  const worktreeList = blessed.list({
    parent: container,
    top: 0,
    left: '50%',
    width: '50%-1',
    height: '100%',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: '│',
      track: {
        bg: 'black',
      },
      style: {
        bg: COLORS.border,
      },
    },
    style: {
      selected: {
        bg: COLORS.selected,
        fg: 'white',
        bold: true,
      },
      item: {
        fg: COLORS.text,
      },
      border: {
        fg: COLORS.border,
      },
    },
    border: {
      type: 'line',
      fg: COLORS.border as any,
    },
    label: ` {${COLORS.label}-fg}Worktrees{/} `,
    scrollable: true,
    alwaysScroll: true,
  });

  // Handle issue selection (with cooldown to prevent accidental triggers)
  issueList.on('select', (_item, index) => {
    if (selectionCooldown) return;
    if (issueItems[index]) {
      onSelect(issueItems[index]);
    }
  });

  // Handle worktree selection (with cooldown to prevent accidental triggers)
  worktreeList.on('select', (_item, index) => {
    if (selectionCooldown) return;
    if (worktreeItems[index]) {
      onSelect(worktreeItems[index]);
    }
  });

  // Tab/arrow key navigation between panels
  issueList.key(['tab', 'right', 'l'], () => {
    activePanel = 'worktrees';
    worktreeList.focus();
    updateBorders();
    (parent as blessed.Widgets.Screen).render();
  });

  worktreeList.key(['tab', 'left', 'h'], () => {
    activePanel = 'issues';
    issueList.focus();
    updateBorders();
    (parent as blessed.Widgets.Screen).render();
  });

  function updateBorders() {
    if (activePanel === 'issues') {
      issueList.style.border = { fg: COLORS.selected };
      worktreeList.style.border = { fg: COLORS.border };
      issueList.setLabel(` {${COLORS.selected}-fg}▸ Issues{/} `);
      worktreeList.setLabel(` {${COLORS.muted}-fg}Worktrees{/} `);
    } else {
      issueList.style.border = { fg: COLORS.border };
      worktreeList.style.border = { fg: COLORS.selected };
      issueList.setLabel(` {${COLORS.muted}-fg}Issues{/} `);
      worktreeList.setLabel(` {${COLORS.selected}-fg}▸ Worktrees{/} `);
    }
  }

  function setIssues(issues: GitHubIssue[], worktrees: Worktree[]) {
    issueItems = issues.map(issue => {
      const linkedWorktree = worktrees.find(wt => wt.issueNumber === issue.number);
      const hasWt = !!linkedWorktree;

      // Status indicator
      const indicator = hasWt ? `{${COLORS.active}-fg}●{/}` : `{${COLORS.inactive}-fg}○{/}`;

      // Truncate title
      const maxLen = 35;
      const title = issue.title.length > maxLen
        ? issue.title.substring(0, maxLen - 2) + '..'
        : issue.title;

      // Labels
      const labelStr = issue.labels.length > 0
        ? ` {${COLORS.muted}-fg}[${issue.labels[0].name}]{/}`
        : '';

      return {
        id: `issue-${issue.number}`,
        type: 'issue' as const,
        label: `  ${indicator} {${COLORS.label}-fg}#${issue.number}{/} ${title}${labelStr}`,
        issue,
        worktree: linkedWorktree,
        hasWorktree: hasWt,
      };
    });

    issueList.setItems(issueItems.map(i => i.label));
    if (issueItems.length > 0) {
      issueList.select(0);
    }
  }

  function setWorktrees(worktrees: Worktree[]) {
    // Filter to non-main worktrees
    const activeWorktrees = worktrees.filter(wt => !wt.isMain);

    // Build items - "New Worktree" first, then active worktrees (with padding)
    worktreeItems = [
      {
        id: 'create-custom',
        type: 'create-custom' as const,
        label: `  {${COLORS.selected}-fg}+{/} {bold}New Worktree{/}`,
        hasWorktree: false,
      },
      ...activeWorktrees.map(wt => {
        const lockIcon = wt.isLocked ? ` {${COLORS.locked}-fg}◆{/}` : '';
        const issueTag = wt.issueNumber
          ? ` {${COLORS.muted}-fg}#${wt.issueNumber}{/}`
          : '';

        return {
          id: `wt-${wt.branch}`,
          type: 'custom-worktree' as const,
          label: `  {${COLORS.active}-fg}●{/} ${wt.branch}${issueTag}${lockIcon}`,
          worktree: wt,
          hasWorktree: true,
        };
      }),
    ];

    worktreeList.setItems(worktreeItems.map(i => i.label));
    if (worktreeItems.length > 0) {
      worktreeList.select(0);
    }
  }

  function focusIssues() {
    activePanel = 'issues';
    // Set cooldown to prevent accidental selection from lingering key events
    selectionCooldown = true;
    setTimeout(() => { selectionCooldown = false; }, 100);
    issueList.focus();
    updateBorders();
  }

  function focusWorktrees() {
    activePanel = 'worktrees';
    // Set cooldown to prevent accidental selection from lingering key events
    selectionCooldown = true;
    setTimeout(() => { selectionCooldown = false; }, 100);
    worktreeList.focus();
    updateBorders();
  }

  // Initialize borders
  updateBorders();

  return {
    issueList,
    worktreeList,
    setIssues,
    setWorktrees,
    focusIssues,
    focusWorktrees,
  };
}

// Loading indicator
export function createLoadingBox(parent: blessed.Widgets.Node, top: number): blessed.Widgets.BoxElement {
  return blessed.box({
    parent,
    top: top + 3,
    left: 'center',
    width: 30,
    height: 3,
    content: `{center}{${COLORS.muted}-fg}Loading...{/}{/center}`,
    tags: true,
    border: {
      type: 'line',
      fg: COLORS.border as any,
    },
  });
}
