import { exec, type ExecException } from 'child_process';

// Example Command + CommandRunner types
export interface Command {
	toString(): string;
}

export interface CommandRunner {
	exec(args: { command: Command }): Promise<string>;
}

// 1) Wrap 'exec' in a promise
function execPromise({
	command
}: {
	command: string;
}): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		// eslint-disable-next-line local-rules/prefer-object-params
		exec(command, (error: ExecException | null, stdout: string, stderr: string) => {
			if (error) {
				reject(new Error(stderr));
			} else {
				resolve({ stdout, stderr });
			}
		});
	});
}

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
export function createCommandRunner(): CommandRunner {
	return new LocalCommandRunner();
}