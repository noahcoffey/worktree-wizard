/**
 * iTerm2 Terminal Adapter (macOS)
 */

import { exec } from '../../utils/exec.js';
import type { TerminalAdapter, OpenWindowOptions } from './types.js';

export class ITermAdapter implements TerminalAdapter {
  name = 'iTerm2';

  async isAvailable(): Promise<boolean> {
    const checkScript = `
      try
        tell application "Finder"
          return exists application file id "com.googlecode.iterm2"
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
      return true; // Nothing to open
    }

    const escapedTitle = this.escapeForAppleScript(windowTitle);
    const firstFrame = frames[0];
    const secondFrame = frames[1];

    let script: string;

    if (frames.length === 1) {
      // Single pane
      script = this.buildSinglePaneScript(escapedTitle, firstFrame);
    } else {
      // Split pane (2 frames)
      script = this.buildSplitPaneScript(escapedTitle, firstFrame, secondFrame);
    }

    const result = await exec('osascript', ['-e', script]);

    if (result.exitCode !== 0) {
      console.error('iTerm AppleScript failed:', result.stderr);
    }

    return result.exitCode === 0;
  }

  async closeByTitle(title: string): Promise<boolean> {
    const escapedTitle = this.escapeForAppleScript(title);

    const script = `
      tell application "iTerm"
        repeat with w in windows
          repeat with t in tabs of w
            try
              if name of current session of t contains "${escapedTitle}" then
                close t
                return true
              end if
            end try
          end repeat
        end repeat
        return false
      end tell
    `;

    const result = await exec('osascript', ['-e', script]);
    return result.exitCode === 0 && result.stdout.trim() === 'true';
  }

  private escapeForAppleScript(str: string): string {
    return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  }

  private escapeForShell(str: string): string {
    return str.replace(/'/g, "'\\''");
  }

  private buildSinglePaneScript(
    escapedTitle: string,
    frame: { directory: string; command?: string }
  ): string {
    const escapedDir = this.escapeForShell(frame.directory);
    const escapedCommand = frame.command ? this.escapeForAppleScript(frame.command) : '';

    return `
      tell application "iTerm"
        activate
        tell current window
          create tab with default profile
          tell current session
            set name to "${escapedTitle}"
            write text "cd '${escapedDir}'"
            ${escapedCommand ? `write text "${escapedCommand}"` : ''}
          end tell
        end tell
      end tell
    `;
  }

  private buildSplitPaneScript(
    escapedTitle: string,
    frame1: { directory: string; command?: string },
    frame2: { directory: string; command?: string }
  ): string {
    const escapedDir1 = this.escapeForShell(frame1.directory);
    const escapedDir2 = this.escapeForShell(frame2.directory);
    const escapedCommand1 = frame1.command ? this.escapeForAppleScript(frame1.command) : '';
    const escapedCommand2 = frame2.command ? this.escapeForAppleScript(frame2.command) : '';

    return `
      tell application "iTerm"
        activate
        tell current window
          create tab with default profile
          tell current session
            set name to "${escapedTitle}"
            write text "cd '${escapedDir1}'"
            ${escapedCommand1 ? `write text "${escapedCommand1}"` : ''}

            set secondSession to (split horizontally with default profile)
            tell secondSession
              write text "cd '${escapedDir2}'"
              ${escapedCommand2 ? `write text "${escapedCommand2}"` : ''}
            end tell
          end tell
        end tell
      end tell
    `;
  }
}
