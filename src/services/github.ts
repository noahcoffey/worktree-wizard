import { execOrThrow } from '../utils/exec.js';
import { getRepoRoot } from '../utils/paths.js';

export interface GitHubLabel {
  name: string;
  color: string;
}

export interface GitHubAssignee {
  login: string;
}

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: GitHubLabel[];
  assignees: GitHubAssignee[];
  state: string;
  url: string;
}

/**
 * Safely parse JSON with error handling
 */
function parseJSON<T>(json: string, context: string): T {
  try {
    return JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to parse ${context} response: ${message}`);
  }
}

/**
 * Fetch open issues from the GitHub repository
 */
export async function fetchOpenIssues(): Promise<GitHubIssue[]> {
  const repoRoot = await getRepoRoot();

  const stdout = await execOrThrow('gh', [
    'issue',
    'list',
    '--state',
    'open',
    '--json',
    'number,title,body,labels,assignees,state,url',
    '--limit',
    '50',
  ], { cwd: repoRoot });

  if (!stdout.trim()) {
    return [];
  }

  return parseJSON<GitHubIssue[]>(stdout, 'GitHub issues');
}

/**
 * Fetch a single issue by number
 */
export async function fetchIssue(issueNumber: number): Promise<GitHubIssue | null> {
  try {
    const repoRoot = await getRepoRoot();

    const stdout = await execOrThrow('gh', [
      'issue',
      'view',
      String(issueNumber),
      '--json',
      'number,title,body,labels,assignees,state,url',
    ], { cwd: repoRoot });
    return parseJSON<GitHubIssue>(stdout, `GitHub issue #${issueNumber}`);
  } catch {
    return null;
  }
}

/**
 * Assign an issue to the current user
 */
export async function assignIssueToSelf(issueNumber: number): Promise<void> {
  const repoRoot = await getRepoRoot();

  await execOrThrow('gh', [
    'issue',
    'edit',
    String(issueNumber),
    '--add-assignee',
    '@me',
  ], { cwd: repoRoot });
}

/**
 * Get the current GitHub username
 */
export async function getCurrentUser(): Promise<string> {
  const stdout = await execOrThrow('gh', ['api', 'user', '-q', '.login']);
  return stdout.trim();
}

/**
 * Get the repository name in owner/repo format
 */
export async function getRepoFullName(): Promise<string> {
  const repoRoot = await getRepoRoot();

  const stdout = await execOrThrow('gh', [
    'repo',
    'view',
    '--json',
    'nameWithOwner',
    '-q',
    '.nameWithOwner',
  ], { cwd: repoRoot });
  return stdout.trim();
}
