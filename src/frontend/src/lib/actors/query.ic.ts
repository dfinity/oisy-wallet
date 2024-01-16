import type { OptionIdentity } from '$lib/types/identity';

export type QueryAndUpdateOnResponse<R> = (options: { certified: boolean; response: R }) => void;

export type QueryAndUpdateOnError<E = unknown> = (options: {
	certified: boolean;
	error: E;
	// The identity used for the request
	identity: OptionIdentity;
}) => void;

export type QueryAndUpdateStrategy = 'query_and_update' | 'query' | 'update';

export type QueryAndUpdatePromiseResolution = 'all_settled' | 'race';

export interface QueryAndUpdateRequestParams {
	certified: boolean;
	identity: OptionIdentity;
}

/**
 * Perform a query and an update for security reasons.
 * For example, malicious nodes can forge transactions and balance if no update is performed to certify the results.
 */
export const queryAndUpdate = async <R, E = unknown>({
	request,
	onLoad,
	onError,
	strategy = 'query_and_update',
	identity,
	resolution = 'race'
}: {
	request: (options: QueryAndUpdateRequestParams) => Promise<R>;
	onLoad: QueryAndUpdateOnResponse<R>;
	onError?: QueryAndUpdateOnError<E>;
	strategy?: QueryAndUpdateStrategy;
	identity: OptionIdentity;
	resolution?: QueryAndUpdatePromiseResolution;
}): Promise<void> => {
	let certifiedDone = false;

	const queryOrUpdate = (certified: boolean) =>
		request({ certified, identity })
			.then((response) => {
				if (certifiedDone) {
					return;
				}

				onLoad({ certified, response });
			})
			.catch((error: E) => {
				if (certifiedDone) {
					return;
				}

				onError?.({ certified, error, identity });
			})
			.finally(() => (certifiedDone = certifiedDone || certified));

	let requests: Array<Promise<void>>;

	if (strategy === 'query') {
		requests = [queryOrUpdate(false)];
	} else if (strategy === 'update') {
		requests = [queryOrUpdate(true)];
	} else {
		requests = [queryOrUpdate(false), queryOrUpdate(true)];
	}

	await (resolution === 'all_settled' ? Promise.allSettled(requests) : Promise.race(requests));
};
