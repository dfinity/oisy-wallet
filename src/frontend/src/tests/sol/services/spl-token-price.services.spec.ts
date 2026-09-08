import { exchangeRateSPLToUsd } from '$lib/services/exchange.services';
import { loadSplTokenPrices } from '$sol/services/spl-token-price.services';
import { splTokenPriceStore } from '$sol/stores/spl-token-price.store';
import { mockSplAddress } from '$tests/mocks/sol.mock';
import { get } from 'svelte/store';

vi.mock('$lib/services/exchange.services', () => ({
	exchangeRateSPLToUsd: vi.fn()
}));

describe('spl-token-price.services', () => {
	describe('loadSplTokenPrices', () => {
		const network = 'mainnet' as const;

		const price = (usd: number) => ({
			usd,
			usd_market_cap: 0,
			usd_24h_change: 0,
			last_updated_at: 0
		});

		beforeEach(() => {
			vi.clearAllMocks();

			splTokenPriceStore.reset();

			vi.mocked(exchangeRateSPLToUsd).mockResolvedValue({ [mockSplAddress]: price(4) });
		});

		it('should price the mints it is asked about', async () => {
			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network });

			expect(exchangeRateSPLToUsd).toHaveBeenCalledExactlyOnceWith([mockSplAddress]);
			expect(get(splTokenPriceStore)).toStrictEqual({ mainnet: { [mockSplAddress]: 4 } });
		});

		it('should ask about a mint once when it appears in several deltas', async () => {
			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress, mockSplAddress], network });

			expect(exchangeRateSPLToUsd).toHaveBeenCalledExactlyOnceWith([mockSplAddress]);
		});

		// The feed answers under its own spelling of an address, and a base58 mint is not
		// case-insensitive the way an EVM contract address is.
		it('should read a price the feed spelled differently', async () => {
			vi.mocked(exchangeRateSPLToUsd).mockResolvedValue({
				[mockSplAddress.toLowerCase()]: price(7)
			});

			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network });

			expect(get(splTokenPriceStore)).toStrictEqual({ mainnet: { [mockSplAddress]: 7 } });
		});

		// An entry left behind by an earlier transaction would otherwise price this one.
		it('should clear the price of a mint the feed no longer knows', async () => {
			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network });

			vi.mocked(exchangeRateSPLToUsd).mockResolvedValue({});

			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network });

			expect(get(splTokenPriceStore)).toStrictEqual({ mainnet: { [mockSplAddress]: undefined } });
		});

		// A devnet mint is not the mainnet mint of the same address, and the feed knows neither
		// test cluster.
		it.each(['devnet', 'local'] as const)('should not price a %s mint', async (network) => {
			await loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network });

			expect(exchangeRateSPLToUsd).not.toHaveBeenCalled();
			expect(get(splTokenPriceStore)).toStrictEqual({});
		});

		it('should not call the feed when there is nothing to price', async () => {
			await loadSplTokenPrices({ tokenAddresses: [], network });

			expect(exchangeRateSPLToUsd).not.toHaveBeenCalled();
		});

		// An unpriced amount is worth more than a review that failed to open.
		it('should leave the mints unpriced when the feed fails', async () => {
			vi.mocked(exchangeRateSPLToUsd).mockRejectedValue(new Error('rate limited'));

			await expect(
				loadSplTokenPrices({ tokenAddresses: [mockSplAddress], network })
			).resolves.toBeUndefined();

			expect(get(splTokenPriceStore)).toStrictEqual({});
		});
	});
});
