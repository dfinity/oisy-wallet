import { btcTransactionStatus } from '$lib/rest/blockstream.rest';

describe('blockstream.rest', () => {
	describe('btcTransactionStatus', () => {
		const txid = 'a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90';

		const mockFetch = (response: { ok: boolean; status: number; body?: unknown }) => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: response.ok,
					status: response.status,
					json: () => Promise.resolve(response.body)
				})
			) as unknown as typeof fetch;
		};

		it('should return the status of a transaction the network knows', async () => {
			mockFetch({ ok: true, status: 200, body: { confirmed: false } });

			await expect(btcTransactionStatus({ txid })).resolves.toEqual({ confirmed: false });

			expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining(`tx/${txid}/status`));
		});

		it('should return undefined for a transaction the network does not know', async () => {
			mockFetch({ ok: false, status: 404 });

			await expect(btcTransactionStatus({ txid })).resolves.toBeUndefined();
		});

		it('should throw on any other failure', async () => {
			mockFetch({ ok: false, status: 503 });

			await expect(btcTransactionStatus({ txid })).rejects.toThrow(
				'Blockstream API response not ok.'
			);
		});
	});
});
