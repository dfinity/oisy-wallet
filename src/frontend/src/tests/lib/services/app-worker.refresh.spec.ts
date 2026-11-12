import { AppWorker } from '$lib/services/_worker.services';
import { mock } from 'vitest-mock-extended';

class RefreshWorker extends AppWorker {
	protected override stopTimer = () => {};
	constructor(worker: Worker) {
		super({ worker });
	}
	refresh(signal: AbortSignal) {
		return this.postMessageAndWait({ message: { msg: 'triggerIcpWalletTimer' }, signal });
	}
}

describe('worker refresh completion', () => {
	const events = new EventTarget();
	const worker = mock<Worker>();
	const controller = new AbortController();
	let first: RefreshWorker;
	let second: RefreshWorker;
	const reply = ({
		workerId,
		requestId,
		success = true
	}: {
		workerId: string;
		requestId: string;
		success?: boolean;
	}) =>
		events.dispatchEvent(
			new MessageEvent('message', {
				data: {
					msg: 'workerRefreshFinished',
					workerId,
					requestId,
					success
				}
			})
		);

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		worker.addEventListener.mockImplementation(events.addEventListener.bind(events));
		worker.removeEventListener.mockImplementation(events.removeEventListener.bind(events));
		first = new RefreshWorker(worker);
		second = new RefreshWorker(worker);
	});

	afterEach(() => {
		first.terminate();
		second.terminate();
		vi.useRealTimers();
	});

	it('matches both request and owner in a pooled worker; no balance change is required', async () => {
		const one = first.refresh(controller.signal);
		const two = second.refresh(controller.signal);
		const [firstCall, secondCall] = worker.postMessage.mock.calls;
		const settled = vi.fn();
		void one.then(settled);
		reply({ ...firstCall[0], requestId: secondCall[0].requestId });
		await Promise.resolve();

		expect(settled).not.toHaveBeenCalled();

		reply(firstCall[0]);
		await one;

		expect(settled).toHaveBeenCalledOnce();

		reply(secondCall[0]);
		await two;

		expect(worker.removeEventListener).toHaveBeenCalledTimes(2);
	});

	it('rejects provider failure reported by the correlated response', async () => {
		const result = first.refresh(controller.signal);
		const outcome = result.catch((error: unknown) => error);
		reply({ ...worker.postMessage.mock.calls[0][0], success: false });

		await expect(outcome).resolves.toMatchObject({ message: 'Worker refresh failed' });
	});

	it('removes response listeners when cancelled, and ignores a late reply', async () => {
		const cancellation = new AbortController();
		const result = first.refresh(cancellation.signal);
		const outcome = result.catch((error: unknown) => error);
		cancellation.abort();

		await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });

		expect(worker.removeEventListener).toHaveBeenCalledOnce();

		reply(worker.postMessage.mock.calls[0][0]);
	});

	it('rejects outstanding work when a worker is destroyed', async () => {
		const result = first.refresh(controller.signal);
		const outcome = result.catch((error: unknown) => error);
		first.terminate();

		await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
	});

	it('rejects all outstanding refreshes on session teardown', async () => {
		const result = first.refresh(controller.signal);
		const outcome = result.catch((error: unknown) => error);
		AppWorker.terminateAllWorkers();

		await expect(outcome).resolves.toMatchObject({ name: 'AbortError' });
	});
});
