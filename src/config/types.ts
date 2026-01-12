/**
 * Configuration types for Worktree Wizard
 */

export interface FrameConfig {
  enabled: boolean;
  command: string;
}

export interface WizardConfig {
  version: number;
  terminalType: 'iterm' | 'terminal';
  frame1: FrameConfig;
  frame2: FrameConfig;
  defaultAICommand: string;
  setupCommands: string[] | null;
  githubIssuesEnabled: boolean;
}

export const DEFAULT_CONFIG: WizardConfig = {
  version: 1,
  terminalType: 'iterm',
  frame1: {
    enabled: true,
    command: 'npm run dev',
  },
  frame2: {
    enabled: true,
    command: 'claude',
  },
  defaultAICommand: 'claude',
  setupCommands: ['npm install'],
  githubIssuesEnabled: true,
};

export const CONFIG_VERSION = 1;
