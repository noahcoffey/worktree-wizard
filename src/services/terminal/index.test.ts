import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WizardConfig } from '../../config/types.js';
import { DEFAULT_CONFIG } from '../../config/types.js';

// Create mock adapter instances
const mockITermAdapter = {
  name: 'iTerm2',
  isAvailable: vi.fn(),
  openWindow: vi.fn(),
  closeByTitle: vi.fn(),
};

const mockTerminalAppAdapter = {
  name: 'Terminal.app',
  isAvailable: vi.fn(),
  openWindow: vi.fn(),
  closeByTitle: vi.fn(),
};

// Mock the adapter classes with proper class syntax
vi.mock('./iterm.js', () => ({
  ITermAdapter: class {
    name = mockITermAdapter.name;
    isAvailable = mockITermAdapter.isAvailable;
    openWindow = mockITermAdapter.openWindow;
    closeByTitle = mockITermAdapter.closeByTitle;
  },
}));

vi.mock('./terminal-app.js', () => ({
  TerminalAppAdapter: class {
    name = mockTerminalAppAdapter.name;
    isAvailable = mockTerminalAppAdapter.isAvailable;
    openWindow = mockTerminalAppAdapter.openWindow;
    closeByTitle = mockTerminalAppAdapter.closeByTitle;
  },
}));

// Import after mocks are set up
import { getTerminalAdapter, getAvailableAdapters } from './index.js';

describe('getTerminalAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns ITermAdapter for iterm config', () => {
    const config: WizardConfig = {
      ...DEFAULT_CONFIG,
      terminalType: 'iterm',
    };

    const adapter = getTerminalAdapter(config);

    expect(adapter.name).toBe('iTerm2');
  });

  it('returns TerminalAppAdapter for terminal config', () => {
    const config: WizardConfig = {
      ...DEFAULT_CONFIG,
      terminalType: 'terminal',
    };

    const adapter = getTerminalAdapter(config);

    expect(adapter.name).toBe('Terminal.app');
  });

  it('throws error for unknown terminal type', () => {
    const config = {
      ...DEFAULT_CONFIG,
      terminalType: 'unknown' as any,
    };

    expect(() => getTerminalAdapter(config)).toThrow('Unknown terminal type: unknown');
  });
});

describe('getAvailableAdapters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only available adapters', async () => {
    mockITermAdapter.isAvailable.mockResolvedValue(true);
    mockTerminalAppAdapter.isAvailable.mockResolvedValue(false);

    const adapters = await getAvailableAdapters();

    expect(adapters).toHaveLength(1);
    expect(adapters[0].name).toBe('iTerm2');
  });

  it('returns all adapters when all available', async () => {
    mockITermAdapter.isAvailable.mockResolvedValue(true);
    mockTerminalAppAdapter.isAvailable.mockResolvedValue(true);

    const adapters = await getAvailableAdapters();

    expect(adapters).toHaveLength(2);
  });

  it('returns empty array when none available', async () => {
    mockITermAdapter.isAvailable.mockResolvedValue(false);
    mockTerminalAppAdapter.isAvailable.mockResolvedValue(false);

    const adapters = await getAvailableAdapters();

    expect(adapters).toHaveLength(0);
  });
});
