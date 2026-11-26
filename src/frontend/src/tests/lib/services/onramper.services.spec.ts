import * as onramperRest from '$lib/rest/onramper.rest';
import { loadOnramperIds, resetOnramperIds } from '$lib/services/onramper.services';
import type { OnramperSupportedCrypto, OnramperTransactionType } from '$lib/types/onramper';

describe('onramper.services', () => {
	describe('loadOnramperIds', () => {
		const aaveAddress = '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9';
		const pyusdMint = '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo';

		const lists: Record<OnramperTransactionType, OnramperSupportedCrypto[]> = {
			buy: [
				{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress },
				{ id: 'pyusd_solana', network: 'solana', address: pyusdMint }
			],
			sell: [{ id: 'aave_ethereum', network: 'ethereum', address: aaveAddress }]
		};

		// Each list settles on its own; these specs wait for both.
		const load = async () => {
			const { buy, sell } = loadOnramperIds();

			return { buy: await buy, sell: await sell };
		};

		const mockLists = () =>
			vi
				.spyOn(onramperRest, 'fetchOnramperSupportedCryptos')
				.mockImplementation(({ type }) => Promise.resolve(lists[type]));

		beforeEach(() => {
			vi.spyOn(console, 'warn').mockImplementation(() => {});
		});

		afterEach(() => {
			resetOnramperIds();
			vi.restoreAllMocks();
		});

		it('loads the Buy and the Sell list, indexed by network and address', async () => {
			mockLists();

			await expect(load()).resolves.toEqual({
				buy: new Map([
					[`ethereum:${aaveAddress}`, 'aave_ethereum'],
					[`solana:${pyusdMint}`, 'pyusd_solana']
				]),
				sell: new Map([[`ethereum:${aaveAddress}`, 'aave_ethereum']])
			});
		});

		it('settles each list on its own', async () => {
			vi.spyOn(onramperRest, 'fetchOnramperSupportedCryptos').mockImplementation(({ type }) =>
				type === 'sell' ? new Promise(() => {}) : Promise.resolve(lists[type])
			);

			const { buy } = loadOnramperIds();

			await expect(buy).resolves.toEqual(
				new Map([
					[`ethereum:${aaveAddress}`, 'aave_ethereum'],
					[`solana:${pyusdMint}`, 'pyusd_solana']
				])
			);
		});

		it('fetches each list once', async () => {
			const spy = mockLists();

			await load();
			await load();

			expect(spy).toHaveBeenCalledTimes(2);
			expect(spy).toHaveBeenCalledWith({ type: 'buy' });
			expect(spy).toHaveBeenCalledWith({ type: 'sell' });
		});

		it('shares a request still in flight', async () => {
			const spy = mockLists();

			await Promise.all([load(), load()]);

			expect(spy).toHaveBeenCalledTimes(2);
		});

		it('leaves out a list that fails, without throwing', async () => {
			vi.spyOn(onramperRest, 'fetchOnramperSupportedCryptos').mockImplementation(({ type }) =>
				type === 'sell' ? Promise.reject(new Error('Forbidden')) : Promise.resolve(lists[type])
			);

			const { buy, sell } = await load();

			expect(buy?.get(`ethereum:${aaveAddress}`)).toBe('aave_ethereum');
			expect(sell).toBeUndefined();
			expect(console.warn).toHaveBeenCalledOnce();
		});

		it('asks again for a list that failed', async () => {
			const spy = vi
				.spyOn(onramperRest, 'fetchOnramperSupportedCryptos')
				.mockRejectedValueOnce(new Error('Network error'))
				.mockImplementation(({ type }) => Promise.resolve(lists[type]));

			const first = await load();

			expect(first.buy).toBeUndefined();

			const second = await load();

			expect(second.buy?.get(`ethereum:${aaveAddress}`)).toBe('aave_ethereum');
			expect(spy).toHaveBeenCalledTimes(3);
		});
	});
});
