import { exec, execOrThrow } from '../utils/exec.js';
import { getWorktreePath, getRepoRoot } from '../utils/paths.js';
import { createBranchName, extractIssueNumber } from '../utils/slug.js';

export interface Worktree {
  path: string;
  branch: string;
  commit: string;
  isMain: boolean;
  issueNumber: number | null;
  isLocked: boolean;
  lockReason: string | null;
  isPrunable: boolean;
}

/**
 * List all git worktrees
 */
export async function listWorktrees(): Promise<Worktree[]> {
  const repoRoot = await getRepoRoot();
  const stdout = await execOrThrow('git', ['worktree', 'list', '--porcelain'], { cwd: repoRoot });
  return parseWorktreeOutput(stdout);
}

/**
 * Parse the porcelain output from git worktree list
 */
function parseWorktreeOutput(output: string): Worktree[] {
  const worktrees: Worktree[] = [];
  const lines = output.trim().split('\n');

  let current: Partial<Worktree> & { locked?: boolean; lockReason?: string; prunable?: boolean } = {};

  for (const line of lines) {
    if (line.startsWith('worktree ')) {
      current.path = line.substring(9);
    } else if (line.startsWith('HEAD ')) {
      current.commit = line.substring(5);
    } else if (line.startsWith('branch ')) {
      // Format: refs/heads/branch-name
      current.branch = line.substring(7).replace('refs/heads/', '');
    } else if (line === 'detached') {
      current.branch = 'detached';
    } else if (line === 'locked') {
      current.locked = true;
    } else if (line.startsWith('locked ')) {
      current.locked = true;
      current.lockReason = line.substring(7);
    } else if (line === 'prunable') {
      current.prunable = true;
    } else if (line.startsWith('prunable ')) {
      current.prunable = true;
    } else if (line === '') {
      // End of worktree entry
      if (current.path && current.branch) {
        const isMain = current.branch === 'main' || current.branch === 'master';
        worktrees.push({
          path: current.path,
          branch: current.branch,
          commit: current.commit || '',
          isMain,
          issueNumber: isMain ? null : extractIssueNumber(current.branch),
          isLocked: current.locked || false,
          lockReason: current.lockReason || null,
          isPrunable: current.prunable || false,
        });
      }
      current = {};
    }
  }

  // Handle last entry if no trailing newline
  if (current.path && current.branch) {
    const isMain = current.branch === 'main' || current.branch === 'master';
    worktrees.push({
      path: current.path,
      branch: current.branch,
      commit: current.commit || '',
      isMain,
      issueNumber: isMain ? null : extractIssueNumber(current.branch),
      isLocked: current.locked || false,
      lockReason: current.lockReason || null,
      isPrunable: current.prunable || false,
    });
  }

  return worktrees;
}

/**
 * Create a new worktree for an issue
 */
export async function createWorktree(
  issueNumber: number,
  issueTitle: string,
  baseBranch: string = 'main'
): Promise<{ path: string; branch: string }> {
  const repoRoot = await getRepoRoot();
  const branchName = createBranchName(issueNumber, issueTitle);
  const worktreePath = await getWorktreePath(branchName);

  await execOrThrow('git', [
    'worktree',
    'add',
    '-b',
    branchName,
    worktreePath,
    baseBranch,
  ], { cwd: repoRoot });

  return { path: worktreePath, branch: branchName };
}

/**
 * Remove a worktree
 */
export async function removeWorktree(worktreePath: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  await execOrThrow('git', ['worktree', 'remove', worktreePath, '--force'], { cwd: repoRoot });
}

/**
 * Check if a branch has been merged to the base branch
 */
export async function isBranchMerged(
  branchName: string,
  baseBranch: string = 'main'
): Promise<boolean> {
  const repoRoot = await getRepoRoot();

  // First verify the branch exists to avoid false negatives
  const branchCheck = await exec('git', ['rev-parse', '--verify', branchName], { cwd: repoRoot });
  if (branchCheck.exitCode !== 0) {
    return false; // Branch doesn't exist, treat as not merged
  }

  const result = await exec('git', ['branch', '--merged', baseBranch], { cwd: repoRoot });
  if (result.exitCode !== 0) {
    return false;
  }
  const mergedBranches = result.stdout.split('\n').map((b) => b.trim().replace('* ', ''));
  return mergedBranches.includes(branchName);
}

