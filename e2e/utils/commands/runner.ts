import { exec } from 'child_process';
import Docker from 'dockerode';

interface Command {
	toString(): string;
}

interface CommandRunner {
	exec(command: Command): Promise<string>;
}

class LocalCommandRunner implements CommandRunner {
	async exec(command: Command): Promise<string> {
		return new Promise((resolve, reject) => {
			exec(command.toString(), (error, stdout, stderr) => {
				if (error) {
					reject(`Error executing command: ${stderr}`);
				} else {
					resolve(stdout);
				}
			});
		});
	}
}

class DockerCommandExecutor implements CommandRunner {
	private containerName: string;
	private docker: Docker;

	constructor(containerName: string) {
		this.containerName = containerName;
		this.docker = new Docker();
	}

	async exec(command: Command): Promise<string> {
		const container = this.docker.getContainer(this.containerName);
		const exec = await container.exec({
			Cmd: command.toString().split(' '),
			AttachStdout: true,
			AttachStderr: true
		});

		const stream = await exec.start({});
		return new Promise((resolve, reject) => {
			let result = '';
			stream.on('data', (data) => (result += data.toString()));
			stream.on('end', () => resolve(result));
			stream.on('error', reject);
		});
	}
}

function createCommandRunner(
	environment: 'localhost' | 'docker',
	containerName?: string
): CommandRunner {
	if (environment === 'docker' && containerName) {
		return new DockerCommandExecutor(containerName);
	} else {
		return new LocalCommandRunner();
	}
}

export { DockerCommandExecutor, LocalCommandRunner, createCommandRunner };
export type { Command, CommandRunner };
