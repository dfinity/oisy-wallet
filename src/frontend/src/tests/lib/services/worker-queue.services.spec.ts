import { WorkerQueue } from '$lib/services/worker-queue.services';

describe('worker-queue.services', () => {
	describe('WorkerQueue', () => {
		const interval = 100;

		class MockWorker {
			postMessage = vi.fn();
		}

		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.clearAllTimers();
			vi.useRealTimers();
			vi.restoreAllMocks();
		});

		it('should send the first message immediately and pace subsequent sends by 100ms', () => {
			const worker = new MockWorker();
			const q = new WorkerQueue(worker as unknown as Worker);

			q.send('a');
			q.send('b');
			q.send('c');

			// First immediate
			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('a');

			// Before: still only one call
			vi.advanceTimersByTime(interval - 1);

			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('a');

			// At the interval: second goes out
			vi.advanceTimersByTime(1);

			expect(worker.postMessage).toHaveBeenCalledTimes(2);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, 'b');

			// At twice the interval total: third goes out
			vi.advanceTimersByTime(interval);

			expect(worker.postMessage).toHaveBeenCalledTimes(3);
			expect(worker.postMessage).toHaveBeenNthCalledWith(3, 'c');
		});

		it('should preserve strict FIFO order under bursty sends', () => {
			const worker = new MockWorker();
			const q = new WorkerQueue(worker as unknown as Worker);

			// burst of messages
			for (let i = 0; i < 5; i++) {
				q.send(i);
			}

			// First immediate
			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith(0);

			// Walk the timer forward in interval steps
			for (let i = 1; i < 5; i++) {
				vi.advanceTimersByTime(interval);

				expect(worker.postMessage).toHaveBeenCalledTimes(i + 1);
				expect(worker.postMessage).toHaveBeenNthCalledWith(i + 1, i);
			}
		});

		it('should not send more than one message per interval window', () => {
			const worker = new MockWorker();
			const q = new WorkerQueue(worker as unknown as Worker);

			q.send('x');
			q.send('y');

			// Immediately after two sends, only one in flight has been posted
			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('x');

			// Even if more sends happen before the interval release, still only one call
			q.send('z');

			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('x');

			// After the interval a single additional message is posted
			vi.advanceTimersByTime(interval);

			expect(worker.postMessage).toHaveBeenCalledTimes(2);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, 'y');

			// After another interval the last one is posted
			vi.advanceTimersByTime(interval);

			expect(worker.postMessage).toHaveBeenCalledTimes(3);
			expect(worker.postMessage).toHaveBeenNthCalledWith(3, 'z');
		});

		it('should handle no messages gracefully', () => {
			const worker = new MockWorker();
			// Just constructing shouldn’t schedule timers or send anything
			// (no assertions needed beyond “no throw”)

			new WorkerQueue(worker as unknown as Worker);

			expect(worker.postMessage).not.toHaveBeenCalled();
		});

		it('should enqueue later and still pace correctly', () => {
			const worker = new MockWorker();
			const q = new WorkerQueue(worker as unknown as Worker);

			q.send('first');

			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('first');

			// Enqueue another after half-interval (still before release)
			vi.advanceTimersByTime(interval / 2);
			q.send('second');

			expect(worker.postMessage).toHaveBeenCalledExactlyOnceWith('first');

			// At the total interval: 'second' should go
			vi.advanceTimersByTime(interval / 2);

			expect(worker.postMessage).toHaveBeenCalledTimes(2);
			expect(worker.postMessage).toHaveBeenNthCalledWith(2, 'second');
		});
	});
});
