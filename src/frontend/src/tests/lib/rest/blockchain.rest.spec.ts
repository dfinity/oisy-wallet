import { btcAddressData } from '$lib/rest/blockchain.rest';
import { mockBlockchainResponse } from '$tests/mocks/blockchain.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';

describe('blockchain.rest', () => {
	describe('btcAddressData', () => {
		beforeEach(() => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockBlockchainResponse)
				})
			) as unknown as typeof fetch;
		});

		it('fetches BTC address data with cors=true', async () => {
			const result = await btcAddressData({ btcAddress: mockBtcAddress });

			expect(result).toEqual(mockBlockchainResponse);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining(`rawaddr/${mockBtcAddress}?cors=true`)
			);
		});

		it('throws an error when the response is not ok', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					json: () => Promise.resolve({ error: 'Not Found' })
				})
			) as unknown as typeof fetch;

			await expect(btcAddressData({ btcAddress: mockBtcAddress })).rejects.toThrow(
				'Blockchain API response not ok.'
			);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining(`rawaddr/${mockBtcAddress}?cors=true`)
			);
		});
	});
});
