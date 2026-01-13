/**
 * Detail popup component - Shows issue description
 */
import blessed from 'blessed';
import { ListItem } from './split-list.js';
import { WizardConfig } from '../../config/types.js';
import { COLORS } from '../colors.js';

export type DetailAction =
  | 'summon'
  | 'summon-with-context'
  | 'banish'
  | 'lock'
  | 'unlock'
  | 'back';

export interface DetailPopupOptions {
  parent: blessed.Widgets.Node;
  onAction: (action: DetailAction, item: ListItem) => void;
  onClose: () => void;
  config: WizardConfig;
}

export interface DetailPopup {
  show: (item: ListItem) => void;
  hide: () => void;
  destroy: () => void;
}

export function createDetailPopup(options: DetailPopupOptions): DetailPopup {
  const { parent, onAction, onClose, config } = options;

  let currentItem: ListItem | null = null;
  let actionList: blessed.Widgets.ListElement | null = null;
  let descriptionBox: blessed.Widgets.BoxElement | null = null;

  // Main popup box - taller for description
  const popup = blessed.box({
    parent,
    top: 'center',
    left: 'center',
    width: 70,
    height: 28,
    border: {
      type: 'line',
      fg: COLORS.borderActive as any,
    },
    style: {
      border: {
        fg: COLORS.borderActive,
      },
      bg: 'black',
    },
    tags: true,
    hidden: true,
    shadow: true,
  });

  // Title area
  const titleBox = blessed.box({
    parent: popup,
    top: 0,
    left: 1,
    width: '100%-4',
    height: 2,
    tags: true,
    content: '',
  });

  // Labels/meta area
  const metaBox = blessed.box({
    parent: popup,
    top: 2,
    left: 1,
    width: '100%-4',
    height: 1,
    tags: true,
    content: '',
  });

  // Divider after meta
  blessed.box({
    parent: popup,
    top: 3,
    left: 0,
    width: '100%-2',
    height: 1,
    content: `{${COLORS.border}-fg}${'─'.repeat(66)}{/}`,
    tags: true,
  });

  function buildActions(item: ListItem): { label: string; value: DetailAction }[] {
    const actions: { label: string; value: DetailAction }[] = [];

    if (item.type === 'create-custom') {
      actions.push({ label: `{${COLORS.success}-fg}▸{/} Create New Worktree`, value: 'summon' });
    } else if (item.hasWorktree && item.worktree) {
      actions.push({ label: `{${COLORS.error}-fg}▸{/} Remove Worktree`, value: 'banish' });
      if (item.worktree.isLocked) {
        actions.push({ label: `{${COLORS.warning}-fg}▸{/} Unlock`, value: 'unlock' });
      } else {
        actions.push({ label: `{${COLORS.warning}-fg}▸{/} Lock`, value: 'lock' });
      }
    } else {
      if (item.type === 'issue') {
        actions.push({ label: `{${COLORS.success}-fg}▸{/} Start with Context`, value: 'summon-with-context' });
        actions.push({ label: `{${COLORS.info}-fg}▸{/} Quick Start`, value: 'summon' });
      } else {
        actions.push({ label: `{${COLORS.success}-fg}▸{/} Create Worktree`, value: 'summon' });
      }
    }

    actions.push({ label: `{${COLORS.muted}-fg}◂{/} Back`, value: 'back' });

    return actions;
  }

  function show(item: ListItem) {
    currentItem = item;

    let title = '';
    let meta = '';
    let description = '';
    let showDescription = false;

    if (item.type === 'create-custom') {
      title = `{bold}{${COLORS.label}-fg}New Worktree{/}`;
      meta = `{${COLORS.muted}-fg}Create a worktree with a custom branch name{/}`;
      popup.setLabel(` {${COLORS.label}-fg}Create{/} `);
    } else if (item.type === 'custom-worktree' && item.worktree) {
      title = `{bold}{${COLORS.text}-fg}${item.worktree.branch}{/}`;
      meta = `{${COLORS.muted}-fg}Path:{/} ${item.worktree.path}`;
      if (item.worktree.isLocked) {
        meta += `  {${COLORS.error}-fg}● Locked{/}`;
      }
      popup.setLabel(` {${COLORS.label}-fg}Worktree{/} `);
    } else if (item.type === 'issue' && item.issue) {
      title = `{bold}{${COLORS.label}-fg}#${item.issue.number}{/} {${COLORS.text}-fg}${item.issue.title}{/}`;

      // Build meta line with labels and status
      const labels = item.issue.labels.map(l => `{${COLORS.info}-fg}[${l.name}]{/}`).join(' ');
      meta = labels || '';
      if (item.hasWorktree && item.worktree) {
        meta += meta ? '  ' : '';
        meta += `{${COLORS.success}-fg}● Active{/}`;
        if (item.worktree.isLocked) {
          meta += ` {${COLORS.error}-fg}◆ Locked{/}`;
        }
      } else {
        meta += meta ? '  ' : '';
        meta += `{${COLORS.muted}-fg}○ No worktree{/}`;
      }

      // Get description from issue body
      if (item.issue.body) {
        description = item.issue.body;
        showDescription = true;
      }

      popup.setLabel(` {${COLORS.label}-fg}Issue{/} `);
    }

    titleBox.setContent(title);
    metaBox.setContent(meta);

    // Remove old description box if exists
    if (descriptionBox) {
      descriptionBox.destroy();
      descriptionBox = null;
    }

    // Remove old action list if exists
    if (actionList) {
      actionList.destroy();
    }

    // Calculate layout based on whether we have a description
    let actionsTop = 4;

    if (showDescription && description) {
      // Create scrollable description box - larger for better readability
      descriptionBox = blessed.box({
        parent: popup,
        top: 4,
        left: 1,
        width: '100%-4',
        height: 14,
        content: `{${COLORS.text}-fg}${description}{/}`,
        tags: true,
        scrollable: true,
        alwaysScroll: true,
        scrollbar: {
          ch: '│',
          style: {
            bg: COLORS.border,
          },
        },
        border: {
          type: 'line',
          fg: COLORS.border as any,
        },
        label: ` {${COLORS.muted}-fg}Description{/} `,
        keys: true,
        vi: true,
        mouse: true,
      });

      actionsTop = 19;
    }

    // Divider before actions
    blessed.box({
      parent: popup,
      top: actionsTop,
      left: 0,
      width: '100%-2',
      height: 1,
      content: `{${COLORS.border}-fg}${'─'.repeat(66)}{/}`,
      tags: true,
    });

    // Create action list
    const actions = buildActions(item);
    actionList = blessed.list({
      parent: popup,
      top: actionsTop + 1,
      left: 2,
      width: '100%-6',
      height: actions.length + 1,
      tags: true,
      keys: true,
      vi: true,
      mouse: true,
      style: {
        selected: {
          bg: COLORS.borderActive,
          fg: 'white',
          bold: true,
        },
        item: {
          fg: COLORS.text,
        },
      },
      items: actions.map(a => a.label),
    });

    actionList.on('select', (_el, index) => {
      const action = actions[index];
      if (action && currentItem) {
        if (action.value === 'back') {
          hide();
          onClose();
        } else {
          onAction(action.value, currentItem);
        }
      }
    });

    actionList.key(['escape', 'q'], () => {
      hide();
      onClose();
    });

    // Tab to switch focus between description and actions
    if (descriptionBox) {
      actionList.key(['tab'], () => {
        descriptionBox?.focus();
        (parent as blessed.Widgets.Screen).render();
      });

      descriptionBox.key(['tab'], () => {
        actionList?.focus();
        (parent as blessed.Widgets.Screen).render();
      });

      descriptionBox.key(['escape', 'q'], () => {
        hide();
        onClose();
      });
    }

    popup.show();
    actionList.focus();
    (parent as blessed.Widgets.Screen).render();
  }

  function hide() {
    popup.hide();
    if (descriptionBox) {
      descriptionBox.destroy();
      descriptionBox = null;
    }
    (parent as blessed.Widgets.Screen).render();
  }

  function destroy() {
    popup.destroy();
  }

  return { show, hide, destroy };
}

