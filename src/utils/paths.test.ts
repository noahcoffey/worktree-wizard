import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRepoRoot, getRepoName, getWorktreeParentDir, getWorktreePath, isInsideGitRepo, isGitRepo } from './paths.js';
import { execOrThrow } from './exec.js';

// Mock the exec module
vi.mock('./exec.js', () => ({
  execOrThrow: vi.fn(),
}));

// We need to reset the module cache between tests to clear cachedRepoRoot
beforeEach(async () => {
  vi.clearAllMocks();
  // Reset the module to clear cached values
  vi.resetModules();
});

describe('getRepoRoot', () => {
  it('returns trimmed repo root from git command', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/repo\n');

    // Re-import to get fresh module without cache
    const { getRepoRoot } = await import('./paths.js');
    const result = await getRepoRoot();

    expect(result).toBe('/Users/test/repo');
    expect(execOrThrow).toHaveBeenCalledWith('git', ['rev-parse', '--show-toplevel']);
  });

  it('caches the result for subsequent calls', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/repo\n');

    const { getRepoRoot } = await import('./paths.js');
    await getRepoRoot();
    await getRepoRoot();
    await getRepoRoot();

    // Should only call execOrThrow once due to caching
    expect(execOrThrow).toHaveBeenCalledTimes(1);
  });
});

describe('getRepoName', () => {
  it('returns basename of repo root', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/my-project\n');

    const { getRepoName } = await import('./paths.js');
    const result = await getRepoName();

    expect(result).toBe('my-project');
  });

  it('handles repo names with dots', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/project.js\n');

    const { getRepoName } = await import('./paths.js');
    const result = await getRepoName();

    expect(result).toBe('project.js');
  });
});

describe('getWorktreeParentDir', () => {
  it('returns parent directory of repo root', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/project\n');

    const { getWorktreeParentDir } = await import('./paths.js');
    const result = await getWorktreeParentDir();

    expect(result).toBe('/Users/test');
  });

  it('handles repo at root level', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/project\n');

    const { getWorktreeParentDir } = await import('./paths.js');
    const result = await getWorktreeParentDir();

    expect(result).toBe('/');
  });
});

describe('getWorktreePath', () => {
  it('generates correct worktree path', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/project\n');

    const { getWorktreePath } = await import('./paths.js');
    const result = await getWorktreePath('feature-branch');

    expect(result).toBe('/Users/test/project-feature-branch');
  });

  it('preserves hyphens in branch name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/project\n');

    const { getWorktreePath } = await import('./paths.js');
    const result = await getWorktreePath('issue-42-fix-bug');

    expect(result).toBe('/Users/test/project-issue-42-fix-bug');
  });

  it('handles empty branch name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('/Users/test/project\n');

    const { getWorktreePath } = await import('./paths.js');
    const result = await getWorktreePath('');

    expect(result).toBe('/Users/test/project-');
  });
});

describe('isInsideGitRepo', () => {
  it('returns true when inside git repo', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('.git\n');

    const result = await isInsideGitRepo();
    expect(result).toBe(true);
    expect(execOrThrow).toHaveBeenCalledWith('git', ['rev-parse', '--git-dir']);
  });

  it('returns false when outside git repo', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('not a git repository'));

    const result = await isInsideGitRepo();
    expect(result).toBe(false);
  });
});

describe('isGitRepo', () => {
  it('returns true for valid git repo path', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('.git\n');

    const result = await isGitRepo('/path/to/repo');
    expect(result).toBe(true);
    expect(execOrThrow).toHaveBeenCalledWith('git', ['-C', '/path/to/repo', 'rev-parse', '--git-dir']);
  });

  it('returns false for non-repo path', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('not a git repository'));

    const result = await isGitRepo('/not/a/repo');
    expect(result).toBe(false);
  });

  it('passes path to git -C option', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('.git\n');

    await isGitRepo('/custom/path');
    expect(execOrThrow).toHaveBeenCalledWith('git', ['-C', '/custom/path', 'rev-parse', '--git-dir']);
  });
});
