import { describe, it, expect } from 'vitest';
import { parseWorktreeOutput, cleanGitError, Worktree } from './git.js';

describe('parseWorktreeOutput', () => {
  it('returns empty array for empty output', () => {
    expect(parseWorktreeOutput('')).toEqual([]);
    expect(parseWorktreeOutput('   ')).toEqual([]);
  });

  it('parses single worktree with minimal fields', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      path: '/path/to/repo',
      branch: 'main',
      commit: 'abc123',
      isMain: true,
      issueNumber: null,
      isLocked: false,
      lockReason: null,
      isPrunable: false,
    });
  });

  it('parses multiple worktrees', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

worktree /path/to/worktree1
HEAD def456
branch refs/heads/issue-42-feature

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(2);
    expect(result[0].branch).toBe('main');
    expect(result[1].branch).toBe('issue-42-feature');
    expect(result[1].issueNumber).toBe(42);
  });

  it('handles detached HEAD state', () => {
    const output = `worktree /path/to/repo
HEAD abc123
detached

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].branch).toBe('detached');
    expect(result[0].isMain).toBe(false);
  });

  it('parses locked worktree without reason', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main
locked

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isLocked).toBe(true);
    expect(result[0].lockReason).toBeNull();
  });

  it('parses locked worktree with reason', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main
locked Work in progress

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isLocked).toBe(true);
    expect(result[0].lockReason).toBe('Work in progress');
  });

  it('parses prunable worktree', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main
prunable

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isPrunable).toBe(true);
  });

  it('parses prunable worktree with reason', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main
prunable gitdir file points to non-existent location

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isPrunable).toBe(true);
  });

  it('identifies main branch as isMain', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isMain).toBe(true);
    expect(result[0].issueNumber).toBeNull();
  });

  it('identifies master branch as isMain', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/master

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isMain).toBe(true);
    expect(result[0].issueNumber).toBeNull();
  });

  it('extracts issue number from branch name', () => {
    const output = `worktree /path/to/worktree
HEAD abc123
branch refs/heads/issue-123-fix-bug

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isMain).toBe(false);
    expect(result[0].issueNumber).toBe(123);
  });

  it('returns null issueNumber for non-issue branches', () => {
    const output = `worktree /path/to/worktree
HEAD abc123
branch refs/heads/feature-branch

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].isMain).toBe(false);
    expect(result[0].issueNumber).toBeNull();
  });

  it('handles output without trailing newline', () => {
    const output = `worktree /path/to/repo
HEAD abc123
branch refs/heads/main`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(1);
    expect(result[0].branch).toBe('main');
  });

  it('defaults missing commit to empty string', () => {
    const output = `worktree /path/to/repo
branch refs/heads/main

`;
    const result = parseWorktreeOutput(output);
    expect(result[0].commit).toBe('');
  });

  it('skips incomplete entries missing path', () => {
    const output = `HEAD abc123
branch refs/heads/main

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(0);
  });

  it('skips incomplete entries missing branch', () => {
    const output = `worktree /path/to/repo
HEAD abc123

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(0);
  });

  it('handles complex real-world output', () => {
    const output = `worktree /Users/dev/project
HEAD a1b2c3d4e5f6
branch refs/heads/main

worktree /Users/dev/project-issue-42-add-feature
HEAD b2c3d4e5f6a1
branch refs/heads/issue-42-add-feature
locked In progress

worktree /Users/dev/project-issue-99-bugfix
HEAD c3d4e5f6a1b2
branch refs/heads/issue-99-bugfix
prunable

`;
    const result = parseWorktreeOutput(output);
    expect(result).toHaveLength(3);

    expect(result[0]).toMatchObject({
      path: '/Users/dev/project',
      branch: 'main',
      isMain: true,
      isLocked: false,
      isPrunable: false,
    });

    expect(result[1]).toMatchObject({
      path: '/Users/dev/project-issue-42-add-feature',
      branch: 'issue-42-add-feature',
      issueNumber: 42,
      isLocked: true,
      lockReason: 'In progress',
    });

    expect(result[2]).toMatchObject({
      path: '/Users/dev/project-issue-99-bugfix',
      branch: 'issue-99-bugfix',
      issueNumber: 99,
      isPrunable: true,
    });
  });
});

describe('cleanGitError', () => {
  it('removes fatal: prefix', () => {
    expect(cleanGitError('fatal: some error')).toBe('some error');
    expect(cleanGitError('fatal:no space')).toBe('no space');
  });

  it('trims whitespace', () => {
    expect(cleanGitError('fatal:   extra spaces  ')).toBe('extra spaces');
    expect(cleanGitError('  some error  ')).toBe('some error');
  });

  it('is case-insensitive for fatal prefix', () => {
    expect(cleanGitError('FATAL: ERROR')).toBe('ERROR');
    expect(cleanGitError('Fatal: Error')).toBe('Error');
  });

  it('returns user-friendly message for already locked', () => {
    expect(cleanGitError("fatal: '/path' is already locked")).toBe('Worktree is already locked');
    expect(cleanGitError('is already locked')).toBe('Worktree is already locked');
  });

  it('returns user-friendly message for not locked', () => {
    expect(cleanGitError("fatal: '/path' is not locked")).toBe('Worktree is not locked');
    expect(cleanGitError('is not locked')).toBe('Worktree is not locked');
  });

  it('returns cleaned message when no special case matches', () => {
    expect(cleanGitError('fatal: unknown error')).toBe('unknown error');
    expect(cleanGitError('some other error')).toBe('some other error');
  });

  it('handles empty string', () => {
    expect(cleanGitError('')).toBe('');
  });

  it('handles only fatal: prefix', () => {
    expect(cleanGitError('fatal:')).toBe('');
    expect(cleanGitError('fatal:  ')).toBe('');
  });
});
