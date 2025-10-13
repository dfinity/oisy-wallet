export abstract class AppWorker {
	readonly #worker: Worker;

	protected constructor(worker: Worker) {
		this.#worker = worker;
	}

	static async getInstance(): Promise<Worker> {
		const Workers = await import('$lib/workers/workers?worker');
		return new Workers.default();
	}

	postMessage = <T>(data: T) => {
		this.#worker.postMessage(data);
	};

	terminate = () => {
		this.#worker.terminate();
	};
}
