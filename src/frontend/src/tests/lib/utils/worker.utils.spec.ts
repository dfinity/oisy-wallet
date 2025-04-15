import { routeWorkerResponse, sendMessageRequest } from '$lib/utils/worker.utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

describe('worker.utils', () => {
	let workerMock: Worker;

	beforeEach(() => {
		workerMock = { postMessage: vi.fn() } as unknown as Worker;

		vi.stubGlobal('crypto', {
			randomUUID: vi.fn().mockReturnValue('test-uuid')
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('routeWorkerResponse', () => {
		it('routes worker response successfully through sendMessageRequest', async () => {
			const schema = z.object({
				type: z.literal('response'),
				requestId: z.string(),
				data: z.any()
			});

			const promise = sendMessageRequest({
				worker: workerMock,
				msg: 'test-message',
				data: { example: true },
				schema
			});

			expect(workerMock.postMessage).toHaveBeenCalledWith({
				type: 'request',
				requestId: 'test-uuid',
				msg: 'test-message',
				data: { example: true }
			});

			// Capturing the response handler indirectly by simulating the worker's event emit
			const mockWorkerResponse = {
				type: 'response',
				requestId: 'test-uuid',
				data: { responseData: 123 }
			};

			// Simulate that the worker has responded
			const event = new MessageEvent('message', { data: mockWorkerResponse });
			const routed = routeWorkerResponse(event);

			expect(routed).toBe(true); // Now, the routeWorkerResponse handles the actual request
			await expect(promise).resolves.toEqual(mockWorkerResponse);
		});

		it('fails to route response if no handler exists', () => {
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
			});

			const event = new MessageEvent('message', {
				data: { type: 'response', requestId: 'unknown-id', data: {} }
			});

			const routed = routeWorkerResponse(event);

			expect(routed).toBe(false);
			expect(consoleWarnSpy).toHaveBeenCalledWith('No handler found for event', 'unknown-id');

			consoleWarnSpy.mockRestore();
		});

		it('correctly handles invalid message type and logs error', () => {
			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
			});

			const invalidData = { type: 'unknown', requestId: 'irrelevant' };
			const event = new MessageEvent('message', { data: invalidData });

			const routed = routeWorkerResponse(event);

			expect(routed).toBe(false);
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				'Invalid message type. Expected \'response\', but got:',
				invalidData
			);

			consoleErrorSpy.mockRestore();
		});
	});

	describe('sendMessageRequest', () => {
		it('resolves with valid response data', async () => {
			const schema = z.object({
				type: z.literal('response'),
				requestId: z.string(),
				data: z.object({ info: z.string() })
			});

			const responseData = {
				type: 'response',
				requestId: 'test-uuid',
				data: { info: 'valid-response' }
			};

			const promise = sendMessageRequest({
				worker: workerMock,
				msg: 'test-handler-response',
				data: {},
				schema
			});

			const event = new MessageEvent('message', { data: responseData });
			expect(routeWorkerResponse(event)).toBe(true);

			await expect(promise).resolves.toEqual(responseData);
		});

		it('rejects upon receiving invalid schema', async () => {
			const schema = z.object({
				type: z.literal('response'),
				requestId: z.string(),
				data: z.object({ info: z.string() })
			});

			const invalidData = {
				type: 'response',
				requestId: 'test-uuid',
				data: 'invalid-type-data'
			};

			const promise = sendMessageRequest({
				worker: workerMock,
				msg: 'test-handler-invalid',
				data: {},
				schema
			});

			expect(routeWorkerResponse(new MessageEvent('message', { data: invalidData }))).toBe(true);

			await expect(promise).rejects.toBeInstanceOf(z.ZodError);
		});
	});
});