// Confirmation dialog
export interface ConfirmDialogOptions {
  parent: blessed.Widgets.Node;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function showConfirmDialog(options: ConfirmDialogOptions): blessed.Widgets.BoxElement {
  const { parent, title, message, onConfirm, onCancel } = options;

  const dialog = blessed.box({
    parent,
    top: 'center',
    left: 'center',
    width: 45,
    height: 10,
    border: {
      type: 'line',
      fg: COLORS.warning as any,
    },
    style: {
      bg: 'black',
    },
    tags: true,
    label: ` {${COLORS.warning}-fg}${title}{/} `,
    shadow: true,
  });

  blessed.box({
    parent: dialog,
    top: 1,
    left: 1,
    width: '100%-4',
    height: 2,
    content: `{center}${message}{/center}`,
    tags: true,
  });

  const btnList = blessed.list({
    parent: dialog,
    top: 4,
    left: 'center',
    width: 25,
    height: 4,
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    style: {
      selected: {
        bg: COLORS.borderActive,
        fg: 'white',
        bold: true,
      },
    },
    items: [`{${COLORS.success}-fg}▸{/} Yes`, `{${COLORS.error}-fg}▸{/} No`],
  });

  btnList.on('select', (_el, index) => {
    dialog.destroy();
    (parent as blessed.Widgets.Screen).render();
    // Delay callback to prevent key event from propagating
    setTimeout(() => {
      if (index === 0) {
        onConfirm();
      } else {
        onCancel();
      }
    }, 50);
  });

  btnList.key(['escape', 'n'], () => {
    dialog.destroy();
    (parent as blessed.Widgets.Screen).render();
    setTimeout(() => onCancel(), 50);
  });

  btnList.key(['y'], () => {
    dialog.destroy();
    (parent as blessed.Widgets.Screen).render();
    setTimeout(() => onConfirm(), 50);
  });

  btnList.focus();
  (parent as blessed.Widgets.Screen).render();

  return dialog;
}

// Text input dialog
export interface TextInputDialogOptions {
  parent: blessed.Widgets.Node;
  title: string;
  label: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}

export function showTextInputDialog(options: TextInputDialogOptions): blessed.Widgets.BoxElement {
  const { parent, title, label, onSubmit, onCancel } = options;

  const dialog = blessed.box({
    parent,
    top: 'center',
    left: 'center',
    width: 50,
    height: 9,
    border: {
      type: 'line',
      fg: COLORS.borderActive as any,
    },
    style: {
      bg: 'black',
    },
    tags: true,
    label: ` {${COLORS.label}-fg}${title}{/} `,
    shadow: true,
  });

  blessed.box({
    parent: dialog,
    top: 1,
    left: 1,
    width: '100%-4',
    height: 1,
    content: `{${COLORS.text}-fg}${label}{/}`,
    tags: true,
  });

  const input = blessed.textbox({
    parent: dialog,
    top: 3,
    left: 1,
    width: '100%-4',
    height: 3,
    border: {
      type: 'line',
      fg: COLORS.border as any,
    },
    style: {
      focus: {
        border: {
          fg: COLORS.borderActive,
        },
      },
    },
    inputOnFocus: true,
  });

  blessed.box({
    parent: dialog,
    top: 6,
    left: 1,
    width: '100%-4',
    height: 1,
    content: `{${COLORS.muted}-fg}Enter: Submit  Esc: Cancel{/}`,
    tags: true,
  });

  input.on('submit', (value) => {
    dialog.destroy();
    (parent as blessed.Widgets.Screen).render();
    // Delay callback to prevent key event from propagating
    setTimeout(() => onSubmit(value), 50);
  });

  input.key(['escape'], () => {
    dialog.destroy();
    (parent as blessed.Widgets.Screen).render();
    setTimeout(() => onCancel(), 50);
  });

  input.focus();
  (parent as blessed.Widgets.Screen).render();

  return dialog;
}

// Progress dialog
export interface ProgressDialogOptions {
  parent: blessed.Widgets.Node;
  title: string;
}

export interface ProgressDialog {
  update: (message: string, current?: number, total?: number) => void;
  close: () => void;
}

export function showProgressDialog(options: ProgressDialogOptions): ProgressDialog {
  const { parent, title } = options;

  const dialog = blessed.box({
    parent,
    top: 'center',
    left: 'center',
    width: 45,
    height: 7,
    border: {
      type: 'line',
      fg: COLORS.borderActive as any,
    },
    style: {
      bg: 'black',
    },
    tags: true,
    label: ` {${COLORS.label}-fg}${title}{/} `,
    shadow: true,
  });

  const messageBox = blessed.box({
    parent: dialog,
    top: 1,
    left: 1,
    width: '100%-4',
    height: 1,
    content: `{center}{${COLORS.muted}-fg}Loading...{/}{/center}`,
    tags: true,
  });

  const progressBox = blessed.box({
    parent: dialog,
    top: 3,
    left: 1,
    width: '100%-4',
    height: 1,
    content: '',
    tags: true,
  });

  (parent as blessed.Widgets.Screen).render();

  return {
    update: (message: string, current?: number, total?: number) => {
      messageBox.setContent(`{center}${message}{/center}`);
      if (current !== undefined && total !== undefined) {
        const pct = Math.round((current / total) * 100);
        const width = 30;
        const filled = Math.round((pct / 100) * width);
        const empty = width - filled;
        progressBox.setContent(
          `{center}{${COLORS.success}-fg}${'█'.repeat(filled)}{/}{${COLORS.border}-fg}${'░'.repeat(empty)}{/} ${pct}%{/center}`
        );
      }
      (parent as blessed.Widgets.Screen).render();
    },
    close: () => {
      dialog.destroy();
      (parent as blessed.Widgets.Screen).render();
    },
  };
}

// Message dialog
export interface MessageDialogOptions {
  parent: blessed.Widgets.Node;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

export function showMessageDialog(options: MessageDialogOptions): blessed.Widgets.BoxElement {
  const { parent, title, message, type, onClose } = options;

  const color = type === 'success' ? COLORS.success : type === 'error' ? COLORS.error : COLORS.info;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';

  const dialog = blessed.box({
    parent,
    top: 'center',
    left: 'center',
    width: 60,
    height: 10,
    border: {
      type: 'line',
      fg: color as any,
    },
    style: {
      bg: 'black',
    },
    tags: true,
    label: ` {${color}-fg}${title}{/} `,
    shadow: true,
    // Make dialog focusable to capture key events
    keys: true,
    keyable: true,
  });

  blessed.box({
    parent: dialog,
    top: 1,
    left: 1,
    width: '100%-4',
    height: 1,
    content: `{center}{bold}{${color}-fg}${icon}{/}{/center}`,
    tags: true,
  });

  blessed.box({
    parent: dialog,
    top: 3,
    left: 1,
    width: '100%-4',
    height: 4,
    content: `{center}{${COLORS.text}-fg}${message}{/}{/center}`,
    tags: true,
  });

  blessed.box({
    parent: dialog,
    top: 7,
    left: 1,
    width: '100%-4',
    height: 1,
    content: `{center}{${COLORS.muted}-fg}Press space to continue{/}{/center}`,
    tags: true,
  });

  const screen = parent as blessed.Widgets.Screen;

  // Handle key events on the dialog itself to prevent propagation
  dialog.key(['space', 'escape', 'q'], () => {
    dialog.destroy();
    screen.render();
    // Delay onClose to prevent any event propagation issues
    setTimeout(() => {
      onClose();
    }, 50);
  });

  // Also handle Enter but don't close - just consume the event
  dialog.key(['return', 'enter'], () => {
    // Do nothing - just consume the Enter key to prevent it from reaching lists behind
  });

  dialog.focus();
  screen.render();

  return dialog;
}
