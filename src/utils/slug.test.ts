import { describe, it, expect } from 'vitest';
import { slugify, createBranchName, extractIssueNumber } from './slug.js';

describe('slugify', () => {
  it('converts text to lowercase', () => {
    expect(slugify('HELLO WORLD')).toBe('hello-world');
    expect(slugify('MixedCase')).toBe('mixedcase');
  });

  it('replaces spaces with hyphens', () => {
    expect(slugify('hello world')).toBe('hello-world');
  });

  it('replaces special characters with hyphens', () => {
    expect(slugify('hello@world!')).toBe('hello-world');
    expect(slugify('test#$%feature')).toBe('test-feature');
  });

  it('collapses multiple consecutive hyphens', () => {
    expect(slugify('hello---world')).toBe('hello-world');
    expect(slugify('hello   world')).toBe('hello-world');
  });

  it('trims leading and trailing hyphens', () => {
    expect(slugify('-hello-')).toBe('hello');
    expect(slugify('---hello---')).toBe('hello');
    expect(slugify('!hello!')).toBe('hello');
  });

  it('returns empty string for empty input', () => {
    expect(slugify('')).toBe('');
  });

  it('returns empty string for only special characters', () => {
    expect(slugify('!@#$%^&*()')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('preserves numbers', () => {
    expect(slugify('test123')).toBe('test123');
    expect(slugify('123')).toBe('123');
    expect(slugify('v1.2.3')).toBe('v1-2-3');
  });

  it('handles unicode characters', () => {
    expect(slugify('café')).toBe('caf');
    expect(slugify('naïve')).toBe('na-ve');
  });

  it('truncates to 50 characters', () => {
    const longText = 'a'.repeat(60);
    expect(slugify(longText)).toBe('a'.repeat(50));
  });

  it('handles hyphens in input', () => {
    expect(slugify('my-test')).toBe('my-test');
    expect(slugify('already-hyphenated-text')).toBe('already-hyphenated-text');
  });
});

describe('createBranchName', () => {
  it('creates branch name from issue number and title', () => {
    expect(createBranchName(42, 'Add feature')).toBe('issue-42-add-feature');
  });

  it('handles issue number 0', () => {
    expect(createBranchName(0, 'Zero issue')).toBe('issue-0-zero-issue');
  });

  it('handles large issue numbers', () => {
    expect(createBranchName(999999, 'Big number')).toBe('issue-999999-big-number');
  });

  it('handles empty title', () => {
    expect(createBranchName(123, '')).toBe('issue-123-');
  });

  it('slugifies the title', () => {
    expect(createBranchName(1, 'Fix Bug #123!')).toBe('issue-1-fix-bug-123');
  });
});

describe('extractIssueNumber', () => {
  it('extracts issue number from valid branch name', () => {
    expect(extractIssueNumber('issue-42-feature')).toBe(42);
    expect(extractIssueNumber('issue-1-fix')).toBe(1);
  });

  it('returns null for non-matching branch names', () => {
    expect(extractIssueNumber('feature-42')).toBeNull();
    expect(extractIssueNumber('bugfix-123')).toBeNull();
    expect(extractIssueNumber('main')).toBeNull();
  });

  it('is case-sensitive', () => {
    expect(extractIssueNumber('ISSUE-42-feature')).toBeNull();
    expect(extractIssueNumber('Issue-42-feature')).toBeNull();
  });

  it('handles issue number 0', () => {
    expect(extractIssueNumber('issue-0-test')).toBe(0);
  });

  it('handles large issue numbers', () => {
    expect(extractIssueNumber('issue-999999999-test')).toBe(999999999);
  });

  it('returns null for empty string', () => {
    expect(extractIssueNumber('')).toBeNull();
  });

  it('returns null for issue- without number', () => {
    expect(extractIssueNumber('issue-abc')).toBeNull();
    expect(extractIssueNumber('issue-')).toBeNull();
  });

  it('only matches at the start of the string', () => {
    expect(extractIssueNumber('prefix-issue-42')).toBeNull();
  });
});
