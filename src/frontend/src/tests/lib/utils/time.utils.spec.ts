import { randomWait } from '$lib/utils/time.utils';

describe('time.utils', () => {
	describe('randomWait', () => {
		const originalSetTimeout = global.setTimeout;
		// eslint-disable-next-line local-rules/prefer-object-params
		const setTimeoutMock = vi.fn((fn, time) => originalSetTimeout(fn, time));

		beforeEach(() => {
			vi.clearAllMocks();

			vi.stubGlobal('setTimeout', setTimeoutMock);
		});

		it('should resolve after a random amount of time within the specified range', async () => {
			const min = 1000;
			const max = 3000;

			await randomWait({ min, max });

			expect(setTimeoutMock).toHaveBeenCalled();

			const calledTime = setTimeoutMock.mock.calls[0][1] as number;

			expect(calledTime).toBeGreaterThanOrEqual(min);
			expect(calledTime).toBeLessThanOrEqual(max);

			global.setTimeout = originalSetTimeout;
		});

		it('should use default values if no min and max are provided', async () => {
			await randomWait({});

			expect(setTimeoutMock).toHaveBeenCalled();

			const calledTime = setTimeoutMock.mock.calls[0][1] as number;

			expect(calledTime).toBeGreaterThanOrEqual(1000);
			expect(calledTime).toBeLessThanOrEqual(2000);

			global.setTimeout = originalSetTimeout;
		});

		it('should not raise an error if min is greater than max', async () => {
			const min = 2000;
			const max = 1000;

			await randomWait({ min, max });

			expect(setTimeoutMock).toHaveBeenCalled();

			const calledTime = setTimeoutMock.mock.calls[0][1] as number;

			expect(calledTime).toBeGreaterThanOrEqual(max);
			expect(calledTime).toBeLessThanOrEqual(min);

			global.setTimeout = originalSetTimeout;
		});
	});
});
