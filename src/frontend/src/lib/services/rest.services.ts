export interface RestRequestParams<Response, Error = unknown> {
	request: () => Promise<Response>;
	onRetry?: (options: { error: Error; retryCount: number }) => Promise<void>;
	maxRetries?: number;
}

/**
 * A utility function to make a REST request with possible retries.
 *
 * @param request - The request function to call.
 * @param onRetry - The optional function to call when the request fails and a retry is needed.
 * @param maxRetries - The maximum number of retries to attempt.
 * @returns The result of the request or it throws an error if the max retries are reached.
 */
export const restRequest = async <Response, Error>({
	request,
	onRetry,
	maxRetries = 3
}: RestRequestParams<Response, Error>): Promise<Response | undefined> => {
	const executeRequest = async (retryCount: number): Promise<Response> => {
		try {
			return await request();
		} catch (error: unknown) {
			if (retryCount >= maxRetries) {
				console.error(`Max retries reached. Error:`, error);
				throw error;
			}

			await onRetry?.({ error: error as Error, retryCount });
			console.warn(`Request attempt ${retryCount + 1} failed. Retrying...`);
			return executeRequest(retryCount + 1);
		}
	};

	return await executeRequest(0);
};
