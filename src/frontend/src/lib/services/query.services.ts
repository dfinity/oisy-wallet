import {
	queryAndUpdate,
	type QueryAndUpdateParams,
	type QueryAndUpdateStrategy
} from '@dfinity/utils';

/**
 * Creates a wrapper around {@link queryAndUpdate} that applies a warmup period.
 *
 * During the warmup period (the first {@link warmupMs} milliseconds after the
 * wrapper is created), all calls are forced to use the `'query'` strategy to
 * avoid triggering updates while the application or canister is starting up.
 * After the warmup period elapses, the wrapper uses the strategy provided in
 * {@link QueryAndUpdateParams.strategy}, defaulting to `'update'` when none
 * is specified.
 *
 * @param params - Configuration parameters.
 * @param params.warmupMs - Length of the warmup period in milliseconds. Calls made
 *   before this duration has passed since the wrapper's creation are executed
 *   with the `'query'` strategy. Defaults to 10_000 (10 seconds).
 * @param params.defaultStrategy - Default strategy to use after the warmup period
 *   if none is specified in the call parameters. Defaults to `'update'`.
 * @returns A function that forwards its parameters to {@link queryAndUpdate},
 *   automatically selecting the appropriate strategy based on the elapsed
 *   time since the wrapper was created.
 */
export const createQueryAndUpdateWithWarmup = ({
	warmupMs = 10_000,
	defaultStrategy = 'update'
}: { warmupMs?: number; defaultStrategy?: QueryAndUpdateStrategy } = {}) => {
	const startTimeMs = Date.now();

	return async <R, E = unknown>(params: QueryAndUpdateParams<R, E>): Promise<void> =>
		await queryAndUpdate<R, E>({
			...params,
			strategy: Date.now() - startTimeMs < warmupMs ? 'query' : (params.strategy ?? defaultStrategy)
		});
};
