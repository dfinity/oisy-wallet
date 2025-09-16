import { retry, retryWithDelay } from '$lib/services/rest.services';
import { randomWait } from '$lib/utils/time.utils';

vi.mock('$lib/utils/time.utils', () => ({
	randomWait: vi.fn()
}));

describe('rest.services', () => {
	describe('retry', () => {
		const mockResult = 'success';
		const mockError = new Error('Failed');

		const mockSuccessfulRequest = vi.fn().mockResolvedValue(mockResult);
		const mockFailedRequest = vi.fn().mockRejectedValue(mockError);
		const mockOnRetry = vi.fn();

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the request function when the request succeeds on the first try', async () => {
			await retry({
				request: mockSuccessfulRequest
			});

			expect(mockSuccessfulRequest).toHaveBeenCalledOnce();
		});

		it('should return the result of the request when the request succeeds on the first try', async () => {
			const result = await retry({
				request: mockSuccessfulRequest
			});

			expect(result).toEqual(mockResult);
		});

		it('should retry up to maxRetries and then call raise an error', async () => {
			const maxRetries = 3;

			await expect(
				async () =>
					await retry({
						request: mockFailedRequest,
						maxRetries
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledTimes(maxRetries + 1);

			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Max retries reached. Error:', mockError);
		});

		it('should call onRetry on each retry attempt', async () => {
			const mockRequest = vi
				.fn()
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockRejectedValueOnce(new Error('Second attempt failed'))
				.mockResolvedValue(mockResult);

			const result = await retry({
				request: mockRequest,
				onRetry: mockOnRetry
			});

			expect(result).toEqual(mockResult);

			expect(mockRequest).toHaveBeenCalledTimes(3);
			expect(mockOnRetry).toHaveBeenCalledTimes(2);
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('First attempt failed'),
				retryCount: 0
			});
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('Second attempt failed'),
				retryCount: 1
			});
		});

		it('should stop retrying and raise an error after maxRetries', async () => {
			const maxRetries = 2;

			await expect(
				async () =>
					await retry({
						request: mockFailedRequest,
						onRetry: mockOnRetry,
						maxRetries
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledTimes(maxRetries + 1);
			expect(mockOnRetry).toHaveBeenCalledTimes(maxRetries);
		});

		it('should not retry if maxRetries is set to 0', async () => {
			await expect(
				async () =>
					await retry({
						request: mockFailedRequest,
						onRetry: mockOnRetry,
						maxRetries: 0
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledOnce();
			expect(mockOnRetry).not.toHaveBeenCalled();

			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Max retries reached. Error:', mockError);
			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should succeed after retries if a later attempt is successful', async () => {
			const mockRequest = vi
				.fn()
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockResolvedValue(mockResult);

			const result = await retry({
				request: mockRequest,
				onRetry: mockOnRetry,
				maxRetries: 2
			});

			expect(result).toEqual(mockResult);

			expect(mockRequest).toHaveBeenCalledTimes(2);
			expect(mockOnRetry).toHaveBeenCalledOnce();
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('First attempt failed'),
				retryCount: 0
			});
		});

		it('should not call onRetry', async () => {
			const result = await retry({
				request: mockSuccessfulRequest,
				onRetry: mockOnRetry
			});

			expect(result).toEqual(mockResult);

			expect(mockSuccessfulRequest).toHaveBeenCalledOnce();
			expect(mockOnRetry).not.toHaveBeenCalled();

			expect(console.error).not.toHaveBeenCalled();
			expect(console.warn).not.toHaveBeenCalled();
		});
	});

	describe('retryWithDelay', () => {
		const mockResult = 'success';
		const mockError = new Error('Failed');

		const mockSuccessfulRequest = vi.fn().mockResolvedValue(mockResult);
		const mockFailedRequest = vi.fn().mockRejectedValue(mockError);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call the request function when the request succeeds on the first try', async () => {
			await retryWithDelay({
				request: mockSuccessfulRequest
			});

			expect(mockSuccessfulRequest).toHaveBeenCalledOnce();
		});

		it('should return the result of the request when the request succeeds on the first try', async () => {
			const result = await retryWithDelay({
				request: mockSuccessfulRequest
			});

			expect(result).toEqual(mockResult);
		});

		it('should retry up to maxRetries and then call raise an error', async () => {
			const maxRetries = 3;

			await expect(
				async () =>
					await retryWithDelay({
						request: mockFailedRequest,
						maxRetries
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledTimes(maxRetries + 1);

			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Max retries reached. Error:', mockError);
		});

		it('should call randomWait after each failed attempt', async () => {
			await expect(
				async () =>
					await retryWithDelay({
						request: mockFailedRequest,
						maxRetries: 2
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledTimes(3);
			expect(randomWait).toHaveBeenCalledTimes(2);

			expect(console.warn).toHaveBeenCalledTimes(2);
			expect(console.warn).toHaveBeenCalledWith('Request attempt 1 failed. Retrying...');
			expect(console.warn).toHaveBeenCalledWith('Request attempt 2 failed. Retrying...');
		});

		it('should not retry if maxRetries is set to 0', async () => {
			await expect(
				async () =>
					await retryWithDelay({
						request: mockFailedRequest,
						maxRetries: 0
					})
			).rejects.toThrow(mockError);

			expect(mockFailedRequest).toHaveBeenCalledOnce();
			expect(randomWait).not.toHaveBeenCalled();
			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith('Max retries reached. Error:', mockError);
			expect(console.warn).not.toHaveBeenCalled();
		});
	});
});
