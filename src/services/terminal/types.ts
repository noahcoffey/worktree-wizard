/**
 * Terminal adapter interface for cross-platform terminal support
 */

import type { FrameConfig } from '../../config/types.js';

export interface TerminalFrame {
  directory: string;
  command?: string;
}

export interface OpenWindowOptions {
  frames: TerminalFrame[];
  windowTitle: string;
}

export interface TerminalAdapter {
  name: string;

  /**
   * Check if this terminal is available on the system
   */
  isAvailable(): Promise<boolean>;

  /**
   * Open a new terminal window with the specified frames
   * @param options Window configuration
   * @returns true if successful
   */
  openWindow(options: OpenWindowOptions): Promise<boolean>;

  /**
   * Close a terminal window by its title
   * @param title Window/tab title to find
   * @returns true if a window was closed
   */
  closeByTitle(title: string): Promise<boolean>;
}

/**
 * Build frames from config
 */
export function buildFrames(
  directory: string,
  config: { frame1: FrameConfig; frame2: FrameConfig },
  customFrame2Command?: string
): TerminalFrame[] {
  const frames: TerminalFrame[] = [];

  if (config.frame1.enabled) {
    frames.push({
      directory,
      command: config.frame1.command,
    });
  }

  if (config.frame2.enabled) {
    frames.push({
      directory,
      command: customFrame2Command ?? config.frame2.command,
    });
  }

  return frames;
}

// Consistent truncation length for terminal tab titles
const TAB_TITLE_MAX_LENGTH = 30;

/**
 * Get the tab title for an issue worktree
 */
export function getTabTitle(issueNumber: number, issueTitle: string): string {
  const truncatedTitle = issueTitle.length > TAB_TITLE_MAX_LENGTH
    ? issueTitle.slice(0, TAB_TITLE_MAX_LENGTH) + '...'
    : issueTitle;
  return `#${issueNumber}: ${truncatedTitle}`;
}

/**
 * Get the tab title for a custom worktree
 */
export function getCustomTabTitle(branchName: string): string {
  const truncatedName = branchName.length > TAB_TITLE_MAX_LENGTH
    ? branchName.slice(0, TAB_TITLE_MAX_LENGTH) + '...'
    : branchName;
  return `✧ ${truncatedName}`;
}

/**
 * Build an AI prompt for working on a GitHub issue
 */
export function buildIssuePrompt(
  aiCommand: string,
  issueNumber: number,
  issueTitle: string
): string {
  const prompt = `Work on GitHub issue #${issueNumber}: ${issueTitle}. You can use \`gh issue view ${issueNumber}\` to see full issue details.`;
  // Escape for shell (single quotes)
  const shellEscapedPrompt = prompt.replace(/'/g, "'\\''");
  return `${aiCommand} '${shellEscapedPrompt}'`;
}
