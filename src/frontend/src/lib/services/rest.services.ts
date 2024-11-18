export interface RestRequestParams<Response, Error = unknown, Success = void> {
	request: () => Promise<Response>;
	onSuccess: (response: Response) => Success | undefined;
	onError?: (error: Error) => Success | undefined;
	onRetry?: (options: { error: Error; retryCount: number }) => Promise<void>;
	maxRetries?: number;
}

/**
 *
 */
export const restRequest = async <Response, Error, Success>({
	request,
	onSuccess,
	onError,
	onRetry,
	maxRetries = 10
}: RestRequestParams<Response, Error, Success>): Promise<Success | undefined> => {
	let retryCount = 0;

	while (retryCount <= maxRetries) {
		try {
			const response = await request();
			return onSuccess(response);
		} catch (error) {
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
