import { exec, type ExecException } from 'child_process';
import { promisify } from 'util';

// Example Command + CommandRunner types
export interface Command {
	toString(): string;
}

export interface CommandRunner {
	exec(args: { command: Command }): Promise<string>;
}

const execAsync = promisify(exec);

// 1) Wrap 'exec' in a promise using promisify
const execPromise = ({
	command
}: {
	command: string;
}): Promise<{ stdout: string; stderr: string }> =>
	execAsync(command).catch((err: ExecException & { stdout: string; stderr: string }) => {
		// Mimic the original error handling: reject with new Error(stderr)
		throw new Error(err.stderr);
	});

// 2) LocalCommandRunner
export class LocalCommandRunner implements CommandRunner {
	async exec({ command }: { command: Command }): Promise<string> {
		try {
			const { stdout } = await execPromise({ command: command.toString() });
			return stdout;
		} catch (err: unknown) {
			// Use String(err) for the message — JSON.stringify can itself throw (circular
			// refs, BigInt) and mask the failure. The original value is preserved via `cause`.
			const detail = err instanceof Error ? err.message : String(err);
			throw new Error(`Error executing command: ${detail}`, { cause: err });
		}
	}
}

// 3) createCommandRunner: always returns LocalCommandRunner
export const createCommandRunner = (): CommandRunner => new LocalCommandRunner();
