import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store/state.js';
import { fetchOpenIssues } from '../services/github.js';
import { listWorktrees } from '../services/git.js';

interface UsePollingOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Hook to poll GitHub issues and worktrees at regular intervals
 */
export function usePolling(options: UsePollingOptions = {}) {
  const { intervalMs = 60000, enabled = true } = options;
  const {
    setIssues,
    setWorktrees,
    setLastSync,
    setIsLoadingIssues,
    setIsLoadingWorktrees,
    setError,
  } = useStore();

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  const { config } = useStore();

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      setIsLoadingIssues(true);
      setIsLoadingWorktrees(true);

      // Only fetch issues if GitHub integration is enabled
      const issuesPromise = config.githubIssuesEnabled
        ? fetchOpenIssues().catch(() => [])
        : Promise.resolve([]);

      const [issues, worktrees] = await Promise.all([
        issuesPromise,
        listWorktrees().catch(() => []),
      ]);

      if (!isMountedRef.current) return;

      setIssues(issues);
      setWorktrees(worktrees);
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Refresh failed: ${message}`);
    } finally {
      if (isMountedRef.current) {
        setIsLoadingIssues(false);
        setIsLoadingWorktrees(false);
      }
    }
  }, [config.githubIssuesEnabled, setIssues, setWorktrees, setLastSync, setIsLoadingIssues, setIsLoadingWorktrees, setError]);

  // Initial fetch on mount
  useEffect(() => {
    isMountedRef.current = true;
    refresh();

    return () => {
      isMountedRef.current = false;
    };
  }, [refresh]);

  // Set up polling interval
  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(refresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refresh, intervalMs, enabled]);

  return { refresh };
}

/**
 * Hook to refresh just the worktrees list
 */
export function useRefreshWorktrees() {
  const { setWorktrees, setIsLoadingWorktrees, setError } = useStore();

  return useCallback(async () => {
    try {
      setIsLoadingWorktrees(true);
      const worktrees = await listWorktrees();
      setWorktrees(worktrees);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to refresh worktrees: ${message}`);
    } finally {
      setIsLoadingWorktrees(false);
    }
  }, [setWorktrees, setIsLoadingWorktrees, setError]);
}
