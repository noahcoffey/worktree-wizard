import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateConfig, isValidRepoPath, getConfigPath, getConfigDir } from './config.js';
import { DEFAULT_CONFIG } from './types.js';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: vi.fn(),
    access: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
  },
}));

describe('getConfigPath', () => {
  it('returns correct config file path', () => {
    expect(getConfigPath('/Users/test/repo')).toBe('/Users/test/repo/.ww/config.json');
  });

  it('handles paths without trailing slash', () => {
    expect(getConfigPath('/path/to/repo')).toBe('/path/to/repo/.ww/config.json');
  });
});

describe('getConfigDir', () => {
  it('returns correct config directory path', () => {
    expect(getConfigDir('/Users/test/repo')).toBe('/Users/test/repo/.ww');
  });
});

describe('validateConfig', () => {
  it('returns full defaults for empty object', () => {
    const result = validateConfig({});
    expect(result).toEqual(DEFAULT_CONFIG);
  });

  it('fills missing values with defaults', () => {
    const result = validateConfig({ terminalType: 'terminal' });
    expect(result.terminalType).toBe('terminal');
    expect(result.frame1).toEqual(DEFAULT_CONFIG.frame1);
    expect(result.frame2).toEqual(DEFAULT_CONFIG.frame2);
    expect(result.setupCommands).toEqual(DEFAULT_CONFIG.setupCommands);
  });

  it('preserves null setupCommands', () => {
    const result = validateConfig({ setupCommands: null });
    expect(result.setupCommands).toBeNull();
  });

  it('preserves empty array setupCommands', () => {
    const result = validateConfig({ setupCommands: [] });
    expect(result.setupCommands).toEqual([]);
  });

  it('uses default setupCommands when undefined', () => {
    const result = validateConfig({});
    expect(result.setupCommands).toEqual(['npm install']);
  });

  it('preserves custom setupCommands', () => {
    const result = validateConfig({ setupCommands: ['yarn', 'yarn build'] });
    expect(result.setupCommands).toEqual(['yarn', 'yarn build']);
  });

  it('fills missing frame1 properties', () => {
    const result = validateConfig({ frame1: { enabled: false } } as any);
    expect(result.frame1.enabled).toBe(false);
    expect(result.frame1.command).toBe(DEFAULT_CONFIG.frame1.command);
  });

  it('fills missing frame2 properties', () => {
    const result = validateConfig({ frame2: { command: 'custom-cmd' } } as any);
    expect(result.frame2.enabled).toBe(DEFAULT_CONFIG.frame2.enabled);
    expect(result.frame2.command).toBe('custom-cmd');
  });

  it('uses all provided values when complete', () => {
    const custom = {
      version: 2,
      terminalType: 'terminal' as const,
      frame1: { enabled: false, command: 'cmd1' },
      frame2: { enabled: false, command: 'cmd2' },
      defaultAICommand: 'gpt',
      setupCommands: ['make build'],
      githubIssuesEnabled: false,
    };
    const result = validateConfig(custom);
    expect(result).toEqual(custom);
  });

  it('preserves version 0', () => {
    const result = validateConfig({ version: 0 });
    expect(result.version).toBe(0);
  });

  it('defaults githubIssuesEnabled to true', () => {
    const result = validateConfig({});
    expect(result.githubIssuesEnabled).toBe(true);
  });

  it('preserves githubIssuesEnabled false', () => {
    const result = validateConfig({ githubIssuesEnabled: false });
    expect(result.githubIssuesEnabled).toBe(false);
  });
});

describe('isValidRepoPath', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns true for valid git repo', async () => {
    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => true,
    } as any);

    const result = await isValidRepoPath('/path/to/repo');
    expect(result).toBe(true);
    expect(fs.stat).toHaveBeenCalledWith('/path/to/repo/.git');
  });

  it('returns false for non-existent path', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

    const result = await isValidRepoPath('/non/existent/path');
    expect(result).toBe(false);
  });

  it('returns false when .git is a file not directory', async () => {
    vi.mocked(fs.stat).mockResolvedValue({
      isDirectory: () => false,
    } as any);

    const result = await isValidRepoPath('/path/to/submodule');
    expect(result).toBe(false);
  });

  it('returns false on permission error', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('EACCES'));

    const result = await isValidRepoPath('/restricted/path');
    expect(result).toBe(false);
  });

  it('handles empty string path', async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error('ENOENT'));

    const result = await isValidRepoPath('');
    expect(result).toBe(false);
  });
});
