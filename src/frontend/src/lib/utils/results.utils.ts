import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { nonNullish } from '@dfinity/utils';

export const reduceResults = <T = unknown>(
	results: [ResultSuccess<T>, ...ResultSuccess<T>[]]
): ResultSuccessReduced<T> =>
	results.reduce(
		(acc, { success: s, err: e }) => ({
			success: acc.success && s,
			err: nonNullish(e) ? [...acc.err, e] : acc.err
		}),
		{ success: true as boolean, err: [] as T[] }
	);
