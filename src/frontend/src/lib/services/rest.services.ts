export type RestRequestOnSuccess<R> = (response: R) => void;

export type RestRequestOnError<E = unknown> = (error: E) => void;

export type RestRequestOnRetry<E = unknown> = (options: { error: E; retryCount: number }) => void;

export interface RestRequestParams<R, E = unknown> {
	request: () => Promise<R>;
	onSuccess: RestRequestOnSuccess<R>;
	onError?: RestRequestOnError<E>;
	onRetry?: RestRequestOnRetry<E>;
	maxRetries?: number;
}

/**
 *
 */
export const restRequest = async <R, E = unknown>({
	request,
	onSuccess,
	onError,
	onRetry,
	maxRetries = 5
}: RestRequestParams<R, E>): Promise<void> => {
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await request();
			onSuccess(response);
			return;
		} catch (error) {
			retryCount++;

			if (retryCount > maxRetries) {
				onError?.(error as E);
				console.error(`Max retries reached. Error:`, error);
				return;
			}

			onRetry?.({ error: error as E, retryCount });
			console.warn(`Request attempt ${retryCount} failed. Retrying...`);
		}
	}
};
