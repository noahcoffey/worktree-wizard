# Worktree Wizard

[![Test](https://github.com/noahcoffey/worktree-wizard/actions/workflows/test.yml/badge.svg)](https://github.com/noahcoffey/worktree-wizard/actions/workflows/test.yml)

A terminal UI for managing git worktrees with GitHub issue integration.

```
╦ ╦┌─┐┬─┐┬┌─┌┬┐┬─┐┌─┐┌─┐  ╦ ╦┬┌─┐┌─┐┬─┐┌┬┐
║║║│ │├┬┘├┴┐ │ ├┬┘├┤ ├┤   ║║║│┌─┘├─┤├┬┘ ││
╚╩╝└─┘┴└─┴ ┴ ┴ ┴└─└─┘└─┘  ╚╩╝┴└─┘┴ ┴┴└──┴┘
```

## Features

- **Split-panel interface** - Issues on the left, active worktrees on the right
- **GitHub integration** - Fetches open issues from your repository via `gh` CLI
- **Automatic setup** - Runs configurable setup commands when creating worktrees
- **Terminal integration** - Opens iTerm2 or Terminal.app with split panes
- **AI-ready** - Optionally passes issue context to Claude or your preferred AI assistant
- **Smart cleanup** - Removes worktrees and auto-deletes branches that have been merged

## Requirements

- macOS (for terminal automation)
- Node.js 18+
- Git
- GitHub CLI (`gh`) - authenticated (optional, for issue integration)
- iTerm2 or Terminal.app

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/worktree-wizard.git
cd worktree-wizard

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

## Quick Start

```bash
# Navigate to your project and run
cd /path/to/your/project
ww
```

On first run, the setup wizard will guide you through configuration. After that, `ww` launches directly into the interface.

## Configuration

Configuration is stored **per-repository** at `<repo>/.ww/config.json`. Each repository can have its own settings.

- First run in a repo automatically triggers the setup wizard
- Use `ww init` to reconfigure an existing repo

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `terminalType` | Terminal emulator: `iterm` or `terminal` | `iterm` |
| `frame1.enabled` | Enable first terminal pane | `true` |
| `frame1.command` | Command for first pane | `npm run dev` |
| `frame2.enabled` | Enable second terminal pane | `true` |
| `frame2.command` | Command for second pane | `claude` |
| `defaultAICommand` | AI command for issue context | `claude` |
| `setupCommands` | Commands to run on worktree creation | `["npm install"]` |
| `githubIssuesEnabled` | Enable GitHub issue fetching | `true` |

### Example Configuration

```json
{
  "version": 1,
  "terminalType": "iterm",
  "frame1": {
    "enabled": true,
    "command": "npm run dev"
  },
  "frame2": {
    "enabled": true,
    "command": "claude"
  },
  "defaultAICommand": "claude",
  "setupCommands": ["npm install", "npm run db:migrate"],
  "githubIssuesEnabled": true
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` / `←` `→` | Switch between Issues and Worktrees panels |
| `↑` `↓` / `j` `k` | Navigate list items |
| `Enter` | Select item / Open detail view |
| `r` | Refresh data |
| `q` | Quit |
| `Space` | Dismiss dialogs |
| `Escape` | Go back / Cancel |

## Usage

### Creating a Worktree from an Issue

1. Select an issue from the left panel
2. Press Enter to open the detail view
3. Choose **Start with Context** (passes issue info to AI) or **Quick Start**
4. The wizard will:
   - Create a branch: `issue-{number}-{slug}`
   - Create a worktree at `../{repo}-issue-{number}-{slug}`
   - Run your setup commands
   - Assign the issue to you on GitHub
   - Open a new terminal window with your configured panes

### Creating a Custom Worktree

1. Navigate to the Worktrees panel (right side)
2. Select **+ New Worktree**
3. Enter a branch name
4. The wizard creates the worktree and opens your terminal

### Removing a Worktree

1. Select a worktree from the right panel
2. Press Enter to open the detail view
3. Choose **Remove Worktree**
4. Confirm the removal
5. The wizard will:
   - Close the associated terminal tab
   - Remove the worktree directory
   - Delete the branch if it's been merged to main

### Locking/Unlocking Worktrees

Lock a worktree to prevent it from being pruned by `git worktree prune`:

1. Select a worktree
2. Choose **Lock** or **Unlock** from the detail view

## Architecture

```
src/
├── index.tsx              # Entry point, CLI argument parsing
├── commands/
│   └── init.tsx           # Setup wizard (Ink-based)
├── config/
│   ├── types.ts           # Configuration interfaces
│   └── config.ts          # Config load/save
├── ui/                    # Blessed-based terminal UI
│   ├── app.ts             # Main application
│   ├── screen.ts          # Screen setup
│   └── components/
│       ├── header.ts      # Title and stats display
│       ├── split-list.ts  # Dual-panel list view
│       ├── detail.ts      # Detail popup and dialogs
│       └── footer.ts      # Status bar
├── services/
│   ├── git.ts             # Git worktree operations
│   ├── github.ts          # GitHub CLI wrapper
│   ├── setup.ts           # Worktree setup runner
│   └── terminal/
│       ├── types.ts       # Terminal adapter interface
│       ├── iterm.ts       # iTerm2 AppleScript adapter
│       ├── terminal-app.ts # Terminal.app adapter
│       └── index.ts       # Adapter factory
└── utils/
    ├── exec.ts            # Process execution
    ├── slug.ts            # Branch name generation
    └── paths.ts           # Path utilities
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Watch mode
npm run dev

# Run locally
./bin/ww.js

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Troubleshooting

### "Not inside a git repository"

Run `ww` from within a git repository directory. The tool auto-detects the repository from your current working directory.

### "GitHub CLI is not authenticated"

Run `gh auth login` and follow the prompts to authenticate.

### "Missing required dependencies"

Install the missing dependencies:
- `git` - Should be pre-installed on macOS
- `gh` - Install with `brew install gh`
- `osascript` - Pre-installed on macOS (used for iTerm2 automation)

### GitHub API errors in footer

If you see GitHub connection errors, the worktree features will still work. Only issue fetching requires network access.

### Terminal window doesn't open

Ensure you have the correct `terminalType` configured. iTerm2 requires AppleScript permissions - you may need to grant permission in System Preferences > Privacy & Security > Automation.

## License

MIT
