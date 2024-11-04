import type { IcCkToken } from '$icp/types/ic';
import { isIcCkToken } from '$icp/utils/icrc.utils';
import { ZERO } from '$lib/constants/app.constants';
import type { TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import {
	isRequiredTokenWithLinkedData,
	sumBalances,
	sumTokenBalances,
	sumUsdBalances
} from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';

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

const mapNewTokenGroup = (token: TokenUi): TokenUiGroup => ({
	id: token.id,
	nativeToken: token,
	tokens: [token],
	balance: token.balance,
	usdBalance: token.usdBalance
});

interface GroupTokenParams {
	token: TokenUi;
	tokenGroup: TokenUiGroup | undefined;
}

interface UpdateTokenGroupParams extends GroupTokenParams {
	tokenGroup: TokenUiGroup;
}

/**
 * Function to update a token group with a new token.
 *
 * This function purely adds the token to the group, updating the group's balance and USD balance.
 * It does not concern itself with whether the token is a "main token" or a "secondary token".
 *
 * @param {UpdateTokenGroupParams} params - The parameters for the function.
 * @param {TokenUi} params.token - The token to add to the group.
 * @param {TokenUiGroup} params.tokenGroup - The group where the token should be added.
 * @returns {TokenUiGroup} The updated group with the new token.
 */
export const updateTokenGroup = ({ token, tokenGroup }: UpdateTokenGroupParams): TokenUiGroup => ({
	...tokenGroup,
	tokens: [...tokenGroup.tokens, token],
	balance: sumBalances([tokenGroup.balance, token.balance]),
	usdBalance: sumUsdBalances([tokenGroup.usdBalance, token.usdBalance])
});

/**
 * Function to group a "main token" with an existing group or create a new group with the token as the "main token".
 *
 * If the token has no "main token", it is either a "main token" for an existing group,
 * or a "main token" for a group that still does not exist, or a single-element group (but still its "main token").
 *
 * @param {GroupTokenParams} params - The parameters for the function.
 * @param {TokenUi} params.token - The "main token" to group.
 * @param {TokenUiGroup} params.tokenGroup - The group where the "main token" should be added, if it exists.
 * @returns {TokenUiGroup} The updated group with the "main token", or a new group with the "main token".
 */
export const groupMainToken = ({ token, tokenGroup }: GroupTokenParams): TokenUiGroup =>
	nonNullish(tokenGroup)
		? {
				...updateTokenGroup({ token, tokenGroup }),
				// It overrides any possible "main token" placeholder.
				id: token.id,
				nativeToken: token
			}
		: mapNewTokenGroup(token);

/**
 * Function to group a "secondary token" with an existing group or create a new group with the token as a "secondary token".
 *
 * If a group already exists for the "main token" of the current token, add it to the existing group.
 * Otherwise, create a new group with the current token as a placeholder "main token".
 * This is to avoid that the group is created with an empty "main token", if the current token's "main token" is not in the list.
 * Instead, it should be considered a single-element group, until the "main token" may or may not be found.
 *
 * @param {GroupTokenParams} params - The parameters for the function.
 * @param {TokenUi} params.token - The "secondary token" to group.
 * @param {TokenUiGroup} params.tokenGroup - The group where the "secondary token" should be added, if it exists.
 * @returns {TokenUiGroup} The updated group with the "secondary token", or a new group with the "secondary token".
 */
export const groupSecondaryToken = ({ token, tokenGroup }: GroupTokenParams): TokenUiGroup =>
	nonNullish(tokenGroup) ? updateTokenGroup({ token, tokenGroup }) : mapNewTokenGroup(token);
