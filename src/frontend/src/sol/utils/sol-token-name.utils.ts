import type { NetworkId } from '$lib/types/network';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { SplTokenMetadata, SplTokenMetadataData } from '$sol/stores/spl-token-metadata.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { mapNetworkIdToNetwork } from '$sol/utils/network.utils';
import { findSplToken } from '$sol/utils/spl.utils';
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
 * The symbol a mint carries in its own account, if it carries one.
 */
const ownSymbol = ({
	tokenAddress,
	networkId,
	metadata
}: {
	tokenAddress: SplTokenAddress;
	networkId: NetworkId;
	metadata: SplTokenMetadataData;
}): string | undefined => {
	const symbol = namesOn({ metadata, networkId })[tokenAddress]?.symbol;

	return notEmptyString(symbol) ? symbol : undefined;
};

/**
 * How a mint is named, wherever one is named.
 *
 * In order: the token the wallet lists, the placeholder carrying the symbol the mint has in its
 * own account, and finally the placeholder alone. The bare placeholder is numbered by the order
 * the mints appear, and only when a single view holds more than one of them: two rows reading
 * "Unknown token" are worse than an address, because nothing distinguishes them.
 *
 * A symbol of the mint's own never stands on its own. Anybody can create a mint that calls itself
 * "USDC", so it is shown inside the placeholder: a token the wallet does not list never reads as
 * one it does.
 *
 * The list the caller passes is the wallet's whole one, disabled tokens included: hiding a token
 * from the asset list says nothing about how to read a transaction that moves it.
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
	unknownTokenNamedLabel,
	nativeSymbol
}: {
	tokenAddress: SplTokenAddress | undefined;
	tokens: SplCustomToken[];
	networkId: NetworkId;
	metadata: SplTokenMetadataData;
	unknownTokenAddresses: SplTokenAddress[];
	unknownTokenLabel: string;
	// The placeholder with a `$symbol` in it, for a mint that carries a symbol of its own.
	unknownTokenNamedLabel: string;
	nativeSymbol: string;
}): string => {
	if (isNullish(tokenAddress)) {
		return nativeSymbol;
	}

	const listed = findSplToken({ tokens, tokenAddress, networkId })?.symbol;

	if (nonNullish(listed)) {
		return listed;
	}

	const own = ownSymbol({ tokenAddress, networkId, metadata });

	if (nonNullish(own)) {
		return replacePlaceholders(unknownTokenNamedLabel, { $symbol: own });
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
}): SplTokenAddress[] =>
	tokenAddresses.reduce<SplTokenAddress[]>((acc, tokenAddress) => {
		if (
			isNullish(tokenAddress) ||
			acc.includes(tokenAddress) ||
			nonNullish(findSplToken({ tokens, tokenAddress, networkId })) ||
			nonNullish(ownSymbol({ tokenAddress, networkId, metadata }))
		) {
			return acc;
		}

		acc.push(tokenAddress);
		return acc;
	}, []);
