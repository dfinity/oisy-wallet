export interface RestRequestParams<R, E = unknown, S = void> {
	request: () => Promise<R>;
	onSuccess: (response: R) => S | undefined;
	onError?: (error: E) => S | undefined;
	onRetry?: (options: { error: E; retryCount: number }) => Promise<void>;
	maxRetries?: number;
}

/**
 *
 */
export const restRequest = async <R, E, S>({
	request,
	onSuccess,
	onError,
	onRetry,
	maxRetries = 10
}: RestRequestParams<R, E, S>): Promise<S | undefined> => {
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await request();
			return onSuccess(response);
		} catch (error) {
			retryCount++;

			if (retryCount > maxRetries) {
				console.error(`Max retries reached. Error:`, error);
				return onError?.(error as E);
			}

			await onRetry?.({ error: error as E, retryCount });
			console.warn(`Request attempt ${retryCount} failed. Retrying...`);
		}
	}
};
