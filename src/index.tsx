#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { InitWizard } from './commands/init.js';
import { checkDependencies } from './utils/exec.js';
import { loadConfig, configExists, getConfigPath } from './config/config.js';
import { WizardConfig } from './config/types.js';
import { setRepoRoot } from './utils/paths.js';
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
  init                 Run the setup wizard to configure Worktree Wizard

Options:
  -h, --help           Show this help message

Examples:
  ww init              Configure Worktree Wizard
  ww                   Launch the wizard interface

Configuration:
  Config file: ~/.config/ww/config.json
  Run 'ww init' to create or update configuration.
`);
}

async function runInit() {
  process.stdout.write('\x1b[2J\x1b[H');
  const { waitUntilExit } = render(
    <InitWizard onComplete={() => process.exit(0)} />
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

  if (init) {
    await runInit();
    return;
  }

  // Load configuration
  const hasConfig = await configExists();
  if (!hasConfig) {
    console.log('✧ Welcome to Worktree Wizard! ✧');
    console.log('');
    console.log('No configuration found. Running setup wizard...');
    console.log('');
    await runInit();
    return;
  }

  const config = await loadConfig();
  if (!config) {
    console.error('Error: Failed to load configuration');
    console.error(`Config file: ${getConfigPath()}`);
    console.error('Run "ww init" to reconfigure.');
    process.exit(1);
  }

  if (!config.repositoryPath) {
    console.error('Error: No repository path configured');
    console.error('Run "ww init" to configure your repository.');
    process.exit(1);
  }

  // Check required dependencies based on config
  await checkRequiredDependencies(config);

  // Set the repository root from config
  setRepoRoot(config.repositoryPath);

  // Run the blessed-based app
  await runApp(config);
}

main().catch((error) => {
  console.error('Fatal error:', error.message);
  process.exit(1);
});
