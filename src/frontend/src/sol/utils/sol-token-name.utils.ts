import type { NetworkId } from '$lib/types/network';
import type { SplTokenMetadataData } from '$sol/stores/spl-token-metadata.store';
import type { SplTokenAddress } from '$sol/types/spl';
import type { SplCustomToken } from '$sol/types/spl-custom-token';
import { findEnabledSplToken } from '$sol/utils/spl.utils';
import { isNullish, nonNullish, notEmptyString } from '@dfinity/utils';

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

	const onChain = metadata[tokenAddress]?.symbol;

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
}): SplTokenAddress[] =>
	tokenAddresses.reduce<SplTokenAddress[]>((acc, tokenAddress) => {
		if (
			isNullish(tokenAddress) ||
			acc.includes(tokenAddress) ||
			nonNullish(findEnabledSplToken({ tokens, tokenAddress, networkId })) ||
			notEmptyString(metadata[tokenAddress]?.symbol)
		) {
			return acc;
		}

		acc.push(tokenAddress);
		return acc;
	}, []);
