import {
	RIFT_DEFAULT_RETRY_AFTER_MS,
	RIFT_MIN_REQUEST_INTERVAL_MS
} from '$lib/constants/swap.constants';
import {
	getRiftOrder,
	postRiftOrder,
	postRiftQuote,
	resetRiftRateLimiter
} from '$lib/rest/rift.rest';
import {
	RiftApiError,
	RiftInvalidResponseError,
	RiftRequestSupersededError
} from '$lib/types/errors';
import type { RiftOrderRequest, RiftQuoteRequest } from '$lib/types/rift';
import { mockRiftOrderResponse, mockRiftQuoteResponse } from '$tests/mocks/rift.mock';

const env = vi.hoisted(() => ({ apiKey: undefined as string | undefined }));

vi.mock('$env/rest/rift.env', () => ({
	RIFT_API_URL: 'https://api.rift.trade',
	get RIFT_API_KEY() {
		return env.apiKey;
	}
}));

const quoteRequest: RiftQuoteRequest = {
	from: 'bitcoin.btc',
	to: 'evm:1.0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
	amount_in: '200000',
	format: 'raw',
	quote_mode: 'fast',
	integrator_id: 'oisy'
};

const orderRequest: RiftOrderRequest = {
	quote_id: mockRiftQuoteResponse.id,
	to_address: mockRiftOrderResponse.to_address,
	refund_address: mockRiftOrderResponse.refund_address
};

// A JSON answer whose body can be read any number of times, so one can answer several calls.
const jsonResponse = ({
	body,
	status = 200,
	headers = {}
}: {
	body: unknown;
	status?: number;
	headers?: Record<string, string>;
}): Response =>
	({
		ok: status >= 200 && status < 300,
		status,
		statusText: '',
		headers: new Headers(headers),
		json: () => Promise.resolve(body)
	}) as unknown as Response;

// Answers a quote request with the quote, and anything else with the order.
const answerByPath = (input: RequestInfo | URL): Promise<Response> =>
	Promise.resolve(
		jsonResponse({
			body: String(input).endsWith('/quote') ? mockRiftQuoteResponse : mockRiftOrderResponse
		})
	);

const requestedUrls = (): string[] => vi.mocked(fetch).mock.calls.map(([url]) => String(url));

const ORDER_URL = 'https://api.rift.trade/order';
const ORDER_READ_URL = `${ORDER_URL}/${mockRiftOrderResponse.id}`;
const QUOTE_URL = 'https://api.rift.trade/quote';

