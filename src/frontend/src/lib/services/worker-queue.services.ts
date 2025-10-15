export class WorkerQueue {
	#worker: Worker;
	#pending: unknown[] = [];
	#inflight = 0;
	#maxInflight = 1; // keep it 1 for strict FIFO/serialize
	#releaseDelay = 100; // ms between jobs

	constructor(worker: Worker) {
		this.#worker = worker;
	}

	send = <T>(msg: T) => {
		this.#pending.push(msg);
		this.#flush();
	};

	#flush() {
		while (this.#inflight < this.#maxInflight && this.#pending.length) {
			const next = this.#pending.shift();

			this.#worker.postMessage(next);

			this.#inflight++;

			// automatically release the slot after a delay
			setTimeout(() => {
				this.#inflight = Math.max(0, this.#inflight - 1);
				this.#flush();
			}, this.#releaseDelay);
		}
	}
}
