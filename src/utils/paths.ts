import path from 'path';
import { execOrThrow } from './exec.js';

let cachedRepoRoot: string | null = null;

/**
 * Get the root directory of the main git repository
 * Auto-detects from current directory using git rev-parse
 */
export async function getRepoRoot(): Promise<string> {
  if (cachedRepoRoot) {
    return cachedRepoRoot;
  }
  const root = await execOrThrow('git', ['rev-parse', '--show-toplevel']);
  cachedRepoRoot = root.trim();
  return cachedRepoRoot;
}

/**
 * Get the repository name from the root path
 */
export async function getRepoName(): Promise<string> {
  const root = await getRepoRoot();
  return path.basename(root);
}

/**
 * Get the parent directory of the repository (where worktrees will be created)
 */
export async function getWorktreeParentDir(): Promise<string> {
  const root = await getRepoRoot();
  return path.dirname(root);
}

/**
 * Generate the worktree path for a given branch name
 */
export async function getWorktreePath(branchName: string): Promise<string> {
  const parentDir = await getWorktreeParentDir();
  const repoName = await getRepoName();
  return path.join(parentDir, `${repoName}-${branchName}`);
}

/**
 * Check if we're inside a git repository
 */
export async function isInsideGitRepo(): Promise<boolean> {
  try {
    await execOrThrow('git', ['rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a path is a valid git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    await execOrThrow('git', ['-C', repoPath, 'rev-parse', '--git-dir']);
    return true;
  } catch {
    return false;
  }
}