describe('rift.rest', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal('fetch', vi.fn());
		resetRiftRateLimiter();
		env.apiKey = undefined;
	});

	afterEach(() => {
		resetRiftRateLimiter();
		vi.unstubAllGlobals();
		vi.useRealTimers();
	});

	// The limiter starts even a first request from a timer, so every call needs the clock to move. The
	// request is awaited alongside, so that a rejection is handled from the start.
	const settle = async <T>(promise: Promise<T>): Promise<T> => {
		const [result] = await Promise.all([promise, vi.advanceTimersByTimeAsync(0)]);
		return result;
	};

	describe('postRiftQuote', () => {
		it('posts the request and returns the parsed quote, without the fields OISY does not read', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ body: mockRiftQuoteResponse }));

			const quote = await settle(postRiftQuote(quoteRequest));

			expect(fetch).toHaveBeenCalledExactlyOnceWith(QUOTE_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(quoteRequest),
				signal: expect.any(AbortSignal)
			});
			expect(quote.id).toBe(mockRiftQuoteResponse.id);
			expect(quote.estimated_amount_out).toBe('121475958');
			expect(quote.route.map(({ type }) => type)).toEqual(['venue', 'venue', 'delivery']);
			expect(quote).not.toHaveProperty('from_amount');
		});

		it('sends the API key when one is set', async () => {
			env.apiKey = 'test-key';
			vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ body: mockRiftQuoteResponse }));

			await settle(postRiftQuote(quoteRequest));

			expect(fetch).toHaveBeenCalledWith(
				QUOTE_URL,
				expect.objectContaining({
					headers: { 'Content-Type': 'application/json', 'x-api-key': 'test-key' }
				})
			);
		});

		it('rejects with the status and Rift message of an error answer', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				jsonResponse({ body: { error: 'no route found' }, status: 422 })
			);

			const result = settle(postRiftQuote(quoteRequest));

			await expect(result).rejects.toThrow(RiftApiError);
			await expect(result).rejects.toMatchObject({ status: 422 });
			await expect(result).rejects.toThrow('Rift request failed (422): no route found');
		});

		it('falls back to the status text when the error body is not Rift error JSON', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				new Response('<html>', { status: 502, statusText: 'Bad Gateway' })
			);

			await expect(settle(postRiftQuote(quoteRequest))).rejects.toThrow(
				'Rift request failed (502): Bad Gateway'
			);
		});

		it.each([
			{ label: 'a formatted quote', body: { ...mockRiftQuoteResponse, format: 'formatted' } },
			{
				label: 'a decimal amount',
				body: { ...mockRiftQuoteResponse, estimated_amount_out: '121.47' }
			},
			{ label: 'a missing id', body: { ...mockRiftQuoteResponse, id: undefined } },
			{
				label: 'an unknown step type',
				body: { ...mockRiftQuoteResponse, route: [{ type: 'teleport' }] }
			}
		])('rejects $label as an invalid response', async ({ body }) => {
			vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ body }));

			await expect(settle(postRiftQuote(quoteRequest))).rejects.toThrow(RiftInvalidResponseError);
		});

		it('rejects a body that is not JSON as an invalid response', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(new Response('not json', { status: 200 }));

			await expect(settle(postRiftQuote(quoteRequest))).rejects.toThrow(RiftInvalidResponseError);
		});

		it('accepts a venue Rift has not listed before', async () => {
			const [first, ...rest] = mockRiftQuoteResponse.route;
			vi.mocked(fetch).mockResolvedValueOnce(
				jsonResponse({
					body: { ...mockRiftQuoteResponse, route: [{ ...first, venue: 'new_venue' }, ...rest] }
				})
			);

			const quote = await settle(postRiftQuote(quoteRequest));

			expect(quote.route[0]).toMatchObject({ type: 'venue', venue: 'new_venue' });
		});
	});

	describe('postRiftOrder', () => {
		it('posts the request and returns the parsed order', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				jsonResponse({ body: mockRiftOrderResponse, status: 201 })
			);

			const order = await settle(postRiftOrder(orderRequest));

			expect(fetch).toHaveBeenCalledExactlyOnceWith(ORDER_URL, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(orderRequest),
				signal: expect.any(AbortSignal)
			});
			expect(order).toMatchObject({
				id: mockRiftOrderResponse.id,
				quote_id: mockRiftQuoteResponse.id,
				status: 'awaiting_deposit',
				deposit_address: mockRiftOrderResponse.deposit_address,
				deposit_tx: null
			});
		});

		it.each([
			{ label: 'in another format', body: { ...mockRiftOrderResponse, format: 'formatted' } },
			{ label: 'with an unknown status', body: { ...mockRiftOrderResponse, status: 'paused' } }
		])('rejects an order $label', async ({ body }) => {
			vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ body, status: 201 }));

			await expect(settle(postRiftOrder(orderRequest))).rejects.toThrow(RiftInvalidResponseError);
		});
	});

	describe('getRiftOrder', () => {
		it('reads the order without a body', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(
				jsonResponse({
					body: {
						...mockRiftOrderResponse,
						status: 'delivered',
						amount_out: '121475958',
						payout_tx: '0xabc'
					}
				})
			);

			const order = await settle(getRiftOrder({ orderId: mockRiftOrderResponse.id }));

			expect(fetch).toHaveBeenCalledExactlyOnceWith(ORDER_READ_URL, {
				method: 'GET',
				headers: {},
				signal: expect.any(AbortSignal)
			});
			expect(order).toMatchObject({ status: 'delivered', amount_out: '121475958' });
		});

		it('encodes the order id into the path', async () => {
			vi.mocked(fetch).mockResolvedValueOnce(jsonResponse({ body: mockRiftOrderResponse }));

			await settle(getRiftOrder({ orderId: '../health' }));

			expect(fetch).toHaveBeenCalledWith(`${ORDER_URL}/..%2Fhealth`, expect.anything());
		});
	});

	describe('rate limit', () => {
		it('starts requests at least the minimum interval apart', async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ body: mockRiftOrderResponse }));

			const first = getRiftOrder({ orderId: mockRiftOrderResponse.id });
			const second = getRiftOrder({ orderId: mockRiftOrderResponse.id });

			await vi.advanceTimersByTimeAsync(0);

			expect(fetch).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(RIFT_MIN_REQUEST_INTERVAL_MS - 1);

			expect(fetch).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);

			expect(fetch).toHaveBeenCalledTimes(2);

			await Promise.all([first, second]);
		});

		it('holds every request back for the Retry-After of a 429', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce(
					jsonResponse({
						body: { error: 'slow down' },
						status: 429,
						headers: { 'Retry-After': '3' }
					})
				)
				.mockResolvedValue(jsonResponse({ body: mockRiftOrderResponse, status: 201 }));

			await expect(settle(postRiftQuote(quoteRequest))).rejects.toMatchObject({ status: 429 });

			const order = postRiftOrder(orderRequest);

			await vi.advanceTimersByTimeAsync(2_999);

			expect(fetch).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);

			expect(fetch).toHaveBeenCalledTimes(2);

			await order;
		});

		it('holds requests back for the default delay when a 429 carries no Retry-After', async () => {
			vi.mocked(fetch)
				.mockResolvedValueOnce(jsonResponse({ body: { error: 'slow down' }, status: 429 }))
				.mockResolvedValue(jsonResponse({ body: mockRiftOrderResponse }));

			await expect(settle(postRiftQuote(quoteRequest))).rejects.toMatchObject({ status: 429 });

			const read = getRiftOrder({ orderId: mockRiftOrderResponse.id });

			await vi.advanceTimersByTimeAsync(RIFT_DEFAULT_RETRY_AFTER_MS - 1);

			expect(fetch).toHaveBeenCalledOnce();

			await vi.advanceTimersByTimeAsync(1);

			expect(fetch).toHaveBeenCalledTimes(2);

			await read;
		});

		it('serves an order request before waiting quotes and status reads', async () => {
			vi.mocked(fetch).mockImplementation(answerByPath);

			const first = getRiftOrder({ orderId: mockRiftOrderResponse.id });
			await vi.advanceTimersByTimeAsync(0);

			const status = getRiftOrder({ orderId: mockRiftOrderResponse.id });
			const quote = postRiftQuote(quoteRequest);
			const order = postRiftOrder(orderRequest);

			await vi.advanceTimersByTimeAsync(3 * RIFT_MIN_REQUEST_INTERVAL_MS);

			await Promise.all([first, status, quote, order]);

			expect(requestedUrls()).toEqual([ORDER_READ_URL, ORDER_URL, ORDER_READ_URL, QUOTE_URL]);
		});

		it('serves an urgent order read before waiting quotes', async () => {
			vi.mocked(fetch).mockImplementation(answerByPath);

			const first = postRiftQuote(quoteRequest);
			await vi.advanceTimersByTimeAsync(0);

			const quote = postRiftQuote({ ...quoteRequest, amount_in: '300000' });
			const urgent = getRiftOrder({ orderId: mockRiftOrderResponse.id, urgent: true });

			await vi.advanceTimersByTimeAsync(2 * RIFT_MIN_REQUEST_INTERVAL_MS);

			await Promise.all([first, quote, urgent]);

			expect(requestedUrls()).toEqual([QUOTE_URL, ORDER_READ_URL, QUOTE_URL]);
		});

		it('drops a waiting quote request, unsent, when a newer one arrives', async () => {
			vi.mocked(fetch).mockResolvedValue(jsonResponse({ body: mockRiftQuoteResponse }));

			const first = postRiftQuote(quoteRequest);
			await vi.advanceTimersByTimeAsync(0);

			const stale = postRiftQuote({ ...quoteRequest, amount_in: '300000' });
			const latest = postRiftQuote({ ...quoteRequest, amount_in: '400000' });

			await expect(stale).rejects.toThrow(RiftRequestSupersededError);

			await vi.advanceTimersByTimeAsync(RIFT_MIN_REQUEST_INTERVAL_MS);

			await Promise.all([first, latest]);

			expect(fetch).toHaveBeenCalledTimes(2);
			expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toMatchObject({
				amount_in: '400000'
			});
		});

		it('does not drop a waiting status read for a new quote', async () => {
			vi.mocked(fetch).mockImplementation(answerByPath);

			const first = postRiftQuote(quoteRequest);
			await vi.advanceTimersByTimeAsync(0);

			const status = getRiftOrder({ orderId: mockRiftOrderResponse.id });
			const quote = postRiftQuote(quoteRequest);

			await vi.advanceTimersByTimeAsync(2 * RIFT_MIN_REQUEST_INTERVAL_MS);

			await Promise.all([first, status, quote]);

			expect(requestedUrls()).toEqual([QUOTE_URL, ORDER_READ_URL, QUOTE_URL]);
		});
	});
});
