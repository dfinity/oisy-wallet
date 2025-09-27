import { btcAddressTransactions, btcLatestBlockHeight } from '$lib/rest/blockstream.rest';
import { mockBlockHeight, mockBlockstreamTransactions } from '$tests/mocks/blockstream.mock';
import { mockBtcAddress } from '$tests/mocks/btc.mock';

describe('blockstream.rest', () => {
	describe('btcLatestBlockHeight', () => {
		beforeEach(() => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockBlockHeight)
				})
			) as unknown as typeof fetch;
		});

		it('fetches latest block height for mainnet', async () => {
			const result = await btcLatestBlockHeight({
				bitcoinNetwork: 'mainnet'
			});

			expect(result).toEqual(mockBlockHeight);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('blockstream.info/api/blocks/tip/height')
			);
		});

		it('fetches latest block height for testnet', async () => {
			const result = await btcLatestBlockHeight({
				bitcoinNetwork: 'testnet'
			});

			expect(result).toEqual(mockBlockHeight);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('blockstream.info/testnet/api/blocks/tip/height')
			);
		});

		it('fetches latest block height for regtest', async () => {
			const result = await btcLatestBlockHeight({
				bitcoinNetwork: 'regtest'
			});

			expect(result).toEqual(mockBlockHeight);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('http://localhost:3000/api/blocks/tip/height')
			);
		});

		it('throws an error when the response is not ok', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					json: () => Promise.resolve({ error: 'Not Found' })
				})
			) as unknown as typeof fetch;

			await expect(
				btcLatestBlockHeight({
					bitcoinNetwork: 'mainnet'
				})
			).rejects.toThrow('Blockstream API response not ok.');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining('blockstream.info/api/blocks/tip/height')
			);
		});
	});

	describe('btcAddressTransactions', () => {
		beforeEach(() => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: true,
					json: () => Promise.resolve(mockBlockstreamTransactions)
				})
			) as unknown as typeof fetch;
		});

		it('fetches BTC address transactions for mainnet', async () => {
			const result = await btcAddressTransactions({
				btcAddress: mockBtcAddress,
				bitcoinNetwork: 'mainnet'
			});

			expect(result).toEqual(mockBlockstreamTransactions);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining(`blockstream.info/api/address/${mockBtcAddress}/txs`)
			);
		});

		it('fetches BTC address transactions for testnet', async () => {
			const result = await btcAddressTransactions({
				btcAddress: mockBtcAddress,
				bitcoinNetwork: 'testnet'
			});

			expect(result).toEqual(mockBlockstreamTransactions);

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining(`blockstream.info/testnet/api/address/${mockBtcAddress}/txs`)
			);
		});

		it('throws an error when the response is not ok', async () => {
			global.fetch = vi.fn(() =>
				Promise.resolve({
					ok: false,
					json: () => Promise.resolve({ error: 'Address not found' })
				})
			) as unknown as typeof fetch;

			await expect(
				btcAddressTransactions({
					btcAddress: mockBtcAddress,
					bitcoinNetwork: 'mainnet'
				})
			).rejects.toThrow('Blockstream API response not ok.');

			expect(global.fetch).toHaveBeenCalledWith(
				expect.stringContaining(`blockstream.info/api/address/${mockBtcAddress}/txs`)
			);
		});
	});
});
