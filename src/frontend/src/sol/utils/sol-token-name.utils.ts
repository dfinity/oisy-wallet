import type { NetworkId } from '$lib/types/network';
import type { SplTokenMetadata, SplTokenMetadataData } from '$sol/stores/spl-token-metadata.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { findEnabledSplToken } from '$sol/utils/spl.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

/**
 * The names known for one cluster. The same mint address exists on several of them and carries
 * different data on each, so a name is only ever read out of the cluster it was fetched from.
 */
const namesOn = ({
	metadata,
	networkId
}: {
	metadata: SplTokenMetadataData;
	networkId: NetworkId;
}): Partial<Record<SplTokenAddress, SplTokenMetadata>> => {
	const network = mapNetworkIdToNetwork(networkId);

	return nonNullish(network) ? (metadata[network] ?? {}) : {};
};

/**
 * How a mint is named, wherever one is named.
 *
 * In order: the token the wallet lists, the symbol the mint carries in its own account, and
 * finally a placeholder. The placeholder is numbered by the order the mints appear, and only when
 * a single view holds more than one of them: two rows reading "Unknown token" are worse than an
 * address, because nothing distinguishes them.
 *
 * The order comes from the caller because the caller is what defines the view: a list of deltas,
 * a list of instructions, a single row.
 */
export const solTokenSymbol = ({
	tokenAddress,
	tokens,
	networkId,
	metadata,
	unknownTokenAddresses,
	unknownTokenLabel,
	nativeSymbol
}: {
	tokenAddress: SplTokenAddress | undefined;
	tokens: SplCustomToken[];
	networkId: NetworkId;
	metadata: SplTokenMetadataData;
	unknownTokenAddresses: SplTokenAddress[];
	unknownTokenLabel: string;
	nativeSymbol: string;
}): string => {
	if (isNullish(tokenAddress)) {
		return nativeSymbol;
	}

	const listed = findEnabledSplToken({ tokens, tokenAddress, networkId })?.symbol;

	if (nonNullish(listed)) {
		return listed;
	}

	const onChain = namesOn({ metadata, networkId })[tokenAddress]?.symbol;

	if (notEmptyString(onChain)) {
		return onChain;
	}

	const index = unknownTokenAddresses.indexOf(tokenAddress);

	return unknownTokenAddresses.length > 1 && index >= 0
		? `${unknownTokenLabel} ${index + 1}`
		: unknownTokenLabel;
};

/**
 * The mints of a view that nothing can name, in the order they appear, which is what the numbering
 * counts off.
 */
export const solUnknownTokenAddresses = ({
	tokenAddresses,
	tokens,
	networkId,
	metadata
}: {
	tokenAddresses: (SplTokenAddress | undefined)[];
	tokens: SplCustomToken[];
	networkId: NetworkId;
	metadata: SplTokenMetadataData;
}): SplTokenAddress[] => {
	const names = namesOn({ metadata, networkId });

	return tokenAddresses.reduce<SplTokenAddress[]>((acc, tokenAddress) => {
		if (
			isNullish(tokenAddress) ||
			acc.includes(tokenAddress) ||
			nonNullish(findEnabledSplToken({ tokens, tokenAddress, networkId })) ||
			notEmptyString(names[tokenAddress]?.symbol)
		) {
			return acc;
		}

		acc.push(tokenAddress);
		return acc;
	}, []);
};
