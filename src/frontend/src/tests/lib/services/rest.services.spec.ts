import { restRequest } from '$lib/services/rest.services';
import { expect } from 'vitest';

describe('rest.services', () => {
	describe('restRequest', () => {
		const mockSuccessfulRequest = vi.fn().mockResolvedValue('success');
		const mockFailedRequest = vi.fn().mockRejectedValue(new Error('Failed'));

		const mockOnSuccess = vi.fn();
		const mockOnError = vi.fn();
		const mockOnRetry = vi.fn();

		// we mock console.error and console.warn just to avoid unnecessary logs while running the tests
		vi.spyOn(console, 'error').mockImplementation(() => undefined);
		vi.spyOn(console, 'warn').mockImplementation(() => undefined);

		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('should call onSuccess when the request succeeds on the first try', async () => {
			await restRequest({
				request: mockSuccessfulRequest,
				onSuccess: mockOnSuccess
			});

			expect(mockSuccessfulRequest).toHaveBeenCalledTimes(1);
			expect(mockOnSuccess).toHaveBeenCalledWith('success');
		});

		it('should retry up to maxRetries and then call onError', async () => {
			const maxRetries = 3;

			await restRequest({
				request: mockFailedRequest,
				onSuccess: mockOnSuccess,
				onError: mockOnError,
				maxRetries
			});

			expect(mockFailedRequest).toHaveBeenCalledTimes(maxRetries + 1);
			expect(mockOnError).toHaveBeenCalledWith(new Error('Failed'));

			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				'Max retries reached. Error:',
				new Error('Failed')
			);
		});

		it('should call onRetry on each retry attempt', async () => {
			const mockRequest = vi
				.fn()
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockRejectedValueOnce(new Error('Second attempt failed'))
				.mockResolvedValue('success');

			await restRequest({
				request: mockRequest,
				onSuccess: mockOnSuccess,
				onRetry: mockOnRetry
			});

			expect(mockRequest).toHaveBeenCalledTimes(3);
			expect(mockOnRetry).toHaveBeenCalledTimes(2);
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('First attempt failed'),
				retryCount: 1
			});
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('Second attempt failed'),
				retryCount: 2
			});
			expect(mockOnSuccess).toHaveBeenCalledWith('success');

			expect(console.warn).toHaveBeenCalledTimes(2);
			expect(console.warn).toHaveBeenCalledWith('Request attempt 1 failed. Retrying...');
			expect(console.warn).toHaveBeenCalledWith('Request attempt 2 failed. Retrying...');
		});

		it('should stop retrying and call onError after maxRetries', async () => {
			const maxRetries = 2;

			await restRequest({
				request: mockFailedRequest,
				onSuccess: mockOnSuccess,
				onRetry: mockOnRetry,
				onError: mockOnError,
				maxRetries
			});

			expect(mockFailedRequest).toHaveBeenCalledTimes(maxRetries + 1);
			expect(mockOnRetry).toHaveBeenCalledTimes(maxRetries);
			expect(mockOnError).toHaveBeenCalledWith(new Error('Failed'));
		});

		it('should not retry if maxRetries is set to 0', async () => {
			await restRequest({
				request: mockFailedRequest,
				onSuccess: mockOnSuccess,
				onError: mockOnError,
				onRetry: mockOnRetry,
				maxRetries: 0
			});

			expect(mockFailedRequest).toHaveBeenCalledTimes(1);
			expect(mockOnError).toHaveBeenCalledWith(new Error('Failed'));
			expect(mockOnRetry).not.toHaveBeenCalled();

			expect(console.error).toHaveBeenCalled();
			expect(console.error).toHaveBeenCalledWith(
				'Max retries reached. Error:',
				new Error('Failed')
			);
			expect(console.warn).not.toHaveBeenCalled();
		});

		it('should handle optional onError gracefully when maxRetries is exceeded', async () => {
			await restRequest({
				request: mockFailedRequest,
				onSuccess: mockOnSuccess,
				maxRetries: 1
			});

			expect(mockFailedRequest).toHaveBeenCalledTimes(2);
		});

		it('should succeed after retries if a later attempt is successful', async () => {
			const mockRequest = vi
				.fn()
				.mockRejectedValueOnce(new Error('First attempt failed'))
				.mockResolvedValue('success');

			await restRequest({
				request: mockRequest,
				onSuccess: mockOnSuccess,
				onRetry: mockOnRetry,
				maxRetries: 2
			});

			expect(mockRequest).toHaveBeenCalledTimes(2);
			expect(mockOnRetry).toHaveBeenCalledTimes(1);
			expect(mockOnRetry).toHaveBeenCalledWith({
				error: new Error('First attempt failed'),
				retryCount: 1
			});
			expect(mockOnSuccess).toHaveBeenCalledWith('success');
		});

		it('should not call onRetry or onError if the first attempt succeeds', async () => {
			await restRequest({
				request: mockSuccessfulRequest,
				onSuccess: mockOnSuccess,
				onRetry: mockOnRetry,
				onError: mockOnError
			});

			expect(mockSuccessfulRequest).toHaveBeenCalledTimes(1);
			expect(mockOnSuccess).toHaveBeenCalledWith('success');
			expect(mockOnRetry).not.toHaveBeenCalled();
			expect(mockOnError).not.toHaveBeenCalled();

			expect(console.error).not.toHaveBeenCalled();
			expect(console.warn).not.toHaveBeenCalled();
		});
	});
});
