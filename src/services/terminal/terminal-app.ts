/**
 * macOS Terminal.app Adapter (placeholder for future implementation)
 */

import { exec } from '../../utils/exec.js';
import type { TerminalAdapter, OpenWindowOptions } from './types.js';

export class TerminalAppAdapter implements TerminalAdapter {
  name = 'Terminal.app';

  async isAvailable(): Promise<boolean> {
    // Terminal.app is always available on macOS
    const checkScript = `
      try
        tell application "Finder"
          return exists application file id "com.apple.Terminal"
        end tell
      on error
        return false
      end try
    `;

    const result = await exec('osascript', ['-e', checkScript]);
    return result.exitCode === 0 && result.stdout.trim() === 'true';
  }

  async openWindow(options: OpenWindowOptions): Promise<boolean> {
    const { frames, windowTitle } = options;

    if (frames.length === 0) {
      return true;
    }

    // Terminal.app doesn't support split panes natively
    // We'll open one tab per frame for now
    for (const frame of frames) {
      const success = await this.openTab(frame.directory, frame.command, windowTitle);
      if (!success) {
        return false;
      }
    }

    return true;
  }

  private escapeForAppleScript(str: string): string {
    // Comprehensive escaping for AppleScript string literals
    return str
      .replace(/\\/g, '\\\\')  // Backslashes
      .replace(/"/g, '\\"')    // Double quotes
      .replace(/\n/g, '\\n')   // Newlines
      .replace(/\r/g, '\\r')   // Carriage returns
      .replace(/\t/g, '\\t');  // Tabs
  }

  async closeByTitle(title: string): Promise<boolean> {
    const escapedTitle = this.escapeForAppleScript(title);

    const script = `
      tell application "Terminal"
        repeat with w in windows
          if name of w contains "${escapedTitle}" then
            close w
            return true
          end if
        end repeat
        return false
      end tell
    `;

    const result = await exec('osascript', ['-e', script]);
    return result.exitCode === 0 && result.stdout.trim() === 'true';
  }

  private async openTab(
    directory: string,
    command: string | undefined,
    title: string
  ): Promise<boolean> {
    const escapedDir = directory.replace(/'/g, "'\\''");
    const escapedTitle = this.escapeForAppleScript(title);

    let commandStr = `cd '${escapedDir}'`;
    if (command) {
      const escapedCommand = command.replace(/'/g, "'\\''");
      commandStr += ` && ${escapedCommand}`;
    }

    const script = `
      tell application "Terminal"
        activate
        do script "${this.escapeForAppleScript(commandStr)}"
        set custom title of front window to "${escapedTitle}"
      end tell
    `;

    const result = await exec('osascript', ['-e', script]);
    return result.exitCode === 0;
  }
}
