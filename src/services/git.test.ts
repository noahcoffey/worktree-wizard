import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseWorktreeOutput,
  cleanGitError,
  listWorktrees,
  createWorktree,
  removeWorktree,
  isBranchMerged,
  deleteBranch,
  forceDeleteBranch,
  getCurrentBranch,
  getDefaultBranch,
  hasUncommittedChanges,
  pruneWorktrees,
  lockWorktree,
  unlockWorktree,
  moveWorktree,
  repairWorktree,
  createCustomWorktree,
} from './git.js';
import { exec, execOrThrow } from '../utils/exec.js';
import { getRepoRoot, getWorktreePath } from '../utils/paths.js';

// Mock dependencies
vi.mock('../utils/exec.js', () => ({
  exec: vi.fn(),
  execOrThrow: vi.fn(),
}));

vi.mock('../utils/paths.js', () => ({
  getRepoRoot: vi.fn(),
  getWorktreePath: vi.fn(),
}));

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

describe('listWorktrees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('returns parsed worktrees from git output', async () => {
    vi.mocked(execOrThrow).mockResolvedValue(`worktree /repo
HEAD abc123
branch refs/heads/main

`);

    const result = await listWorktrees();

    expect(result).toHaveLength(1);
    expect(result[0].branch).toBe('main');
    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'list', '--porcelain'], { cwd: '/repo' });
  });
});

describe('createWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
    vi.mocked(getWorktreePath).mockResolvedValue('/repo-issue-42-feature');
  });

  it('creates worktree with correct branch name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    const result = await createWorktree(42, 'Add feature');

    expect(result.path).toBe('/repo-issue-42-feature');
    expect(result.branch).toBe('issue-42-add-feature');
    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '-b', 'issue-42-add-feature', '/repo-issue-42-feature', 'main'],
      { cwd: '/repo' }
    );
  });

  it('uses custom base branch', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await createWorktree(1, 'Test', 'develop');

    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      expect.arrayContaining(['develop']),
      expect.any(Object)
    );
  });
});

describe('removeWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('removes worktree with force flag', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await removeWorktree('/path/to/worktree');

    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      ['worktree', 'remove', '/path/to/worktree', '--force'],
      { cwd: '/repo' }
    );
  });
});

describe('isBranchMerged', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('returns true when branch is merged', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: 'abc123', stderr: '', exitCode: 0 }) // branch exists
      .mockResolvedValueOnce({ stdout: '  main\n  feature-branch\n', stderr: '', exitCode: 0 }); // merged branches

    const result = await isBranchMerged('feature-branch');

    expect(result).toBe(true);
  });

  it('returns false when branch is not merged', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: 'abc123', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '  main\n', stderr: '', exitCode: 0 });

    const result = await isBranchMerged('unmerged-branch');

    expect(result).toBe(false);
  });

  it('returns false when branch does not exist', async () => {
    vi.mocked(exec).mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 1 });

    const result = await isBranchMerged('nonexistent');

    expect(result).toBe(false);
  });

  it('returns false when git branch --merged fails', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: 'abc123', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '', stderr: 'error', exitCode: 1 });

    const result = await isBranchMerged('feature');

    expect(result).toBe(false);
  });
});

describe('deleteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('deletes branch with -d flag', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await deleteBranch('feature-branch');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['branch', '-d', 'feature-branch'], { cwd: '/repo' });
  });
});

describe('forceDeleteBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('deletes branch with -D flag', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await forceDeleteBranch('feature-branch');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['branch', '-D', 'feature-branch'], { cwd: '/repo' });
  });
});

describe('getCurrentBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('returns trimmed branch name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('main\n');

    const result = await getCurrentBranch();

    expect(result).toBe('main');
    expect(execOrThrow).toHaveBeenCalledWith('git', ['branch', '--show-current'], { cwd: '/repo' });
  });
});

