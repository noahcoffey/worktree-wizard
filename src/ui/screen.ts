/**
 * Main blessed screen setup and management
 */
import blessed from 'blessed';
import contrib from 'blessed-contrib';
import { WizardConfig } from '../config/types.js';

export interface ScreenContext {
  screen: blessed.Widgets.Screen;
  config: WizardConfig;
}

export function createScreen(config: WizardConfig): ScreenContext {
  const screen = blessed.screen({
    smartCSR: true,
    title: 'Worktree Wizard',
    cursor: {
      artificial: true,
      shape: 'line',
      blink: true,
      color: 'magenta',
    },
    fullUnicode: true,
    dockBorders: true,
  });

  // Global key bindings
  screen.key(['q', 'C-c'], () => {
    return process.exit(0);
  });

  return { screen, config };
}

export function render(screen: blessed.Widgets.Screen): void {
  screen.render();
}
