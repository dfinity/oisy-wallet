import { exec, type ExecException } from 'child_process';
import Docker from 'dockerode';

interface Command {
	toString(): string;
}

interface CommandRunner {
	exec(command: Command): Promise<string>;
}

function execPromise({ command }: { command: string }): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, (error: ExecException | null, stdout: string, stderr: string) => {
      if (error) {
        // If there's an error, reject with the stderr so we can handle it in the caller.
        reject(new Error(stderr));
      } else {
        // Otherwise, resolve with stdout and stderr.
        resolve({ stdout, stderr });
      }
    });
  });
}

class LocalCommandRunner implements CommandRunner {
  async exec({ command }: { command: Command }): Promise<string> {
    try {
      // 3. Use async/await to call the helper.
      const { stdout } = await execPromise({ command: command.toString() });
      // Return the stdout just like your original code would do.
      return stdout;
    } catch (err: any) {
      // If execPromise rejected, throw a friendlier error message
      throw new Error(`Error executing command: ${err.message}`);
    }
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
	}
	return new LocalCommandRunner();
}

export { DockerCommandExecutor, LocalCommandRunner, createCommandRunner };
export type { Command, CommandRunner };
