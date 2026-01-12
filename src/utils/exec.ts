import { execa, ExecaError } from 'execa';

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export async function exec(
  command: string,
  args: string[],
  options: { cwd?: string } = {}
): Promise<ExecResult> {
  try {
    const result = await execa(command, args, {
      cwd: options.cwd,
      reject: false,
    });
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
  options: { cwd?: string } = {}
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
