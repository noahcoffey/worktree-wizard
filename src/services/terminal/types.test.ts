import { describe, it, expect } from 'vitest';
import { buildFrames, getTabTitle, getCustomTabTitle, buildIssuePrompt } from './types.js';

describe('buildFrames', () => {
  it('returns empty array when both frames disabled', () => {
    const config = {
      frame1: { enabled: false, command: 'cmd1' },
      frame2: { enabled: false, command: 'cmd2' },
    };
    const result = buildFrames('/path', config);
    expect(result).toEqual([]);
  });

  it('returns one frame when only frame1 enabled', () => {
    const config = {
      frame1: { enabled: true, command: 'cmd1' },
      frame2: { enabled: false, command: 'cmd2' },
    };
    const result = buildFrames('/path', config);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ directory: '/path', command: 'cmd1' });
  });

  it('returns one frame when only frame2 enabled', () => {
    const config = {
      frame1: { enabled: false, command: 'cmd1' },
      frame2: { enabled: true, command: 'cmd2' },
    };
    const result = buildFrames('/path', config);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ directory: '/path', command: 'cmd2' });
  });

  it('returns two frames when both enabled', () => {
    const config = {
      frame1: { enabled: true, command: 'cmd1' },
      frame2: { enabled: true, command: 'cmd2' },
    };
    const result = buildFrames('/path', config);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ directory: '/path', command: 'cmd1' });
    expect(result[1]).toEqual({ directory: '/path', command: 'cmd2' });
  });

  it('uses customFrame2Command when provided', () => {
    const config = {
      frame1: { enabled: true, command: 'cmd1' },
      frame2: { enabled: true, command: 'cmd2' },
    };
    const result = buildFrames('/path', config, 'custom-cmd');
    expect(result[1].command).toBe('custom-cmd');
  });

  it('uses config command when customFrame2Command is undefined', () => {
    const config = {
      frame1: { enabled: true, command: 'cmd1' },
      frame2: { enabled: true, command: 'cmd2' },
    };
    const result = buildFrames('/path', config, undefined);
    expect(result[1].command).toBe('cmd2');
  });

  it('propagates directory to all frames', () => {
    const config = {
      frame1: { enabled: true, command: 'cmd1' },
      frame2: { enabled: true, command: 'cmd2' },
    };
    const result = buildFrames('/custom/directory', config);
    expect(result[0].directory).toBe('/custom/directory');
    expect(result[1].directory).toBe('/custom/directory');
  });
});

describe('getTabTitle', () => {
  it('returns full title when under 30 chars', () => {
    const result = getTabTitle(42, 'Short title');
    expect(result).toBe('#42: Short title');
  });

  it('truncates title over 30 chars with ellipsis', () => {
    const longTitle = 'This is a very long title that exceeds the limit';
    const result = getTabTitle(1, longTitle);
    expect(result).toBe('#1: This is a very long title that...');
  });

  it('handles exactly 30 character title', () => {
    const exactTitle = 'a'.repeat(30);
    const result = getTabTitle(1, exactTitle);
    expect(result).toBe(`#1: ${exactTitle}`);
  });

  it('handles exactly 31 character title (truncates)', () => {
    const title = 'a'.repeat(31);
    const result = getTabTitle(1, title);
    expect(result).toBe(`#1: ${'a'.repeat(30)}...`);
  });

  it('includes issue number in output', () => {
    const result = getTabTitle(999, 'Test');
    expect(result).toContain('#999:');
  });

  it('handles empty title', () => {
    const result = getTabTitle(1, '');
    expect(result).toBe('#1: ');
  });
});

describe('getCustomTabTitle', () => {
  it('returns full branch name when under 30 chars', () => {
    const result = getCustomTabTitle('feature-branch');
    expect(result).toBe('✧ feature-branch');
  });

  it('truncates branch name over 30 chars with ellipsis', () => {
    const longName = 'very-long-branch-name-that-exceeds-limit';
    const result = getCustomTabTitle(longName);
    expect(result).toBe('✧ very-long-branch-name-that-exc...');
  });

  it('handles exactly 30 character branch name', () => {
    const exactName = 'b'.repeat(30);
    const result = getCustomTabTitle(exactName);
    expect(result).toBe(`✧ ${exactName}`);
  });

  it('handles exactly 31 character branch name (truncates)', () => {
    const name = 'b'.repeat(31);
    const result = getCustomTabTitle(name);
    expect(result).toBe(`✧ ${'b'.repeat(30)}...`);
  });

  it('includes star prefix', () => {
    const result = getCustomTabTitle('test');
    expect(result.startsWith('✧ ')).toBe(true);
  });

  it('handles empty branch name', () => {
    const result = getCustomTabTitle('');
    expect(result).toBe('✧ ');
  });
});

describe('buildIssuePrompt', () => {
  it('builds basic prompt with all parameters', () => {
    const result = buildIssuePrompt('claude', 42, 'Fix the bug');
    expect(result).toContain('claude');
    expect(result).toContain('#42');
    expect(result).toContain('Fix the bug');
    expect(result).toContain('gh issue view 42');
  });

  it('wraps prompt in single quotes for shell', () => {
    const result = buildIssuePrompt('claude', 1, 'Test');
    expect(result).toMatch(/^claude '.*'$/);
  });

  it('escapes single quotes in issue title', () => {
    const result = buildIssuePrompt('claude', 1, "Don't break");
    // Single quote escaping: ' -> '\''
    expect(result).toContain("Don'\\''t break");
  });

  it('escapes multiple single quotes', () => {
    const result = buildIssuePrompt('claude', 1, "It's a 'test' isn't it");
    expect(result).toContain("It'\\''s a '\\''test'\\'' isn'\\''t it");
  });

  it('uses provided AI command', () => {
    const result = buildIssuePrompt('gpt', 1, 'Test');
    expect(result.startsWith('gpt ')).toBe(true);
  });

  it('includes issue number in gh command', () => {
    const result = buildIssuePrompt('claude', 999, 'Test');
    expect(result).toContain('gh issue view 999');
  });
});
