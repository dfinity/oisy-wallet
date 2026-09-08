import { exchangeRateSPLToUsd } from '$lib/services/exchange.services';
import { consoleWarn } from '$lib/utils/console.utils';
import { splTokenPriceStore, type SplTokenPrice } from '$sol/stores/spl-token-price.store';
import { SolanaNetworks, type SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import { nonNullish } from '@dfinity/utils';

/**
 * The lowercase forms that more than one distinct address of `addresses` reduces to.
 */
const doubledLowercase = (addresses: SplTokenAddress[]): Set<string> => {
	const seen = new Map<string, SplTokenAddress>();
	const doubled = new Set<string>();

	addresses.forEach((address) => {
		const lowercase = address.toLowerCase();
		const first = seen.get(lowercase);

		if (nonNullish(first) && first !== address) {
			doubled.add(lowercase);

			return;
		}

		seen.set(lowercase, address);
	});

	return doubled;
};

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

		const exact = new Map(Object.entries(response));

		// The feed answers under its own spelling of an address, which for a base58 mint need not
		// be the one it was asked about, so an exact miss is retried without case.
		//
		// Base58 is case-sensitive, so two distinct mints can share one lowercase form. Reading
		// either of them without case would price a mint with what a different mint is worth,
		// which is the one thing this review must never do. Such a form names no mint at all here,
		// on whichever side it is doubled: the transaction is not obliged to be well behaved.
		const ambiguous = new Set([
			...doubledLowercase(addresses),
			...doubledLowercase([...exact.keys()])
		]);

		const insensitive = new Map(
			Object.entries(response).map(([address, price]) => [address.toLowerCase(), price])
		);

		const priceOf = (address: SplTokenAddress): SplTokenPrice => {
			const lowercase = address.toLowerCase();

			return (
				exact.get(address) ?? (ambiguous.has(lowercase) ? undefined : insensitive.get(lowercase))
			)?.usd;
		};

		// Every mint asked about is written, a mint the feed does not know included: an entry left
		// behind by an earlier transaction would otherwise price this one.
		splTokenPriceStore.set({
			network,
			prices: addresses.reduce<Partial<Record<SplTokenAddress, SplTokenPrice>>>((acc, address) => {
				acc[address] = priceOf(address);

				return acc;
			}, {})
		});
	} catch (err: unknown) {
		consoleWarn('Could not read Solana token prices', err);
	}
};