/**
 * Delete a local branch
 */
export async function deleteBranch(branchName: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  await execOrThrow('git', ['branch', '-d', branchName], { cwd: repoRoot });
}

/**
 * Force delete a local branch
 */
export async function forceDeleteBranch(branchName: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  await execOrThrow('git', ['branch', '-D', branchName], { cwd: repoRoot });
}

/**
 * Get the current branch name
 */
export async function getCurrentBranch(): Promise<string> {
  const repoRoot = await getRepoRoot();
  const stdout = await execOrThrow('git', ['branch', '--show-current'], { cwd: repoRoot });
  return stdout.trim();
}

/**
 * Get the default branch (main or master)
 */
export async function getDefaultBranch(): Promise<string> {
  const repoRoot = await getRepoRoot();

  // Try to get from remote HEAD reference
  const result = await exec('git', ['symbolic-ref', 'refs/remotes/origin/HEAD'], { cwd: repoRoot });
  if (result.exitCode === 0) {
    return result.stdout.trim().replace('refs/remotes/origin/', '');
  }

  // Fallback: check which common default branch exists locally
  const mainCheck = await exec('git', ['rev-parse', '--verify', 'main'], { cwd: repoRoot });
  if (mainCheck.exitCode === 0) {
    return 'main';
  }

  const masterCheck = await exec('git', ['rev-parse', '--verify', 'master'], { cwd: repoRoot });
  if (masterCheck.exitCode === 0) {
    return 'master';
  }

  // Last resort fallback
  return 'main';
}

/**
 * Check if there are uncommitted changes in a worktree
 */
export async function hasUncommittedChanges(worktreePath: string): Promise<boolean> {
  const result = await exec('git', ['status', '--porcelain'], { cwd: worktreePath });
  return result.stdout.trim().length > 0;
}

/**
 * Prune stale worktree references
 */
export async function pruneWorktrees(): Promise<void> {
  const repoRoot = await getRepoRoot();
  await execOrThrow('git', ['worktree', 'prune'], { cwd: repoRoot });
}

/**
 * Clean up git error messages for better UX
 */
function cleanGitError(message: string): string {
  let cleaned = message.replace(/^fatal:\s*/i, '').trim();

  // Make common lock/unlock errors more user-friendly
  if (cleaned.includes('is already locked')) {
    return 'Worktree is already locked';
  }
  if (cleaned.includes('is not locked')) {
    return 'Worktree is not locked';
  }

  return cleaned;
}

/**
 * Lock a worktree to prevent pruning
 */
export async function lockWorktree(worktreePath: string, reason?: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  const args = ['worktree', 'lock', worktreePath];
  if (reason) {
    args.push('--reason', reason);
  }
  try {
    await execOrThrow('git', args, { cwd: repoRoot });
  } catch (err) {
    throw new Error(cleanGitError(err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Unlock a worktree
 */
export async function unlockWorktree(worktreePath: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  try {
    await execOrThrow('git', ['worktree', 'unlock', worktreePath], { cwd: repoRoot });
  } catch (err) {
    throw new Error(cleanGitError(err instanceof Error ? err.message : String(err)));
  }
}

/**
 * Move a worktree to a new location
 */
export async function moveWorktree(worktreePath: string, newPath: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  await execOrThrow('git', ['worktree', 'move', worktreePath, newPath], { cwd: repoRoot });
}

/**
 * Repair worktree administrative files
 * If path is provided, repairs that specific worktree. Otherwise repairs all.
 */
export async function repairWorktree(worktreePath?: string): Promise<void> {
  const repoRoot = await getRepoRoot();
  const args = ['worktree', 'repair'];
  if (worktreePath) {
    args.push(worktreePath);
  }
  await execOrThrow('git', args, { cwd: repoRoot });
}

/**
 * Create a custom worktree (not linked to an issue)
 */
export async function createCustomWorktree(
  branchName: string,
  baseBranch: string = 'main'
): Promise<{ path: string; branch: string }> {
  const repoRoot = await getRepoRoot();
  const worktreePath = await getWorktreePath(branchName);

  await execOrThrow('git', [
    'worktree',
    'add',
    '-b',
    branchName,
    worktreePath,
    baseBranch,
  ], { cwd: repoRoot });

  return { path: worktreePath, branch: branchName };
}
