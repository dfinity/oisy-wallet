import { queryAndUpdate, type QueryAndUpdateParams } from '@dfinity/utils';

export const createQueryAndUpdateWithWarmup = (warmupMs = 10_000) => {
	const startTimeMs = Date.now();

	return async <R, E = unknown>(params: QueryAndUpdateParams<R, E>): Promise<void> =>
		await queryAndUpdate<R, E>({
			...params,
			strategy:
				Date.now() - startTimeMs < warmupMs ? 'query' : (params.strategy ?? 'query_and_update')
		});
};
