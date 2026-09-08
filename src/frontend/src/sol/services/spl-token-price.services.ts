import { exchangeRateSPLToUsd } from '$lib/services/exchange.services';
import { consoleWarn } from '$lib/utils/console.utils';
import { splTokenPriceStore } from '$sol/stores/spl-token-price.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';

/**
 * Prices the mints of one transaction, for the mints the portfolio feed does not already cover.
 *
 * Asked per review rather than kept warm on a timer: a review names a handful of mints, any of
 * which may be one the wallet has never listed, and pricing every listed mint on every poll would
 * pay for all of them to answer for the few that are ever looked at.
 *
 * Mainnet only. A devnet mint is not the mainnet mint of the same address, and the price feed
 * knows nothing about either of the test clusters.
 *
 * Best effort by design: a mint the feed cannot price, or a request that fails, leaves the amount
 * unpriced rather than failing the review it appeared in.
 */
export const loadSplTokenPrices = async ({
	tokenAddresses,
	network
}: {
	tokenAddresses: SplTokenAddress[];
	network: SolanaNetworkType;
}): Promise<void> => {
	if (network !== SolanaNetworks.mainnet) {
		return;
	}

	const addresses = [...new Set(tokenAddresses)];

	if (addresses.length === 0) {
		return;
	}

	try {
		const response = await exchangeRateSPLToUsd(addresses);

		// The feed answers under its own spelling of an address, which for a base58 mint need not
		// be the one it was asked about.
		const priced = new Map(
			Object.entries(response).map(([address, price]) => [address.toLowerCase(), price?.usd])
		);

		// Every mint asked about is written, a mint the feed does not know included: an entry left
		// behind by an earlier transaction would otherwise price this one.
		splTokenPriceStore.set({
			network,
			prices: addresses.reduce<Partial<Record<SplTokenAddress, number>>>((acc, address) => {
				acc[address] = priced.get(address.toLowerCase());

				return acc;
			}, {})
		});
	} catch (err: unknown) {
		consoleWarn('Could not read Solana token prices', err);
	}
};
