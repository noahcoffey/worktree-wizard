/**
 * Configuration loading and saving for Worktree Wizard
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { WizardConfig, DEFAULT_CONFIG, CONFIG_VERSION } from './types.js';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'ww');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Get the path to the config file
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Check if a config file exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await fs.access(CONFIG_FILE);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load configuration from disk
 * Returns null if no config exists
 */
export async function loadConfig(): Promise<WizardConfig | null> {
  try {
    const content = await fs.readFile(CONFIG_FILE, 'utf-8');
    const config = JSON.parse(content) as WizardConfig;
    return validateConfig(config);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Save configuration to disk
 */
export async function saveConfig(config: WizardConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  const content = JSON.stringify(config, null, 2);
  await fs.writeFile(CONFIG_FILE, content, 'utf-8');
}

/**
 * Validate and migrate configuration
 */
export function validateConfig(config: Partial<WizardConfig>): WizardConfig {
  const validated: WizardConfig = {
    version: config.version ?? CONFIG_VERSION,
    repositoryPath: config.repositoryPath ?? DEFAULT_CONFIG.repositoryPath,
    terminalType: config.terminalType ?? DEFAULT_CONFIG.terminalType,
    frame1: {
      enabled: config.frame1?.enabled ?? DEFAULT_CONFIG.frame1.enabled,
      command: config.frame1?.command ?? DEFAULT_CONFIG.frame1.command,
    },
    frame2: {
      enabled: config.frame2?.enabled ?? DEFAULT_CONFIG.frame2.enabled,
      command: config.frame2?.command ?? DEFAULT_CONFIG.frame2.command,
    },
    defaultAICommand: config.defaultAICommand ?? DEFAULT_CONFIG.defaultAICommand,
    setupCommands: config.setupCommands !== undefined ? config.setupCommands : DEFAULT_CONFIG.setupCommands,
    githubIssuesEnabled: config.githubIssuesEnabled ?? DEFAULT_CONFIG.githubIssuesEnabled,
  };

  return validated;
}

/**
 * Check if the configured repository path is valid
 */
export async function isValidRepoPath(repoPath: string): Promise<boolean> {
  try {
    const gitDir = path.join(repoPath, '.git');
    const stat = await fs.stat(gitDir);
    return stat.isDirectory();
  } catch {
    return false;
  }
}
