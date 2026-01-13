import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupWorktree, isWorktreeSetup, SetupProgress } from './setup.js';
import { exec } from '../utils/exec.js';

// Mock the exec module
vi.mock('../utils/exec.js', () => ({
  exec: vi.fn(),
}));

// Mock fs/promises for isWorktreeSetup
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
  },
  access: vi.fn(),
}));

describe('setupWorktree', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns immediately for null setupCommands', async () => {
    await setupWorktree('/path', null);
    expect(exec).not.toHaveBeenCalled();
  });

  it('returns immediately for empty setupCommands array', async () => {
    await setupWorktree('/path', []);
    expect(exec).not.toHaveBeenCalled();
  });

  it('executes single command through shell', async () => {
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    await setupWorktree('/path', ['npm install']);

    expect(exec).toHaveBeenCalledTimes(1);
    expect(exec).toHaveBeenCalledWith('sh', ['-c', 'npm install'], { cwd: '/path' });
  });

  it('executes multiple commands sequentially', async () => {
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    await setupWorktree('/path', ['npm install', 'npm run build', 'npm test']);

    expect(exec).toHaveBeenCalledTimes(3);
    expect(exec).toHaveBeenNthCalledWith(1, 'sh', ['-c', 'npm install'], { cwd: '/path' });
    expect(exec).toHaveBeenNthCalledWith(2, 'sh', ['-c', 'npm run build'], { cwd: '/path' });
    expect(exec).toHaveBeenNthCalledWith(3, 'sh', ['-c', 'npm test'], { cwd: '/path' });
  });

  it('calls progress callback for each command', async () => {
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });
    const onProgress = vi.fn();

    await setupWorktree('/path', ['cmd1', 'cmd2', 'cmd3'], onProgress);

    expect(onProgress).toHaveBeenCalledTimes(3);
    expect(onProgress).toHaveBeenNthCalledWith(1, { step: 'cmd1', current: 1, total: 3 });
    expect(onProgress).toHaveBeenNthCalledWith(2, { step: 'cmd2', current: 2, total: 3 });
    expect(onProgress).toHaveBeenNthCalledWith(3, { step: 'cmd3', current: 3, total: 3 });
  });

  it('works without progress callback', async () => {
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    // Should not throw when onProgress is undefined
    await expect(setupWorktree('/path', ['npm install'])).resolves.toBeUndefined();
  });

  it('throws error on command failure', async () => {
    vi.mocked(exec).mockResolvedValue({
      stdout: '',
      stderr: 'npm ERR! code E404',
      exitCode: 1,
    });

    await expect(setupWorktree('/path', ['npm install'])).rejects.toThrow('Command failed: npm install');
  });

  it('includes stderr in error message', async () => {
    vi.mocked(exec).mockResolvedValue({
      stdout: '',
      stderr: 'some error output',
      exitCode: 1,
    });

    await expect(setupWorktree('/path', ['failing-cmd'])).rejects.toThrow('some error output');
  });

  it('stops on first failing command', async () => {
    vi.mocked(exec)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 0 })
      .mockResolvedValueOnce({ stdout: '', stderr: 'error', exitCode: 1 });

    await expect(setupWorktree('/path', ['cmd1', 'cmd2', 'cmd3'])).rejects.toThrow();
    expect(exec).toHaveBeenCalledTimes(2);
  });

  it('uses provided worktreePath as cwd', async () => {
    vi.mocked(exec).mockResolvedValue({ stdout: '', stderr: '', exitCode: 0 });

    await setupWorktree('/custom/worktree/path', ['npm install']);

    expect(exec).toHaveBeenCalledWith('sh', ['-c', 'npm install'], { cwd: '/custom/worktree/path' });
  });
});

describe('isWorktreeSetup', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset modules to get fresh fs mock
    vi.resetModules();
  });

  it('returns true when node_modules exists', async () => {
    const fs = await import('fs/promises');
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const { isWorktreeSetup } = await import('./setup.js');
    const result = await isWorktreeSetup('/path/to/worktree');

    expect(result).toBe(true);
    expect(fs.access).toHaveBeenCalledWith('/path/to/worktree/node_modules');
  });

  it('returns true when vendor exists but not node_modules', async () => {
    const fs = await import('fs/promises');
    vi.mocked(fs.access)
      .mockRejectedValueOnce(new Error('ENOENT')) // node_modules fails
      .mockResolvedValueOnce(undefined); // vendor succeeds

    const { isWorktreeSetup } = await import('./setup.js');
    const result = await isWorktreeSetup('/path/to/worktree');

    expect(result).toBe(true);
  });

  it('returns false when neither exists', async () => {
    const fs = await import('fs/promises');
    vi.mocked(fs.access).mockRejectedValue(new Error('ENOENT'));

    const { isWorktreeSetup } = await import('./setup.js');
    const result = await isWorktreeSetup('/path/to/worktree');

    expect(result).toBe(false);
  });

  it('checks node_modules first', async () => {
    const fs = await import('fs/promises');
    vi.mocked(fs.access).mockResolvedValueOnce(undefined);

    const { isWorktreeSetup } = await import('./setup.js');
    await isWorktreeSetup('/path');

    // Should return true after first check succeeds, not check vendor
    expect(fs.access).toHaveBeenCalledTimes(1);
    expect(fs.access).toHaveBeenCalledWith('/path/node_modules');
  });
});
