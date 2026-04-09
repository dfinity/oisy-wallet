import { isTokenErc20 } from '$eth/utils/erc20.utils';
import { isIcToken } from '$icp/validation/ic-token.validation';
import type {
	SwapSupportedTokensData,
	SwapSupportedTokensInfo
} from '$lib/stores/swap-supported-tokens.store';
import type { Token } from '$lib/types/token';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { isTokenSpl } from '$sol/utils/spl.utils';
import { isNullish } from '@dfinity/utils';

/**
 * Resolves the provider-group info and the token identifier used for matching
 * against provider supported-token sets.
 *
 * Returns `undefined` when the token doesn't belong to a known swap network.
 */
const resolveSwapTokenLookup = ({
	token,
	supportedData
}: {
	token: Token;
	supportedData: SwapSupportedTokensData;
}): { info: SwapSupportedTokensInfo; identifier: string } | undefined => {
	if (isIcToken(token)) {
		return { info: supportedData.icp, identifier: token.ledgerCanisterId };
	}

	if (isTokenErc20(token)) {
		return { info: supportedData.evm, identifier: token.address.toLowerCase() };
	}

	if (isTokenSpl(token)) {
		return { info: supportedData.sol, identifier: token.address };
	}

	if (token.standard.code === 'ethereum') {
		return { info: supportedData.evm, identifier: token.symbol.toLowerCase() };
	}

	if (token.standard.code === 'solana') {
		return { info: supportedData.sol, identifier: token.symbol.toLowerCase() };
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
 */
export const filterSwapTokens = <T extends Token>({
	tokens,
	supportedData
}: {
	tokens: TokenToggleable<T>[];
	supportedData: SwapSupportedTokensData | undefined;
}): TokenToggleable<T>[] => {
	if (isNullish(supportedData)) {
		return tokens;
	}

	return tokens.filter((token) => {
		const lookup = resolveSwapTokenLookup({ token, supportedData });

		if (isNullish(lookup)) {
			return token.enabled;
		}

		const { info, identifier } = lookup;
		const { coverage, supportedTokenIds } = info;

		if (coverage === 'none') {
			return token.enabled;
		}

		const isSupported = supportedTokenIds.has(identifier);

		if (coverage === 'all') {
			return isSupported;
		}

		return token.enabled || isSupported;
	});
};
