export interface RestRequestParams<Response, Error = unknown, Success = void> {
	request: () => Promise<Response>;
	onSuccess: (response: Response) => Success | undefined;
	onError?: (error: Error) => Success | undefined;
	onRetry?: (options: { error: Error; retryCount: number }) => Promise<void>;
	maxRetries?: number;
}

/**
 * A utility function to make a REST request with possible retries.
 *
 * @param request - The request function to call.
 * @param onSuccess - The function to call when the request is successful.
 * @param onError - The optional function to call when the request fails and the max retries are reached.
 * @param onRetry - The optional function to call when the request fails and a retry is needed.
 * @param maxRetries - The maximum number of retries to attempt.
 * @returns The result of the onSuccess/onError function or undefined if the max retries are reached.
 */
export const restRequest = async <Response, Error, Success>({
	request,
	onSuccess,
	onError,
	onRetry,
	maxRetries = 3
}: RestRequestParams<Response, Error, Success>): Promise<Success | undefined> => {
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await request();
			return onSuccess(response);
		} catch (error: unknown) {
			retryCount++;

			if (retryCount > maxRetries) {
				console.error(`Max retries reached. Error:`, error);
				return onError?.(error as Error);
			}

			await onRetry?.({ error: error as Error, retryCount });
			console.warn(`Request attempt ${retryCount} failed. Retrying...`);
		}
	}
};
