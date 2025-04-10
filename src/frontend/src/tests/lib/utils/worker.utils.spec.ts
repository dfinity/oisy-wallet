import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { routeWorkerResponse, sendMessageRequest } from '$lib/utils/worker.utils';
import { z } from 'zod';

describe('worker.utils.ts', () => {
	describe('routeWorkerResponse', () => {
		const mockHandler = vi.fn();
		const validRequestId = 'test-request-id';

		beforeEach(() => {
			// Add a handler to simulate a valid scenario
			const responseHandlers = (globalThis as any).responseHandlers as Map<
				string,
				(data: unknown) => void
			>;
			responseHandlers.set(validRequestId, mockHandler);
		});

		afterEach(() => {
			vi.clearAllMocks();
			const responseHandlers = (globalThis as any).responseHandlers as Map<
				string,
				(data: unknown) => void
			>;
			responseHandlers.clear();
		});

		it('should return false if event type is missing', () => {
			const invalidEvent = { data: { type: null, requestId: validRequestId } } as MessageEvent;
			const result = routeWorkerResponse(invalidEvent);
			expect(result).toBe(false);
		});

		it('should return false if event type is not "response"', () => {
			const invalidEvent = { data: { type: 'request', requestId: validRequestId } } as MessageEvent;
			const result = routeWorkerResponse(invalidEvent);
			expect(result).toBe(false);
		});

		it('should successfully invoke handler if handler matches requestId', () => {
			const validEvent = { data: { type: 'response', requestId: validRequestId } } as MessageEvent;
			const result = routeWorkerResponse(validEvent);
			expect(mockHandler).toHaveBeenCalledWith(validEvent.data);
			expect(result).toBe(true);
		});

		it('should return false if no handler matches requestId', () => {
			const invalidEvent = {
				data: { type: 'response', requestId: 'invalid-request-id' }
			} as MessageEvent;
			const result = routeWorkerResponse(invalidEvent);
			expect(result).toBe(false);
		});
	});

	describe('sendMessageRequest', () => {
		const mockWorker = {
			postMessage: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn()
		};

		const mockSchema = z.object({
			message: z.string()
		});

		beforeEach(() => {
			// Mocking crypto.randomUUID with a valid UUID format
			vi.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue(
				'123e4567-e89b-12d3-a456-426614174000'
			);
		});

		afterEach(() => {
			vi.clearAllMocks();
		});

		it('should post the correct message to the worker', () => {
			const testData = { message: 'test-message' };
			sendMessageRequest({
				worker: mockWorker as unknown as Worker,
				msg: 'test-msg',
				data: testData,
				schema: mockSchema
			});

			expect(mockWorker.postMessage).toHaveBeenCalledWith({
				msg: 'test-msg',
				requestId: 'test-request-id',
				type: 'request',
				data: testData
			});
		});

		it('should resolve with validated response when valid data is received', async () => {
			const testData = { message: 'test-message' };

			// Simulate the worker sending back data
			const mockResponseHandler = vi.fn();
			const fakeWorkerEvent = {
				type: 'response',
				requestId: 'test-request-id',
				message: 'test-message'
			};
			vi.spyOn(mockWorker, 'addEventListener').mockImplementation((_, handler) => {
				mockResponseHandler.mockImplementation(() => {
					(handler as EventListener)({ data: fakeWorkerEvent } as unknown as Event);
				});
			});

			const promise = sendMessageRequest({
				worker: mockWorker as unknown as Worker,
				msg: 'test-msg',
				data: testData,
				schema: mockSchema
			});

			setTimeout(() => {
				mockResponseHandler();
			}, 100);

			await expect(promise).resolves.toEqual(fakeWorkerEvent);
		});

		it('should reject promise if schema validation fails', async () => {
			const testData = { message: 'test-message' };

			const mockResponseHandler = vi.fn();
			const fakeInvalidWorkerEvent = {
				type: 'response',
				requestId: 'test-request-id',
				invalidField: 'invalid-data' // does not match mockSchema
			};

			vi.spyOn(mockWorker, 'addEventListener').mockImplementation((_, handler) => {
				mockResponseHandler.mockImplementation(() => {
					(handler as EventListener)({ data: fakeInvalidWorkerEvent } as unknown as Event);
				});
			});

			const promise = sendMessageRequest({
				worker: mockWorker as unknown as Worker,
				msg: 'test-msg',
				data: testData,
				schema: mockSchema
			});

			setTimeout(() => {
				mockResponseHandler();
			}, 100);

			await expect(promise).rejects.toBeInstanceOf(z.ZodError);
		});
	});
});
