/**
 * Main blessed application - Split panel layout
 */
import blessed from 'blessed';
import { WizardConfig } from '../config/types.js';
import { createScreen, render } from './screen.js';
import { createHeader, createDivider, createStatsPanel } from './components/header.js';
import { createSplitList, ListItem, createLoadingBox } from './components/split-list.js';
import { createFooter } from './components/footer.js';
import {
  createDetailPopup,
  DetailAction,
  showConfirmDialog,
  showTextInputDialog,
  showProgressDialog,
  showMessageDialog,
} from './components/detail.js';
import { listWorktrees, createWorktree, createCustomWorktree, removeWorktree, lockWorktree, unlockWorktree, hasUncommittedChanges, isBranchMerged, deleteBranch } from '../services/git.js';
import { fetchOpenIssues, assignIssueToSelf, GitHubIssue } from '../services/github.js';
import { Worktree } from '../services/git.js';
import { setupWorktree } from '../services/setup.js';
import { getTerminalAdapter, buildFrames, getTabTitle, getCustomTabTitle, buildIssuePrompt } from '../services/terminal/index.js';

export async function runApp(config: WizardConfig): Promise<void> {
  const { screen } = createScreen(config);

  // Layout positions - accommodate larger header and stats
  const HEADER_HEIGHT = 5;
  const DIVIDER1_TOP = HEADER_HEIGHT;
  const STATS_TOP = DIVIDER1_TOP + 1;
  const STATS_HEIGHT = 4;
  const DIVIDER2_TOP = STATS_TOP + STATS_HEIGHT;
  const LIST_TOP = DIVIDER2_TOP + 1;

  // Create UI components
  createHeader({ parent: screen });
  createDivider(screen, DIVIDER1_TOP);
  const statsPanel = createStatsPanel({ parent: screen, top: STATS_TOP });
  createDivider(screen, DIVIDER2_TOP);
  const footer = createFooter({ parent: screen });

  // Create loading indicator
  const loadingBox = createLoadingBox(screen, LIST_TOP);

  // Data state
  let issues: GitHubIssue[] = [];
  let worktrees: Worktree[] = [];

  // Create split list
  const splitList = createSplitList({
    parent: screen,
    top: LIST_TOP,
    onSelect: (item) => {
      detailPopup.show(item);
    },
  });

  // Hide lists initially
  splitList.issueList.hide();
  splitList.worktreeList.hide();

  // Create detail popup
  const detailPopup = createDetailPopup({
    parent: screen,
    config,
    onAction: handleAction,
    onClose: () => {
      splitList.focusIssues();
      render(screen);
    },
  });

  // Action handler
  async function handleAction(action: DetailAction, item: ListItem) {
    detailPopup.hide();

    switch (action) {
      case 'summon':
        if (item.type === 'create-custom') {
          showTextInputDialog({
            parent: screen,
            title: 'New Worktree',
            label: 'Branch name:',
            onSubmit: async (branchName) => {
              if (branchName.trim()) {
                await doSummon(item, false, branchName.trim());
              } else {
                splitList.focusWorktrees();
                render(screen);
              }
            },
            onCancel: () => {
              splitList.focusWorktrees();
              render(screen);
            },
          });
        } else {
          await doSummon(item, false);
        }
        break;

      case 'summon-with-context':
        await doSummon(item, true);
        break;

      case 'banish':
        showConfirmDialog({
          parent: screen,
          title: 'Remove Worktree',
          message: 'Are you sure you want to remove this worktree?',
          onConfirm: async () => {
            await doBanish(item);
          },
          onCancel: () => {
            splitList.focusWorktrees();
            render(screen);
          },
        });
        break;

      case 'lock':
        await doLock(item);
        break;

      case 'unlock':
        await doUnlock(item);
        break;
    }
  }

  // Summon worktree
  async function doSummon(item: ListItem, passContext: boolean, customBranchName?: string) {
    const progress = showProgressDialog({
      parent: screen,
      title: 'Creating Worktree',
    });

    try {
      progress.update('Initializing...');

      let worktreePath: string;
      let branchName: string;
      let tabTitle: string;
      let frame2Command: string | undefined;

      if (item.type === 'create-custom' && customBranchName) {
        progress.update('Creating worktree...');
        const result = await createCustomWorktree(customBranchName);
        worktreePath = result.path;
        branchName = result.branch;
        tabTitle = getCustomTabTitle(branchName);
      } else if (item.type === 'issue' && item.issue) {
        progress.update(`Creating worktree for #${item.issue.number}...`);
        const result = await createWorktree(item.issue.number, item.issue.title);
        worktreePath = result.path;
        branchName = result.branch;
        tabTitle = getTabTitle(item.issue.number, item.issue.title);

        if (passContext) {
          frame2Command = buildIssuePrompt(config.defaultAICommand, item.issue.number, item.issue.title);
        }

        try {
          progress.update('Assigning issue...');
          await assignIssueToSelf(item.issue.number);
        } catch {
          // Ignore assignment errors
        }
      } else {
        throw new Error('Invalid item');
      }

      // Run setup commands
      if (config.setupCommands && config.setupCommands.length > 0) {
        await setupWorktree(worktreePath, config.setupCommands, (p) => {
          progress.update(p.step, p.current, p.total);
        });
      }

      // Open terminal
      progress.update('Opening terminal...');
      const adapter = getTerminalAdapter(config);
      const frames = buildFrames(worktreePath, config, frame2Command);

      if (frames.length > 0) {
        await adapter.openWindow({ frames, windowTitle: tabTitle });
      }

      progress.close();

      showMessageDialog({
        parent: screen,
        title: 'Success',
        message: `Created at ${worktreePath}`,
        type: 'success',
        onClose: async () => {
          await refreshData();
          splitList.focusWorktrees();
          render(screen);
        },
      });
    } catch (err) {
      progress.close();
      showMessageDialog({
        parent: screen,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to create worktree',
        type: 'error',
        onClose: () => {
          splitList.focusIssues();
          render(screen);
        },
      });
    }
  }

  // Banish worktree
  async function doBanish(item: ListItem) {
    const progress = showProgressDialog({
      parent: screen,
      title: 'Removing Worktree',
    });

    try {
      const worktree = item.worktree;
      if (!worktree) throw new Error('No worktree to remove');

      progress.update('Checking for changes...');
      const hasChanges = await hasUncommittedChanges(worktree.path);
      if (hasChanges) {
        progress.update('Warning: uncommitted changes');
      }

      progress.update('Closing terminal...');
      const adapter = getTerminalAdapter(config);
      if (item.type === 'issue' && item.issue) {
        await adapter.closeByTitle(getTabTitle(item.issue.number, item.issue.title));
      } else {
        await adapter.closeByTitle(getCustomTabTitle(worktree.branch));
      }

      progress.update('Removing worktree...');
      await removeWorktree(worktree.path);

      progress.update('Checking merge status...');
      const merged = await isBranchMerged(worktree.branch);
      let message = 'Worktree removed';

      if (merged) {
        try {
          await deleteBranch(worktree.branch);
          message += ', branch deleted';
        } catch {
          message += ', branch kept';
        }
      } else {
        message += ', branch kept (unmerged)';
      }

      progress.close();

      showMessageDialog({
        parent: screen,
        title: 'Complete',
        message,
        type: 'success',
        onClose: async () => {
          await refreshData();
          splitList.focusWorktrees();
          render(screen);
        },
      });
    } catch (err) {
      progress.close();
      showMessageDialog({
        parent: screen,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to remove worktree',
        type: 'error',
        onClose: () => {
          splitList.focusWorktrees();
          render(screen);
        },
      });
    }
  }

  // Lock worktree
  async function doLock(item: ListItem) {
    if (!item.worktree) return;

    try {
      await lockWorktree(item.worktree.path);
      showMessageDialog({
        parent: screen,
        title: 'Locked',
        message: 'Worktree has been locked',
        type: 'success',
        onClose: async () => {
          await refreshData();
          splitList.focusWorktrees();
          render(screen);
        },
      });
    } catch (err) {
      showMessageDialog({
        parent: screen,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to lock',
        type: 'error',
        onClose: () => {
          splitList.focusWorktrees();
          render(screen);
        },
      });
    }
  }

  // Unlock worktree
  async function doUnlock(item: ListItem) {
    if (!item.worktree) return;

    try {
      await unlockWorktree(item.worktree.path);
      showMessageDialog({
        parent: screen,
        title: 'Unlocked',
        message: 'Worktree has been unlocked',
        type: 'success',
        onClose: async () => {
          await refreshData();
          splitList.focusWorktrees();
          render(screen);
        },
      });
    } catch (err) {
      showMessageDialog({
        parent: screen,
        title: 'Error',
        message: err instanceof Error ? err.message : 'Failed to unlock',
        type: 'error',
        onClose: () => {
          splitList.focusWorktrees();
          render(screen);
        },
      });
    }
  }

  // Refresh data
  async function refreshData() {
    footer.setError(null);

    // Fetch worktrees (local git operation - should always work)
    try {
      worktrees = await listWorktrees();
    } catch (err) {
      footer.setError(err instanceof Error ? err.message : 'Failed to list worktrees');
      return;
    }

    // Fetch issues if enabled (may fail due to network)
    if (config.githubIssuesEnabled) {
      try {
        issues = await fetchOpenIssues();
      } catch (err) {
        // Show warning but continue - worktrees still work
        footer.setError('GitHub: ' + (err instanceof Error ? err.message : 'Failed to fetch issues'));
        // Keep existing issues or empty if first load
      }
    } else {
      issues = [];
    }

    // Count active worktrees (non-main)
    const activeWorktrees = worktrees.filter(wt => !wt.isMain).length;

    // Update stats panel
    statsPanel.update(issues.length, activeWorktrees);

    // Update lists (always update, even if issues fetch failed)
    splitList.setIssues(issues, worktrees);
    splitList.setWorktrees(worktrees);

    footer.setLastSync(new Date());
  }

  // Initial load
  render(screen);

  await refreshData();

  // Hide loading, show lists
  loadingBox.hide();
  splitList.issueList.show();
  splitList.worktreeList.show();
  splitList.focusIssues();

  // Refresh key binding
  screen.key(['r'], async () => {
    footer.setStatus('Syncing...');
    render(screen);
    await refreshData();
    render(screen);
  });

  render(screen);
}
