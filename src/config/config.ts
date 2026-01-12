/**
 * Configuration loading and saving for Worktree Wizard
 * Configuration is stored per-repo in <repo-root>/.ww/config.json
 */

import fs from 'fs/promises';
import path from 'path';
import { WizardConfig, DEFAULT_CONFIG, CONFIG_VERSION } from './types.js';

const CONFIG_DIR_NAME = '.ww';
const CONFIG_FILE_NAME = 'config.json';

/**
 * Get the path to the config file for a repository
 */
export function getConfigPath(repoRoot: string): string {
  return path.join(repoRoot, CONFIG_DIR_NAME, CONFIG_FILE_NAME);
}

/**
 * Get the config directory path for a repository
 */
export function getConfigDir(repoRoot: string): string {
  return path.join(repoRoot, CONFIG_DIR_NAME);
}

/**
 * Check if a config file exists for a repository
 */
export async function configExists(repoRoot: string): Promise<boolean> {
  try {
    await fs.access(getConfigPath(repoRoot));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load configuration from disk for a repository
 * Returns null if no config exists
 */
export async function loadConfig(repoRoot: string): Promise<WizardConfig | null> {
  try {
    const configPath = getConfigPath(repoRoot);
    const content = await fs.readFile(configPath, 'utf-8');
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
 * Save configuration to disk for a repository
 */
export async function saveConfig(repoRoot: string, config: WizardConfig): Promise<void> {
  const configDir = getConfigDir(repoRoot);
  await fs.mkdir(configDir, { recursive: true });
  const content = JSON.stringify(config, null, 2);
  await fs.writeFile(getConfigPath(repoRoot), content, 'utf-8');
}

/**
 * Validate and migrate configuration
 */
export function validateConfig(config: Partial<WizardConfig>): WizardConfig {
  const validated: WizardConfig = {
    version: config.version ?? CONFIG_VERSION,
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
