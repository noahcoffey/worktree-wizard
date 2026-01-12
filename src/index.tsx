#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InitWizard } from './commands/init.js';
import { checkDependencies } from './utils/exec.js';
import { loadConfig, configExists, getConfigPath } from './config/config.js';
import { WizardConfig } from './config/types.js';
import { getRepoRoot } from './utils/paths.js';
import { runApp } from './ui/index.js';

interface ParsedArgs {
  help: boolean;
  init: boolean;
}

function parseArgs(): ParsedArgs {
  const args = process.argv.slice(2);
  let help = false;
  let init = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === 'init') {
      init = true;
    }
  }

  return { help, init };
}

function showHelp() {
  console.log(`
✧ Worktree Wizard ✧
A magical CLI for managing git worktrees

Usage: ww [command] [options]

Commands:
  init                 Run the setup wizard to configure this repository

Options:
  -h, --help           Show this help message

Examples:
  ww init              Configure Worktree Wizard for current repo
  ww                   Launch the wizard interface

Configuration:
  Config is stored per-repo at: <repo>/.ww/config.json
  Run 'ww init' from within a git repo to configure.
`);
}

async function runInit(repoRoot: string) {
  process.stdout.write('\x1b[2J\x1b[H');
  const { waitUntilExit } = render(
    <InitWizard repoRoot={repoRoot} onComplete={() => process.exit(0)} />
  );
  await waitUntilExit();
}

async function checkRequiredDependencies(config: WizardConfig): Promise<void> {
  // Base dependencies
  const deps = ['git'];

  // Add osascript if using iTerm on macOS
  if (config.terminalType === 'iterm') {
    deps.push('osascript');
  }

  // Add gh if GitHub issues are enabled
  if (config.githubIssuesEnabled) {
    deps.push('gh');
  }

  const { missing } = await checkDependencies(deps);

  if (missing.length > 0) {
    console.error('Error: Missing required dependencies:');
    for (const dep of missing) {
      console.error(`  - ${dep}`);
    }
    console.error('\nPlease install the missing dependencies and try again.');

    if (missing.includes('gh')) {
      console.error('\nTo install GitHub CLI (gh):');
      console.error('  brew install gh');
      console.error('  gh auth login');
    }

    process.exit(1);
  }

  // Check if gh is authenticated (only if GitHub issues are enabled)
  if (config.githubIssuesEnabled) {
    try {
      const { exec } = await import('./utils/exec.js');
      const result = await exec('gh', ['auth', 'status']);
      if (result.exitCode !== 0) {
        console.error('Error: GitHub CLI is not authenticated');
        console.error('Please run: gh auth login');
        console.error('\nOr disable GitHub Issues in your config (ww init)');
        process.exit(1);
      }
    } catch {
      console.error('Error: Could not verify GitHub CLI authentication');
      process.exit(1);
    }
  }
}

async function main() {
  const { help, init } = parseArgs();

  if (help) {
    showHelp();
    process.exit(0);
  }

  // Auto-detect repository root from current directory
  let repoRoot: string;
  try {
    repoRoot = await getRepoRoot();
  } catch {
    console.error('Error: Not inside a git repository.');
    console.error('');
    console.error('Run ww from within a git repository.');
    process.exit(1);
  }

  // Check for repo-specific config
  const hasConfig = await configExists(repoRoot);

  if (init || !hasConfig) {
    if (!hasConfig) {
      console.log('✧ Welcome to Worktree Wizard! ✧');
      console.log('');
      console.log('No configuration found for this repository.');
      console.log('Running setup wizard...');
      console.log('');
    }
    await runInit(repoRoot);
    return;
  }

  const config = await loadConfig(repoRoot);
  if (!config) {
    console.error('Error: Failed to load configuration');
    console.error(`Config file: ${getConfigPath(repoRoot)}`);
    console.error('Run "ww init" to reconfigure.');
    process.exit(1);
  }

  // Check required dependencies based on config
  await checkRequiredDependencies(config);

  // Run the blessed-based app
  await runApp(config);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
