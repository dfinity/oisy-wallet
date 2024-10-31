import type { IcCkToken } from '$icp/types/ic';
import { isIcCkToken } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import {
	isRequiredTokenWithLinkedData,
	sumTokenBalances,
	sumUsdBalances
} from '$lib/utils/token.utils';

/**
 * Type guard to check if an object is of type TokenUiGroup.
 *
 * @param tokenUiOrGroupUi - The object to check.
 * @returns A boolean indicating whether the object is a TokenUiGroup.
 */
export const isTokenUiGroup = (
	tokenUiOrGroupUi: TokenUiOrGroupUi
): tokenUiOrGroupUi is TokenUiGroup =>
	typeof tokenUiOrGroupUi === 'object' &&
	'nativeToken' in tokenUiOrGroupUi &&
	'tokens' in tokenUiOrGroupUi;

/**
 * Factory function to create a TokenUiGroup based on the provided tokens and network details.
 * This function creates a group header and adds both the native token and the twin token to the group's tokens array.
 *
 * @param nativeToken - The native token used for the group, typically the original token or the one from the selected network.
 * @param twinToken - The twin token to be grouped with the native token, usually representing the same asset on a different network.
 *
 * @returns A TokenUiGroup object that includes a header with network and symbol information and contains both the native and twin tokens.
 */
const createTokenGroup = ({
	nativeToken,
	twinToken
}: {
	nativeToken: TokenUi;
	twinToken: TokenUi;
}): TokenUiGroup => ({
	// Setting the same ID of the native token to ensure the Group Card component is treated as the same component of the Native Token Card.
	// This allows Svelte transitions/animations to handle the two cards as the same component, giving a smoother user experience.
	id: nativeToken.id,
	nativeToken,
	tokens: [nativeToken, twinToken],
	balance: sumTokenBalances([nativeToken, twinToken]),
	usdBalance: sumUsdBalances([nativeToken.usdBalance, twinToken.usdBalance])
});

/**
 * Function to create a list of TokenUiOrGroupUi by grouping tokens with matching twinTokenSymbol.
 * The group is placed in the position where the first token of the group was found.
 * Tokens with no twin remain as individual tokens in their original position.
 *
 * @param tokens - The list of TokenUi objects to group. Each token may or may not have a twinTokenSymbol.
 *                 Tokens with a twinTokenSymbol are grouped together.
 *
 * @returns A new list where tokens with twinTokenSymbols are grouped into a TokenUiGroup,
 *          and tokens without twins remain in their original place.
 *          The group replaces the first token of the group in the list.
 */
export const groupTokensByTwin = (tokens: TokenUi[]): TokenUiOrGroupUi[] => {
	const groupedTokenTwins = new Set<string>();
	const mappedTokensWithGroups: TokenUiOrGroupUi[] = tokens.map((token) => {
		if (!isRequiredTokenWithLinkedData(token)) {
			return token;
		}

		const twinToken = tokens.find((t) => t.symbol === token.twinTokenSymbol && isIcCkToken(t)) as
			| IcCkToken
			| undefined;

		if (twinToken && twinToken.decimals === token.decimals) {
			groupedTokenTwins.add(twinToken.symbol);
			groupedTokenTwins.add(token.symbol);
			return createTokenGroup({
				nativeToken: token,
				twinToken: twinToken
			});
		}

		return token;
	});

	return mappedTokensWithGroups
		.filter((t) => isTokenUiGroup(t) || !groupedTokenTwins.has(t.symbol))
		.sort(
			(a, b) =>
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				+(b.balance ?? ZERO).gt(a.balance ?? ZERO) - +(b.balance ?? ZERO).lt(a.balance ?? ZERO)
		);
};
