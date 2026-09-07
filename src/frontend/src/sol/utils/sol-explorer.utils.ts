import type { Network } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { isNetworkSolana } from '$lib/utils/network.utils';
import type { SolAddress } from '$sol/types/address';
import { nonNullish } from '@dfinity/utils';

/**
 * A Solana account on its network's block explorer.
 *
 * The explorer URL is a template rather than a base: devnet carries a cluster query after the
 * path, so the address has to be substituted into it and cannot be appended to it.
 */
export const solAccountExplorerUrl = ({
	network,
	address
}: {
	network: Network | undefined;
	address: SolAddress | undefined;
}): string | undefined =>
	nonNullish(network) &&
	isNetworkSolana(network) &&
	nonNullish(network.explorerUrl) &&
	nonNullish(address)
		? replacePlaceholders(network.explorerUrl, { $args: `account/${address}/` })
		: undefined;
