import { exec } from '../utils/exec.js';

export interface SetupProgress {
  step: string;
  current: number;
  total: number;
}

export type ProgressCallback = (progress: SetupProgress) => void;

/**
 * Set up a new worktree by running configured setup commands
 */
export async function setupWorktree(
  worktreePath: string,
  setupCommands: string[] | null,
  onProgress?: ProgressCallback
): Promise<void> {
  if (!setupCommands || setupCommands.length === 0) {
    return; // No setup commands configured
  }

  const total = setupCommands.length;

  for (let i = 0; i < setupCommands.length; i++) {
    const command = setupCommands[i];
    const current = i + 1;

    onProgress?.({
      step: command,
      current,
      total,
    });

    await runCommand(worktreePath, command);
  }
}

/**
 * Run a single command in the worktree directory
 */
async function runCommand(worktreePath: string, command: string): Promise<void> {
  // Split command into parts (simple space-based split)
  // For more complex commands, users can use shell wrappers
  const parts = command.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);

  const result = await exec(cmd, args, {
    cwd: worktreePath,
  });

  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${command}\n${result.stderr}`);
  }
}

/**
 * Check if a worktree appears to be set up
 * (Has node_modules or vendor directory)
 */
export async function isWorktreeSetup(worktreePath: string): Promise<boolean> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const checks = [
    path.join(worktreePath, 'node_modules'),
    path.join(worktreePath, 'vendor'),
  ];

  for (const checkPath of checks) {
    try {
      await fs.access(checkPath);
      return true;
    } catch {
      // Continue checking
    }
  }

  return false;
}
