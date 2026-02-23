import { isIcToken } from '$icp/validation/ic-token.validation';
import { ZERO } from '$lib/constants/app.constants';
import type { TokenId, TokenToPin } from '$lib/types/token';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import type { TokensSortType } from '$lib/types/tokens-sort';
import { isTokenUiGroup } from './token-group.utils';

/**
 * Sorts tokens using balance-aware and pin-aware prioritisation.
 *
 * Sorting priority (in order):
 *
 * 1. Deprecation status (non-deprecated tokens first).
 * 2. USD balance (descending).
 * 3. Explicitly pinned tokens (pinned first, preserving the order provided in `$tokensToPin`).
 * 4. Token symbol (ascending, locale-aware).
 * 5. Token name (ascending, locale-aware).
 * 6. Network name (ascending, locale-aware).
 * 7. Token balance (descending).
 * 8. USD market cap (descending).
 *
 * Additionally, if `primarySortStrategy` is set, it overrides the default sorting by value.
 *
 * @param $tokens - The list of tokens to map and sort.
 * @param $exchanges - Exchange rate data used to compute USD balance and market cap.
 * @param $tokensToPin - Tokens that should be prioritised after balance and deprecation rules.
 * @param primarySortStrategy - Optional parameter to prioritise by performance, symbol or value (default).
 * @returns A sorted array of mapped token UI objects.
 */
export const sortTokensUi = ({
	$tokens,
	$tokensToPin,
	primarySortStrategy = 'value'
}: {
	$tokens: TokenUiOrGroupUi[];
	$tokensToPin: TokenToPin[];
	primarySortStrategy?: TokensSortType;
}): TokenUiOrGroupUi[] => {
	const pinIndexById = new Map<TokenId, number>($tokensToPin.map(({ id }, index) => [id, index]));

	return $tokens.sort((aRaw, bRaw) => {
		// Deprecated last
		const aDeprecated =
			!isTokenUiGroup(aRaw) && isIcToken(aRaw.token) && (aRaw.token.deprecated ?? false);
		const bDeprecated =
			!isTokenUiGroup(bRaw) && isIcToken(bRaw.token) && (bRaw.token.deprecated ?? false);
		if (aDeprecated !== bDeprecated) {
			return aDeprecated ? 1 : -1;
		}

		const a = isTokenUiGroup(aRaw) ? aRaw.group : aRaw.token;
		const b = isTokenUiGroup(bRaw) ? bRaw.group : bRaw.token;

		// If the choice is to prioritise performance sorting
		if (primarySortStrategy === 'performance') {
			const performanceDiff =
				(b.usdPriceChangePercentage24h ?? 0) - (a.usdPriceChangePercentage24h ?? 0);
			if (performanceDiff !== 0) {
				return performanceDiff;
			}
		}

		// If the choice is to prioritise symbol sorting
		const aSymbol = isTokenUiGroup(aRaw) ? aRaw.group.groupData.symbol : aRaw.token.symbol;
		const bSymbol = isTokenUiGroup(bRaw) ? bRaw.group.groupData.symbol : bRaw.token.symbol;
		if (primarySortStrategy === 'symbol') {
			const symbolDiff = aSymbol.localeCompare(bSymbol);
			if (symbolDiff !== 0) {
				return symbolDiff;
			}
		}

		// Tie-breaker after primary strategy
		// USD Balance descending
		const usdBalanceDiff = (b.usdBalance ?? 0) - (a.usdBalance ?? 0);
		if (usdBalanceDiff !== 0) {
			return usdBalanceDiff;
		}

		// Pinned tokens (pinned first; pinned order = order provided)
		const aId = isTokenUiGroup(aRaw) ? aRaw.group.groupData.id : aRaw.token.id;
		const bId = isTokenUiGroup(bRaw) ? bRaw.group.groupData.id : bRaw.token.id;
		const aPin = pinIndexById.get(aId);
		const bPin = pinIndexById.get(bId);
		const aPinned = aPin !== undefined;
		const bPinned = bPin !== undefined;
		if (aPinned !== bPinned) {
			return aPinned ? -1 : 1;
		}
		if (aPinned && bPinned) {
			return aPin - bPin;
		}

		const aName = isTokenUiGroup(aRaw) ? aRaw.group.groupData.name : aRaw.token.name;
		const bName = isTokenUiGroup(bRaw) ? bRaw.group.groupData.name : bRaw.token.name;

		const aNetworkName = isTokenUiGroup(aRaw)
			? aRaw.group.tokens[0].network.name
			: aRaw.token.network.name;
		const bNetworkName = isTokenUiGroup(bRaw)
			? bRaw.group.tokens[0].network.name
			: bRaw.token.network.name;

		return (
			aSymbol.localeCompare(bSymbol) ||
			aName.localeCompare(bName) ||
			aNetworkName.localeCompare(bNetworkName) ||
			+((b.balance ?? ZERO) > (a.balance ?? ZERO)) - +((b.balance ?? ZERO) < (a.balance ?? ZERO)) ||
			(b.usdMarketCap ?? 0) - (a.usdMarketCap ?? 0)
		);
	});
};
