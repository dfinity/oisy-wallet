import { isTokenErcFungible } from '$eth/utils/erc-fungible.utils';
import { isTokenEthereumNative } from '$eth/utils/token.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import type {
	SwapProviderListCoverage,
	SwapSupportedTokensData,
	SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isTokenSolanaNative } from '$sol/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

export const determineCoverage = ({
	totalEnabled,
	withList
}: {
	totalEnabled: number;
	withList: number;
}): SwapProviderListCoverage => {
	if (totalEnabled === 0 || withList === 0) {
		return 'none';
	}

	return withList >= totalEnabled ? 'all' : 'some';
};

/**
 * Resolves the provider-group info and the token identifier used for matching
 * against provider supported-token sets.
 *
 * Returns `undefined` when the token doesn't belong to a known swap network.
 */
export const resolveSwapTokenLookup = ({
	token,
	supportedData
}: {
	token: Token;
	supportedData: SwapSupportedTokensData;
}):
	| { info: SwapSupportedTokensInfo; identifier: string; category: 'icp' | 'evm' | 'sol' }
	| undefined => {
	if (isIcToken(token)) {
		return { info: supportedData.icp, identifier: token.ledgerCanisterId, category: 'icp' };
	}

	if (isTokenErcFungible(token)) {
		return { info: supportedData.evm, identifier: token.address.toLowerCase(), category: 'evm' };
	}

	if (isTokenSpl(token)) {
		return { info: supportedData.sol, identifier: token.address, category: 'sol' };
	}

	if (isTokenEthereumNative(token)) {
		return { info: supportedData.evm, identifier: token.symbol.toLowerCase(), category: 'evm' };
	}

	if (isTokenSolanaNative(token)) {
		return { info: supportedData.sol, identifier: token.symbol.toLowerCase(), category: 'sol' };
	}
};

/**
 * Filters swap tokens based on provider supported-token lists.
 *
 * Per network category the rule is:
 * - All providers offer a list  →  S ∩ (A ∪ I)  (only tokens at least one provider supports)
 * - Some providers offer a list →  A ∪ (S ∩ I)  (all active + inactive ones known to be swappable)
 * - No provider offers a list  →  A             (only active tokens)
 *
 * Where:
 * - S  = union of supported tokens across providers that expose a list
 * - A  = active (enabled) tokens
 * - I  = inactive (disabled) tokens
 *
 * The optional `compatibleTokenIds` parameter narrows destinations on a per-category basis.
 * Only categories present in the map are filtered; others pass through unchanged.
 * This lets cross-chain providers restrict EVM destinations without hiding same-chain ICP tokens.
 */
export const filterSwapTokens = <T extends Token>({
	tokens,
	supportedData,
	compatibleTokenIds
}: {
	tokens: TokenToggleable<T>[];
	supportedData: SwapSupportedTokensData | undefined;
	compatibleTokenIds?: Partial<Record<'icp' | 'evm' | 'sol', Set<string>>>;
}): TokenToggleable<T>[] => {
	if (isNullish(supportedData)) {
		return tokens;
	}

	return tokens.filter((token) => {
		const lookup = resolveSwapTokenLookup({ token, supportedData });

		if (isNullish(lookup)) {
			return token.enabled;
		}

		const { info, identifier, category } = lookup;

		if (isNullish(info)) {
			return token.enabled;
		}

		const { coverage, supportedTokenIds } = info;

		if (coverage === 'none') {
			return token.enabled;
		}

		const isSupported = supportedTokenIds.has(identifier);
		const passesCoverage = coverage === 'all' ? isSupported : token.enabled || isSupported;

		if (!passesCoverage) {
			return false;
		}

		if (nonNullish(compatibleTokenIds)) {
			const categoryFilter = compatibleTokenIds[category];
			if (nonNullish(categoryFilter)) {
				return categoryFilter.has(identifier);
			}
		}

		return true;
	});
};
