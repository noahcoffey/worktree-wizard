/**
 * Terminal adapter factory and exports
 */

import type { WizardConfig } from '../../config/types.js';
import type { TerminalAdapter } from './types.js';
import { ITermAdapter } from './iterm.js';
import { TerminalAppAdapter } from './terminal-app.js';

export * from './types.js';
export { ITermAdapter } from './iterm.js';
export { TerminalAppAdapter } from './terminal-app.js';

const adapters: Record<string, new () => TerminalAdapter> = {
  iterm: ITermAdapter,
  terminal: TerminalAppAdapter,
};

/**
 * Get a terminal adapter based on the config
 */
export function getTerminalAdapter(config: WizardConfig): TerminalAdapter {
  const AdapterClass = adapters[config.terminalType];
  if (!AdapterClass) {
    throw new Error(`Unknown terminal type: ${config.terminalType}`);
  }
  return new AdapterClass();
}

/**
 * Get all available terminal adapters
 */
export async function getAvailableAdapters(): Promise<TerminalAdapter[]> {
  const results: TerminalAdapter[] = [];

  for (const AdapterClass of Object.values(adapters)) {
    const adapter = new AdapterClass();
    if (await adapter.isAvailable()) {
      results.push(adapter);
    }
  }

  return results;
}
