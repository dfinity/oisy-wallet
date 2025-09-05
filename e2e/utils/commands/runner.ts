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
			if (err instanceof Error) {
				throw new Error(`Error executing command: ${err.message}`);
			}
			throw new Error(`Error executing command: ${JSON.stringify(err)}`);
		}
	}
}

// 3) createCommandRunner: always returns LocalCommandRunner
export const createCommandRunner = (): CommandRunner => new LocalCommandRunner();
