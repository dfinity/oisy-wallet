import { exec, type ExecException } from 'child_process';
import Docker from 'dockerode';

// Example Command + CommandRunner types
// (Adjust these if you have them defined elsewhere)
export interface Command {
	toString(): string;
}

export interface CommandRunner {
	exec(args: { command: Command }): Promise<string>;
}

// 1) Wrap 'exec' in a promise and accept a single object parameter.
function execPromise({
	command
}: {
	command: string;
}): Promise<{ stdout: string; stderr: string }> {
	return new Promise((resolve, reject) => {
		// We must use Node's built-in signature: (command, callback)
		// So we disable the "prefer object params" rule just for this line:
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

export class LocalCommandRunner implements CommandRunner {
	async exec({ command }: { command: Command }): Promise<string> {
		try {
			const { stdout } = await execPromise({ command: command.toString() });
			return stdout;
		} catch (err: unknown) {
			// 2) Use 'unknown' instead of 'any', then narrow if needed
			if (err instanceof Error) {
				throw new Error(`Error executing command: ${err.message}`);
			}
			throw new Error(`Error executing command: ${JSON.stringify(err)}`);
		}
	}
}

export class DockerCommandExecutor implements CommandRunner {
	private containerName: string;
	private docker: Docker;

	constructor(containerName: string) {
		this.containerName = containerName;
		this.docker = new Docker();
	}

	async exec({ command }: { command: Command }): Promise<string> {
		const container = this.docker.getContainer(this.containerName);
		const exec = await container.exec({
			Cmd: command.toString().split(' '),
			AttachStdout: true,
			AttachStderr: true
		});

		const stream = await exec.start({});
		return new Promise((resolve, reject) => {
			let result = '';
			// These event signatures are from Node streams
			// and only have one parameter, so there's no multi-param issue here.
			stream.on('data', (data) => {
				result += data.toString();
			});
			stream.on('end', () => resolve(result));
			stream.on('error', reject);
		});
	}
}

// 3) Convert createCommandRunner to a single-parameter function
interface CreateCommandRunnerParams {
	environment: 'localhost' | 'docker';
	containerName?: string;
}

// 4) Use destructuring + an object param
export function createCommandRunner({
	environment,
	containerName
}: CreateCommandRunnerParams): CommandRunner {
	if (environment === 'docker' && containerName) {
		return new DockerCommandExecutor(containerName);
	}
	return new LocalCommandRunner();
}
