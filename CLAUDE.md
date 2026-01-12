# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Worktree Wizard is a terminal UI for managing git worktrees with GitHub issue integration. It provides a split-panel interface showing GitHub issues on the left and active worktrees on the right, with terminal automation to open new windows with configured panes.

## Commands

```bash
npm run build      # Compile TypeScript to dist/
npm run dev        # Watch mode compilation
./bin/ww.js        # Run locally (after build)
ww init            # Run setup wizard
ww                 # Launch main interface
```

## Architecture

### Two UI Systems

The project uses two different UI frameworks:
- **Ink (React for terminals)**: Used only for the `ww init` setup wizard (`src/commands/init.tsx`)
- **Blessed (curses-like)**: Used for the main application UI (`src/ui/`)

### Configuration

Config stored at `~/.config/ww/config.json`. Key options:
- `repositoryPath`: Target git repository
- `terminalType`: `iterm` or `terminal`
- `frame1/frame2`: Terminal pane commands
- `setupCommands`: Commands run when creating worktrees
- `githubIssuesEnabled`: Toggle GitHub integration

### Terminal Adapter Pattern

Terminal automation uses an adapter pattern (`src/services/terminal/`):
- `TerminalAdapter` interface defines `openWindow()` and `closeByTitle()`
- `ITermAdapter` uses AppleScript for iTerm2
- `TerminalAppAdapter` uses AppleScript for Terminal.app
- Factory in `index.ts` selects adapter based on config

### UI Component Structure (Blessed)

The blessed UI (`src/ui/`) consists of:
- `app.ts`: Main application loop, action handlers, data refresh
- `screen.ts`: Screen initialization with quit handlers
- `components/header.ts`: ASCII title, big-number stats display
- `components/split-list.ts`: Dual-panel list with keyboard navigation
- `components/detail.ts`: Popups for detail view, confirmations, progress, messages
- `components/footer.ts`: Status bar with sync time and errors

### Key Patterns

**Dialog key handling**: Message dialogs capture focus and explicitly handle Enter key to prevent event propagation to lists behind them. Dialogs close on Space/Escape/Q, not Enter.

**Selection cooldown**: When focusing lists after dialog closes, a 100ms cooldown prevents accidental selections from lingering key events.

**Graceful GitHub failures**: The `refreshData()` function fetches worktrees first (always works), then tries GitHub issues separately. GitHub failures show a warning but don't block worktree operations.

**Git error cleanup**: The `cleanGitError()` function strips "fatal:" prefixes and translates common errors to user-friendly messages.

## TypeScript Notes

- ESM modules with `.js` extensions in imports (NodeNext resolution)
- Blessed type quirks: `border.fg` expects number but accepts string - use `as any` cast
- JSX enabled for Ink components only
