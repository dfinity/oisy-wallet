import { createQueryAndUpdateWithWarmup } from '$lib/services/query.services';
import { mockIdentity } from '$tests/mocks/identity.mock';
import { queryAndUpdate, type QueryAndUpdateParams } from '@dfinity/utils';

vi.mock('@dfinity/utils', async () => {
	const mod = await vi.importActual<object>('@dfinity/utils');
	return {
		...mod,
		queryAndUpdate: vi.fn()
	};
});

describe('query.services', () => {
	describe('createQueryAndUpdateWithWarmup', () => {
		const warmupMs = 5_000;

		const request = vi.fn().mockResolvedValue(true);
		const onLoad = vi.fn();

		const params: QueryAndUpdateParams<boolean> = {
			request,
			onLoad,
			identity: mockIdentity
		};

		beforeEach(() => {
			vi.clearAllMocks();
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-01-20T10:00:00.000Z'));
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should use "query" strategy during warmup period', async () => {
			const qau = createQueryAndUpdateWithWarmup({ warmupMs });

			// Within warmup
			await qau(params);

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'query'
			});

			vi.clearAllMocks();

			// Still within warmup
			vi.advanceTimersByTime(10);

			await qau(params);

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'query'
			});
		});

		it('should use provided params.strategy after warmup period', async () => {
			const qau = createQueryAndUpdateWithWarmup({ warmupMs });

			// Move time past warmup
			vi.advanceTimersByTime(warmupMs + 1);

			await qau({ ...params, strategy: 'update' });

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'update'
			});
		});

		it('should default to "update" after warmup when params.strategy is undefined', async () => {
			const qau = createQueryAndUpdateWithWarmup({ warmupMs });

			vi.advanceTimersByTime(warmupMs + 10);

			await qau(params);

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'update'
			});
		});

		it('should respect a custom warmupMs value', async () => {
			const warmupMs = 250;
			const qau = createQueryAndUpdateWithWarmup({ warmupMs });

			// Still inside warmup
			vi.advanceTimersByTime(warmupMs - 5);

			await qau(params);

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'query'
			});

			vi.clearAllMocks();

			// Past warmup now
			vi.advanceTimersByTime(10);

			await qau(params);

			expect(queryAndUpdate).toHaveBeenCalledExactlyOnceWith({
				...params,
				strategy: 'update'
			});
		});
	});
});
