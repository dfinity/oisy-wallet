import { RELAY_STATUS_TIMEOUT_MS } from '$lib/constants/swap.constants';
import { fetchRelayIntentStatus } from '$lib/rest/relay.rest';
import { mockRelayRequestId } from '$tests/mocks/lifi-btc.mock';

describe('relay.rest', () => {
	describe('fetchRelayIntentStatus', () => {
		const mockFetch = ({ status, body }: { status: number; body?: unknown }) =>
			vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(
					new Response(body === undefined ? null : JSON.stringify(body), { status })
				);

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it('should ask the v3 status of the request, with a deadline', async () => {
			const { signal } = new AbortController();
			const timeoutSpy = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
			const fetchSpy = mockFetch({ status: 200, body: { status: 'waiting', quoteCreatedAt: 1 } });

			await expect(fetchRelayIntentStatus({ requestId: mockRelayRequestId })).resolves.toEqual({
				status: 'waiting',
				quoteCreatedAt: 1
			});

			expect(timeoutSpy).toHaveBeenCalledExactlyOnceWith(RELAY_STATUS_TIMEOUT_MS);
			expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(
				`https://api.relay.link/intents/status/v3?requestId=${mockRelayRequestId}`,
				{ signal }
			);
		});

		it('should throw when Relay does not answer', async () => {
			mockFetch({ status: 429 });

			await expect(fetchRelayIntentStatus({ requestId: mockRelayRequestId })).rejects.toThrow(
				'Relay status lookup failed: 429'
			);
		});
	});
});
