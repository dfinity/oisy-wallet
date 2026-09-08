import type { NetworkId } from '$lib/types/network';
import type { SplTokenPriceData } from '$sol/stores/spl-token-price.store';
import type { SplTokenAddress } from '$sol/types/spl';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * What one mint of a cluster is worth in USD, or nothing when the price feed does not know it.
 *
 * The cluster is part of the key for the same reason it is when naming a mint: the same address
 * exists on several of them and is a different token on each.
 */
export const solTokenUsdPrice = ({
	tokenAddress,
	networkId,
	prices
}: {
	tokenAddress: SplTokenAddress;
	networkId: NetworkId;
	prices: SplTokenPriceData;
}): number | undefined => {
	const network = mapNetworkIdToNetwork(networkId);

	return nonNullish(network) ? prices[network]?.[tokenAddress] : undefined;
};
