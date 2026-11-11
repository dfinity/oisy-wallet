import { BLOCKSTREAM_API_URL } from '$env/rest/blockstream.env';
import { btcTransactionStatus } from '$lib/rest/blockstream.rest';

describe('blockstream.rest', () => {
	describe('btcTransactionStatus', () => {
		const txid = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

		const mockFetch = ({ status, body }: { status: number; body?: unknown }) =>
			vi
				.spyOn(global, 'fetch')
				.mockResolvedValue(
					new Response(body === undefined ? null : JSON.stringify(body), { status })
				);

		afterEach(() => {
			vi.restoreAllMocks();
		});

		// Not `tx/:txid/status`, which answers `{ confirmed: false }` for a txid nobody knows too.
		it('should read the status of a transaction the network knows from the transaction', async () => {
			const fetchSpy = mockFetch({ status: 200, body: { txid, status: { confirmed: false } } });

			await expect(btcTransactionStatus({ txid })).resolves.toEqual({ confirmed: false });

			expect(fetchSpy).toHaveBeenCalledExactlyOnceWith(`${BLOCKSTREAM_API_URL}/tx/${txid}`);
		});

		it('should return undefined for a transaction the network does not know', async () => {
			mockFetch({ status: 404 });

			await expect(btcTransactionStatus({ txid })).resolves.toBeUndefined();
		});

		it('should throw on any other failure', async () => {
			mockFetch({ status: 503 });

			await expect(btcTransactionStatus({ txid })).rejects.toThrow(
				'Blockstream API response not ok.'
			);
		});
	});
});
