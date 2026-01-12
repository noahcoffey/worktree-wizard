/**
 * Interactive setup wizard for Worktree Wizard
 */

import React, { useState } from 'react';
import { Box, Text } from 'ink';
import { TextInput, Select, ConfirmInput } from '@inkjs/ui';
import { WizardConfig, DEFAULT_CONFIG, FrameConfig } from '../config/types.js';
import { saveConfig, getConfigPath } from '../config/config.js';

type SetupStep =
  | 'welcome'
  | 'terminal-type'
  | 'frame1-enabled'
  | 'frame1-command'
  | 'frame2-enabled'
  | 'frame2-command'
  | 'ai-command'
  | 'setup-commands'
  | 'github-enabled'
  | 'confirm'
  | 'saving'
  | 'complete'
  | 'error';

interface InitWizardProps {
  repoRoot: string;
  onComplete: () => void;
}

export function InitWizard({ repoRoot, onComplete }: InitWizardProps) {
  const [step, setStep] = useState<SetupStep>('welcome');
  const [config, setConfig] = useState<WizardConfig>({ ...DEFAULT_CONFIG });
  const [error, setError] = useState<string | null>(null);

  const updateConfig = (updates: Partial<WizardConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const updateFrame1 = (updates: Partial<FrameConfig>) => {
    setConfig((prev) => ({
      ...prev,
      frame1: { ...prev.frame1, ...updates },
    }));
  };

  const updateFrame2 = (updates: Partial<FrameConfig>) => {
    setConfig((prev) => ({
      ...prev,
      frame2: { ...prev.frame2, ...updates },
    }));
  };

  const handleSave = async () => {
    setStep('saving');
    try {
      await saveConfig(repoRoot, config);
      setStep('complete');
      setTimeout(onComplete, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
      setStep('error');
    }
  };

  return (
    <Box flexDirection="column" padding={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color="magenta">
          {'  ✧ Worktree Wizard Setup ✧  '}
        </Text>
      </Box>

      {/* Welcome */}
      {step === 'welcome' && (
        <Box flexDirection="column">
          <Text>Welcome to Worktree Wizard!</Text>
          <Text dimColor>Let's configure your magical workspace.</Text>
          <Box marginTop={1}>
            <Text dimColor>Repository: {repoRoot}</Text>
          </Box>
          <Box marginTop={1}>
            <Text>Ready to begin? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={() => setStep('terminal-type')}
              onCancel={onComplete}
            />
          </Box>
        </Box>
      )}

      {/* Terminal Type */}
      {step === 'terminal-type' && (
        <Box flexDirection="column">
          <Text>Select your terminal application:</Text>
          <Box marginTop={1}>
            <Select
              options={[
                { label: 'iTerm2 (macOS)', value: 'iterm' },
                { label: 'Terminal.app (macOS)', value: 'terminal' },
              ]}
              onChange={(value) => {
                updateConfig({ terminalType: value as 'iterm' | 'terminal' });
                setStep('frame1-enabled');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Frame 1 Enabled */}
      {step === 'frame1-enabled' && (
        <Box flexDirection="column">
          <Text>Enable Frame 1 (dev server pane)?</Text>
          <Text dimColor>This pane typically runs your development server.</Text>
          <Box marginTop={1}>
            <Text>Enable Frame 1? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={() => {
                updateFrame1({ enabled: true });
                setStep('frame1-command');
              }}
              onCancel={() => {
                updateFrame1({ enabled: false });
                setStep('frame2-enabled');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Frame 1 Command */}
      {step === 'frame1-command' && (
        <Box flexDirection="column">
          <Text>Enter the command for Frame 1:</Text>
          <Text dimColor>(e.g., npm run dev, composer dev, yarn start)</Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              placeholder={DEFAULT_CONFIG.frame1.command}
              defaultValue={config.frame1.command}
              onSubmit={(value) => {
                updateFrame1({ command: value || DEFAULT_CONFIG.frame1.command });
                setStep('frame2-enabled');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Frame 2 Enabled */}
      {step === 'frame2-enabled' && (
        <Box flexDirection="column">
          <Text>Enable Frame 2 (AI assistant pane)?</Text>
          <Text dimColor>This pane can run Claude Code or another AI assistant.</Text>
          <Box marginTop={1}>
            <Text>Enable Frame 2? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={() => {
                updateFrame2({ enabled: true });
                setStep('frame2-command');
              }}
              onCancel={() => {
                updateFrame2({ enabled: false });
                setStep('ai-command');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Frame 2 Command */}
      {step === 'frame2-command' && (
        <Box flexDirection="column">
          <Text>Enter the command for Frame 2:</Text>
          <Text dimColor>(e.g., claude, cursor, aider)</Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              placeholder={DEFAULT_CONFIG.frame2.command}
              defaultValue={config.frame2.command}
              onSubmit={(value) => {
                updateFrame2({ command: value || DEFAULT_CONFIG.frame2.command });
                setStep('ai-command');
              }}
            />
          </Box>
        </Box>
      )}

      {/* AI Command (for context passing) */}
      {step === 'ai-command' && (
        <Box flexDirection="column">
          <Text>Default AI assistant command (for issue context):</Text>
          <Text dimColor>This is used when passing issue context to your AI.</Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              placeholder={DEFAULT_CONFIG.defaultAICommand}
              defaultValue={config.defaultAICommand}
              onSubmit={(value) => {
                updateConfig({ defaultAICommand: value || DEFAULT_CONFIG.defaultAICommand });
                setStep('setup-commands');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Setup Commands */}
      {step === 'setup-commands' && (
        <Box flexDirection="column">
          <Text>Enter setup commands (comma-separated, or "none" to skip):</Text>
          <Text dimColor>These run when creating a new worktree.</Text>
          <Text dimColor>Example: npm install, npm run db:setup</Text>
          <Box marginTop={1}>
            <Text color="cyan">{'> '}</Text>
            <TextInput
              placeholder="npm install"
              defaultValue={config.setupCommands?.join(', ') ?? 'none'}
              onSubmit={(value) => {
                if (value.toLowerCase() === 'none' || value === '') {
                  updateConfig({ setupCommands: null });
                } else {
                  const commands = value.split(',').map((cmd) => cmd.trim()).filter(Boolean);
                  updateConfig({ setupCommands: commands.length > 0 ? commands : null });
                }
                setStep('github-enabled');
              }}
            />
          </Box>
        </Box>
      )}

      {/* GitHub Integration */}
      {step === 'github-enabled' && (
        <Box flexDirection="column">
          <Text>Enable GitHub Issues integration?</Text>
          <Text dimColor>Requires the GitHub CLI (gh) to be installed and authenticated.</Text>
          <Box marginTop={1}>
            <Text>Enable GitHub Issues? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={() => {
                updateConfig({ githubIssuesEnabled: true });
                setStep('confirm');
              }}
              onCancel={() => {
                updateConfig({ githubIssuesEnabled: false });
                setStep('confirm');
              }}
            />
          </Box>
        </Box>
      )}

      {/* Confirmation */}
      {step === 'confirm' && (
        <Box flexDirection="column">
          <Text bold>Configuration Summary:</Text>
          <Box marginTop={1} flexDirection="column">
            <Text>
              <Text dimColor>Repository:</Text> {repoRoot}
            </Text>
            <Text>
              <Text dimColor>Terminal:</Text> {config.terminalType}
            </Text>
            <Text>
              <Text dimColor>Frame 1:</Text>{' '}
              {config.frame1.enabled ? config.frame1.command : 'disabled'}
            </Text>
            <Text>
              <Text dimColor>Frame 2:</Text>{' '}
              {config.frame2.enabled ? config.frame2.command : 'disabled'}
            </Text>
            <Text>
              <Text dimColor>AI Command:</Text> {config.defaultAICommand}
            </Text>
            <Text>
              <Text dimColor>Setup:</Text>{' '}
              {config.setupCommands?.join(', ') ?? 'none'}
            </Text>
            <Text>
              <Text dimColor>GitHub Issues:</Text>{' '}
              {config.githubIssuesEnabled ? 'enabled' : 'disabled'}
            </Text>
          </Box>
          <Box marginTop={1}>
            <Text>Save this configuration? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={handleSave}
              onCancel={onComplete}
            />
          </Box>
        </Box>
      )}

      {/* Saving */}
      {step === 'saving' && (
        <Box>
          <Text color="yellow">Saving configuration...</Text>
        </Box>
      )}

      {/* Complete */}
      {step === 'complete' && (
        <Box flexDirection="column">
          <Text color="green">✓ Configuration saved!</Text>
          <Text dimColor>Config file: {getConfigPath(repoRoot)}</Text>
          <Text dimColor>Run 'ww' to start the wizard.</Text>
        </Box>
      )}

      {/* Error */}
      {step === 'error' && (
        <Box flexDirection="column">
          <Text color="red">✗ Error: {error}</Text>
          <Box marginTop={1}>
            <Text>Try again? </Text>
            <Text dimColor>(Y/n) </Text>
            <ConfirmInput
              onConfirm={() => {
                setError(null);
                setStep('terminal-type');
              }}
              onCancel={onComplete}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
