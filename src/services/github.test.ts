import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchOpenIssues,
  fetchIssue,
  assignIssueToSelf,
  getCurrentUser,
  getRepoFullName,
  GitHubIssue,
} from './github.js';
import { execOrThrow } from '../utils/exec.js';
import { getRepoRoot } from '../utils/paths.js';

// Mock dependencies
vi.mock('../utils/exec.js', () => ({
  execOrThrow: vi.fn(),
}));

vi.mock('../utils/paths.js', () => ({
  getRepoRoot: vi.fn(),
}));

const mockIssue: GitHubIssue = {
  number: 42,
  title: 'Test issue',
  body: 'Issue body',
  labels: [{ name: 'bug', color: 'red' }],
  assignees: [{ login: 'testuser' }],
  state: 'open',
  url: 'https://github.com/owner/repo/issues/42',
};

describe('fetchOpenIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/path/to/repo');
  });

  it('returns parsed issues from gh CLI', async () => {
    const issues = [mockIssue];
    vi.mocked(execOrThrow).mockResolvedValue(JSON.stringify(issues));

    const result = await fetchOpenIssues();

    expect(result).toEqual(issues);
    expect(execOrThrow).toHaveBeenCalledWith(
      'gh',
      ['issue', 'list', '--state', 'open', '--json', 'number,title,body,labels,assignees,state,url', '--limit', '100'],
      { cwd: '/path/to/repo' }
    );
  });

  it('returns empty array for empty response', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    const result = await fetchOpenIssues();

    expect(result).toEqual([]);
  });

  it('returns empty array for whitespace-only response', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('   \n  ');

    const result = await fetchOpenIssues();

    expect(result).toEqual([]);
  });

  it('throws on invalid JSON', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('not valid json');

    await expect(fetchOpenIssues()).rejects.toThrow('Failed to parse GitHub issues response');
  });

  it('uses repo root as cwd', async () => {
    vi.mocked(getRepoRoot).mockResolvedValue('/custom/repo/path');
    vi.mocked(execOrThrow).mockResolvedValue('[]');

    await fetchOpenIssues();

    expect(execOrThrow).toHaveBeenCalledWith('gh', expect.any(Array), { cwd: '/custom/repo/path' });
  });
});

describe('fetchIssue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/path/to/repo');
  });

  it('returns parsed issue from gh CLI', async () => {
    vi.mocked(execOrThrow).mockResolvedValue(JSON.stringify(mockIssue));

    const result = await fetchIssue(42);

    expect(result).toEqual(mockIssue);
    expect(execOrThrow).toHaveBeenCalledWith(
      'gh',
      ['issue', 'view', '42', '--json', 'number,title,body,labels,assignees,state,url'],
      { cwd: '/path/to/repo' }
    );
  });

  it('returns null when issue not found', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('issue not found'));

    const result = await fetchIssue(999);

    expect(result).toBeNull();
  });

  it('returns null on any error', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('network error'));

    const result = await fetchIssue(1);

    expect(result).toBeNull();
  });

  it('converts issue number to string for gh CLI', async () => {
    vi.mocked(execOrThrow).mockResolvedValue(JSON.stringify(mockIssue));

    await fetchIssue(123);

    expect(execOrThrow).toHaveBeenCalledWith(
      'gh',
      ['issue', 'view', '123', '--json', 'number,title,body,labels,assignees,state,url'],
      expect.any(Object)
    );
  });
});

describe('assignIssueToSelf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/path/to/repo');
  });

  it('calls gh issue edit with @me', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('');

    await assignIssueToSelf(42);

    expect(execOrThrow).toHaveBeenCalledWith(
      'gh',
      ['issue', 'edit', '42', '--add-assignee', '@me'],
      { cwd: '/path/to/repo' }
    );
  });

  it('throws on failure', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('permission denied'));

    await expect(assignIssueToSelf(42)).rejects.toThrow('permission denied');
  });
});

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trimmed username', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('testuser\n');

    const result = await getCurrentUser();

    expect(result).toBe('testuser');
  });

  it('calls correct gh api command', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('user');

    await getCurrentUser();

    expect(execOrThrow).toHaveBeenCalledWith('gh', ['api', 'user', '-q', '.login']);
  });

  it('throws on failure', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('not authenticated'));

    await expect(getCurrentUser()).rejects.toThrow('not authenticated');
  });
});

describe('getRepoFullName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getRepoRoot).mockResolvedValue('/path/to/repo');
  });

  it('returns trimmed owner/repo name', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('owner/repo\n');

    const result = await getRepoFullName();

    expect(result).toBe('owner/repo');
  });

  it('calls correct gh repo view command', async () => {
    vi.mocked(execOrThrow).mockResolvedValue('owner/repo');

    await getRepoFullName();

    expect(execOrThrow).toHaveBeenCalledWith(
      'gh',
      ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'],
      { cwd: '/path/to/repo' }
    );
  });

  it('uses repo root as cwd', async () => {
    vi.mocked(getRepoRoot).mockResolvedValue('/custom/path');
    vi.mocked(execOrThrow).mockResolvedValue('owner/repo');

    await getRepoFullName();

    expect(execOrThrow).toHaveBeenCalledWith('gh', expect.any(Array), { cwd: '/custom/path' });
  });

  it('throws on failure', async () => {
    vi.mocked(execOrThrow).mockRejectedValue(new Error('not a GitHub repo'));

    await expect(getRepoFullName()).rejects.toThrow('not a GitHub repo');
  });
});
