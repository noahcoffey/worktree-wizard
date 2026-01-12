import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { GitHubIssue } from '../services/github.js';
import type { Worktree } from '../services/git.js';
import type { WizardConfig } from '../config/types.js';

interface AppState {
  // Config
  config: WizardConfig;
  // Data
  issues: GitHubIssue[];
  worktrees: Worktree[];
  lastSync: Date | null;

  // Loading states
  isLoadingIssues: boolean;
  isLoadingWorktrees: boolean;

  // Error states
  error: string | null;

  // Actions
  setIssues: (issues: GitHubIssue[]) => void;
  setWorktrees: (worktrees: Worktree[]) => void;
  setLastSync: (date: Date) => void;
  setIsLoadingIssues: (loading: boolean) => void;
  setIsLoadingWorktrees: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const StateContext = createContext<AppState | null>(null);

interface StateProviderProps {
  children: ReactNode;
  config: WizardConfig;
}

export function StateProvider({ children, config }: StateProviderProps) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [worktrees, setWorktrees] = useState<Worktree[]>([]);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isLoadingIssues, setIsLoadingIssues] = useState(false);
  const [isLoadingWorktrees, setIsLoadingWorktrees] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  const value: AppState = {
    config,
    issues,
    worktrees,
    lastSync,
    isLoadingIssues,
    isLoadingWorktrees,
    error,
    setIssues,
    setWorktrees,
    setLastSync,
    setIsLoadingIssues,
    setIsLoadingWorktrees,
    setError,
    clearError,
  };

  return React.createElement(StateContext.Provider, { value }, children);
}

export function useStore(): AppState {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useStore must be used within a StateProvider');
  }
  return context;
}

/**
 * Get the current configuration
 */
export function useConfig(): WizardConfig {
  const { config } = useStore();
  return config;
}

/**
 * Get only the issue worktrees (not main/master)
 */
export function useIssueWorktrees(): Worktree[] {
  const { worktrees } = useStore();
  return worktrees.filter((wt) => !wt.isMain);
}

/**
 * Get worktree for a specific issue number
 */
export function useWorktreeForIssue(issueNumber: number): Worktree | undefined {
  const { worktrees } = useStore();
  return worktrees.find((wt) => wt.issueNumber === issueNumber);
}
