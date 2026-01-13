import { execa, ExecaError } from 'execa';

// Default timeout: 30 seconds
const DEFAULT_TIMEOUT_MS = 30000;

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ExecOptions {
  cwd?: string;
  timeout?: number;
}

export async function exec(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<ExecResult> {
  const { cwd, timeout = DEFAULT_TIMEOUT_MS } = options;

  try {
    const result = await execa(command, args, {
      cwd,
      reject: false,
      timeout,
    });

    // Check for timeout (with reject: false, timedOut is on result, not error)
    if (result.timedOut) {
      return {
        stdout: '',
        stderr: `Command timed out after ${timeout}ms: ${command} ${args.join(' ')}`,
        exitCode: 124, // Standard timeout exit code
      };
    }

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode ?? 0,
    };
  } catch (error) {
    const execaError = error as ExecaError;

    return {
      stdout: String(execaError.stdout ?? ''),
      stderr: String(execaError.stderr ?? execaError.message),
      exitCode: execaError.exitCode ?? 1,
    };
  }
}

export async function execOrThrow(
  command: string,
  args: string[],
  options: ExecOptions = {}
): Promise<string> {
  const result = await exec(command, args, options);
  if (result.exitCode !== 0) {
    throw new Error(result.stderr || `Command failed: ${command} ${args.join(' ')}`);
  }
  return result.stdout;
}

export async function checkDependency(command: string): Promise<boolean> {
  const result = await exec('which', [command]);
  return result.exitCode === 0;
}

export async function checkDependencies(
  commands: string[]
): Promise<{ missing: string[]; available: string[] }> {
  const results = await Promise.all(
    commands.map(async (cmd) => ({
      command: cmd,
      available: await checkDependency(cmd),
    }))
  );

  return {
    missing: results.filter((r) => !r.available).map((r) => r.command),
    available: results.filter((r) => r.available).map((r) => r.command),
  };
}
