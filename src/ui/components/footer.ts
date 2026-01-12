/**
 * Footer/status bar component - Clean style
 */
import blessed from 'blessed';

const COLORS = {
  border: '#5f5f5f',
  text: '#d0d0d0',
  muted: '#808080',
  info: '#6a9fb5',
  error: '#ac4142',
};

export interface FooterOptions {
  parent: blessed.Widgets.Node;
}

export interface Footer {
  element: blessed.Widgets.BoxElement;
  setStatus: (message: string) => void;
  setLastSync: (time: Date | null) => void;
  setError: (error: string | null) => void;
}

export function createFooter(options: FooterOptions): Footer {
  const { parent } = options;

  const footer = blessed.box({
    parent,
    bottom: 0,
    left: 0,
    width: '100%',
    height: 2,
    tags: true,
  });

  // Divider
  blessed.box({
    parent: footer,
    top: 0,
    left: 0,
    width: '100%',
    height: 1,
    content: `{${COLORS.border}-fg}${'─'.repeat(100)}{/}`,
    tags: true,
  });

  // Status line
  const statusLine = blessed.box({
    parent: footer,
    top: 1,
    left: 1,
    width: '50%',
    height: 1,
    content: `{${COLORS.muted}-fg}Ready{/}`,
    tags: true,
  });

  // Help line
  blessed.box({
    parent: footer,
    top: 1,
    left: '50%',
    width: '50%-1',
    height: 1,
    content: `{${COLORS.muted}-fg}Tab/←→: Switch  ↑↓: Navigate  Enter: Select  r: Refresh  q: Quit{/}`,
    tags: true,
    align: 'right',
  });

  let lastSync: Date | null = null;
  let currentError: string | null = null;

  const updateStatusLine = () => {
    let content = '';

    if (lastSync) {
      content += `{${COLORS.info}-fg}Synced:{/} {${COLORS.text}-fg}${lastSync.toLocaleTimeString()}{/}`;
    } else {
      content += `{${COLORS.muted}-fg}Syncing...{/}`;
    }

    if (currentError) {
      content += ` {${COLORS.error}-fg}│ ${currentError}{/}`;
    }

    statusLine.setContent(content);
  };

  return {
    element: footer,
    setStatus: (message: string) => {
      statusLine.setContent(message);
    },
    setLastSync: (time: Date | null) => {
      lastSync = time;
      updateStatusLine();
    },
    setError: (error: string | null) => {
      currentError = error;
      updateStatusLine();
    },
  };
}