describe('getDefaultBranch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('returns branch from remote HEAD', async () => {
    vi.mocked(exec).mockResolvedValueOnce({
      stdout: 'refs/remotes/origin/main',
      stderr: '',
      exitCode: 0,
    });

    const result = await getDefaultBranch();

    expect(result).toBe('main');
  });

  it('falls back to main when remote HEAD fails', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 1 }) // remote HEAD fails
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // main exists

    const result = await getDefaultBranch();

    expect(result).toBe('main');
  });

  it('falls back to master when main does not exist', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 1 }) // remote HEAD fails
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 1 }) // main doesn't exist
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 }); // master exists

    const result = await getDefaultBranch();

    expect(result).toBe('master');
  });

  it('returns main as last resort with warning', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 1 });

    const result = await getDefaultBranch();

    expect(result).toBe('main');
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Could not detect default branch'));
    consoleSpy.mockRestore();
  });
});

describe('hasUncommittedChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when there are changes', async () => {
    vi.mocked(exec).mockResolvedValue({
      stdout: ' M file.txt\n',
      stderr: '',
      exitCode: 0,
    });

    const result = await hasUncommittedChanges('/worktree');

    expect(result).toBe(true);
    expect(exec).toHaveBeenCalledWith('git', ['status', '--porcelain'], { cwd: '/worktree' });
  });

  it('returns false when working tree is clean', async () => {
    vi.mocked(exec).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
    });

    const result = await hasUncommittedChanges('/worktree');

    expect(result).toBe(false);
  });
});

describe('pruneWorktrees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('calls git worktree prune', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await pruneWorktrees();

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'prune'], { cwd: '/repo' });
  });
});

describe('lockWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('locks worktree without reason', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await lockWorktree('/path/to/worktree');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'lock', '/path/to/worktree'], { cwd: '/repo' });
  });

  it('locks worktree with reason', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await lockWorktree('/path/to/worktree', 'Work in progress');

    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      ['worktree', 'lock', '/path/to/worktree', '--reason', 'Work in progress'],
      { cwd: '/repo' }
    );
  });

  it('throws cleaned error on failure', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error("fatal: '/path' is already locked"));

    await expect(lockWorktree('/path')).rejects.toThrow('Worktree is already locked');
  });
});

describe('unlockWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('unlocks worktree', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await unlockWorktree('/path/to/worktree');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'unlock', '/path/to/worktree'], { cwd: '/repo' });
  });

  it('throws cleaned error on failure', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error("fatal: '/path' is not locked"));

    await expect(unlockWorktree('/path')).rejects.toThrow('Worktree is not locked');
  });
});

describe('moveWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('moves worktree to new path', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await moveWorktree('/old/path', '/new/path');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'move', '/old/path', '/new/path'], { cwd: '/repo' });
  });
});

describe('repairWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
  });

  it('repairs all worktrees when no path provided', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await repairWorktree();

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'repair'], { cwd: '/repo' });
  });

  it('repairs specific worktree when path provided', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await repairWorktree('/path/to/worktree');

    expect(execOrThrow).toHaveBeenCalledWith('git', ['worktree', 'repair', '/path/to/worktree'], { cwd: '/repo' });
  });
});

describe('createCustomWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/repo');
    vi.mocked(getWorktreePath).mockResolvedValue('/repo-custom-branch');
  });

  it('creates custom worktree with branch name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    const result = await createCustomWorktree('custom-branch');

    expect(result.path).toBe('/repo-custom-branch');
    expect(result.branch).toBe('custom-branch');
    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '-b', 'custom-branch', '/repo-custom-branch', 'main'],
      { cwd: '/repo' }
    );
  });

  it('uses custom base branch', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await createCustomWorktree('feature', 'develop');

    expect(execOrThrow).toHaveBeenCalledWith(
      'git',
      ['worktree', 'add', '-b', 'feature', '/repo-custom-branch', 'develop'],
      { cwd: '/repo' }
    );
  });
});
