import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exec, execOrThrow, checkDependency, checkDependencies } from './exec.js';
import { execa } from 'execa';

// Mock execa
vi.mock('execa', () => ({
  execa: vi.fn(),
}));

describe('exec', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stdout, stderr, and exitCode on success', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    const result = await exec('echo', ['hello']);

    expect(result).toEqual({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
    });
    expect(execa).toHaveBeenCalledWith('echo', ['hello'], {
      cwd: undefined,
      reject: false,
      timeout: 30000,
    });
  });

  it('passes cwd option to execa', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    await exec('ls', ['-la'], { cwd: '/some/path' });

    expect(execa).toHaveBeenCalledWith('ls', ['-la'], {
      cwd: '/some/path',
      reject: false,
      timeout: 30000,
    });
  });

  it('uses custom timeout when provided', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    await exec('slow-command', [], { timeout: 60000 });

    expect(execa).toHaveBeenCalledWith('slow-command', [], {
      cwd: undefined,
      reject: false,
      timeout: 60000,
    });
  });

  it('returns timeout error when command times out', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 0,
      timedOut: true,
    } as any);

    const result = await exec('slow-cmd', ['arg1'], { timeout: 5000 });

    expect(result.exitCode).toBe(124);
    expect(result.stderr).toContain('timed out');
    expect(result.stderr).toContain('5000ms');
  });

  it('returns non-zero exit code on failure', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error message',
      exitCode: 1,
      timedOut: false,
    } as any);

    const result = await exec('failing-cmd', []);

    expect(result).toEqual({
      stdout: '',
      stderr: 'error message',
      exitCode: 1,
    });
  });

  it('handles execa throwing an error', async () => {
    const error = new Error('Command not found') as any;
    error.stdout = '';
    error.stderr = 'command not found';
    error.exitCode = 127;
    vi.mocked(execa).mockRejectedValue(error);

    const result = await exec('nonexistent', []);

    expect(result.exitCode).toBe(127);
    expect(result.stderr).toBe('command not found');
  });

  it('defaults exitCode to 0 when undefined', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'success',
      stderr: '',
      exitCode: undefined,
      timedOut: false,
    } as any);

    const result = await exec('cmd', []);

    expect(result.exitCode).toBe(0);
  });

  it('defaults exitCode to 1 on thrown error without exitCode', async () => {
    const error = new Error('Unknown error') as any;
    vi.mocked(execa).mockRejectedValue(error);

    const result = await exec('cmd', []);

    expect(result.exitCode).toBe(1);
  });
});

describe('execOrThrow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns stdout on success', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'success output',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    const result = await execOrThrow('echo', ['test']);

    expect(result).toBe('success output');
  });

  it('throws error with stderr on failure', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'error details',
      exitCode: 1,
      timedOut: false,
    } as any);

    await expect(execOrThrow('failing-cmd', [])).rejects.toThrow('error details');
  });

  it('throws with command info when stderr is empty', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 1,
      timedOut: false,
    } as any);

    await expect(execOrThrow('cmd', ['arg1', 'arg2'])).rejects.toThrow('Command failed: cmd arg1 arg2');
  });

  it('passes options through to exec', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: 'output',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    await execOrThrow('git', ['status'], { cwd: '/repo', timeout: 10000 });

    expect(execa).toHaveBeenCalledWith('git', ['status'], {
      cwd: '/repo',
      reject: false,
      timeout: 10000,
    });
  });
});

describe('checkDependency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when command exists', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '/usr/bin/git',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    const result = await checkDependency('git');

    expect(result).toBe(true);
    expect(execa).toHaveBeenCalledWith('which', ['git'], expect.any(Object));
  });

  it('returns false when command does not exist', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: 'git not found',
      exitCode: 1,
      timedOut: false,
    } as any);

    const result = await checkDependency('nonexistent-cmd');

    expect(result).toBe(false);
  });
});

describe('checkDependencies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns available and missing commands', async () => {
    vi.mocked(execa)
      .mockResolvedValueOnce({ stdout: '/usr/bin/git', stderr: '', exitCode: 0, timedOut: false } as any)
      .mockResolvedValueOnce({ stdout: '', stderr: '', exitCode: 1, timedOut: false } as any)
      .mockResolvedValueOnce({ stdout: '/usr/bin/node', stderr: '', exitCode: 0, timedOut: false } as any);

    const result = await checkDependencies(['git', 'nonexistent', 'node']);

    expect(result.available).toEqual(['git', 'node']);
    expect(result.missing).toEqual(['nonexistent']);
  });

  it('returns all available when all exist', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '/usr/bin/cmd',
      stderr: '',
      exitCode: 0,
      timedOut: false,
    } as any);

    const result = await checkDependencies(['git', 'node', 'npm']);

    expect(result.available).toEqual(['git', 'node', 'npm']);
    expect(result.missing).toEqual([]);
  });

  it('returns all missing when none exist', async () => {
    vi.mocked(execa).mockResolvedValue({
      stdout: '',
      stderr: '',
      exitCode: 1,
      timedOut: false,
    } as any);

    const result = await checkDependencies(['fake1', 'fake2']);

    expect(result.available).toEqual([]);
    expect(result.missing).toEqual(['fake1', 'fake2']);
  });

  it('handles empty array', async () => {
    const result = await checkDependencies([]);

    expect(result.available).toEqual([]);
    expect(result.missing).toEqual([]);
  });
});
