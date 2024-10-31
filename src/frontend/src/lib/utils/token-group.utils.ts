import type { IcCkToken } from '$icp/types/ic';
import { isIcCkToken } from '$icp/utils/icrc.utils';
import type { TokenId, TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import {
	isRequiredTokenWithLinkedData,
	isToken,
	sumBalances,
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

	return mappedTokensWithGroups.filter(
		(t) => isTokenUiGroup(t) || !groupedTokenTwins.has(t.symbol)
	);
};

/** Function to group a "main token" with an existing group or create a new group with the token as the "main token".
 *
 * If the token has no "main token", it is either a "main token" for an existing group,
 * or a "main token" for a group that still does not exist, or a single-element group (but still its "main token").
 *
 * @param {TokenUi} token - The "main token" to group.
 * @param {TokenUiGroup} tokenGroup - The group where the "main token" should be added, if it exists.
 */
const groupMainToken = ({
	token,
	tokenGroup
}: {
	token: TokenUi;
	tokenGroup: TokenUiGroup | undefined;
}): TokenUiGroup => ({
	...(tokenGroup ?? {}),
	// It overrides any possible "main token" placeholder, if it was created before or not.
	id: token.id,
	nativeToken: token,
	tokens: [...(tokenGroup?.tokens ?? []), token],
	balance:
		'balance' in (tokenGroup ?? {})
			? sumBalances([tokenGroup?.balance, token.balance])
			: token.balance,
	usdBalance: sumUsdBalances([tokenGroup?.usdBalance, token.usdBalance])
});

/** Function to group a "secondary token" with an existing group or create a new group with the token as a "secondary token".
 *
 * If a group already exists for the "main token" of the current token, add it to the existing group.
 * Otherwise, create a new group with the current token as a placeholder "main token".
 * This is to avoid that the group is created with an empty "main token", if the current token's "main token" is not in the list.
 * Instead, it should be considered a single-element group, until the "main token" may or may not be found.
 *
 *
 * @param {TokenUi} token - The "secondary token" to group.
 * @param {TokenUiGroup} tokenGroup - The group where the "secondary token" should be added, if it exists.
 */
const groupSecondaryToken = ({
	token,
	tokenGroup
}: {
	token: TokenUi;
	tokenGroup: TokenUiGroup | undefined;
}): TokenUiGroup => ({
	...(tokenGroup ?? {
		id: token.id,
		nativeToken: token
	}),
	tokens: [...(tokenGroup?.tokens ?? []), token],
	balance:
		'balance' in (tokenGroup ?? {})
			? sumBalances([tokenGroup?.balance, token.balance])
			: token.balance,
	usdBalance: sumUsdBalances([tokenGroup?.usdBalance, token.usdBalance])
});

/**
 * Function to create a list of TokenUiGroup by grouping a provided list of tokens.
 *
 * The function loops through the tokens list and groups them according to a prop key that links a token to its "main token".
 * For example, it could be `twinToken` as per ck token standard. But the logic can be extended to other props, if necessary.
 *
 * The tokens with no "main token" will still be included in a group, but it will be a single-element group, where the "main token" is the token itself.
 * That, in general, makes sense for tokens that are not "secondary tokens" of a "main token".
 *
 * The returned list respects the sorting order of the initial tokens list, meaning that the group is created at each position of the first encountered token of the group.
 * So, independently of being a "main token" or a "secondary token", the group will replace the first token of the group in the list.
 * That is useful if a "secondary token" is before the "main token" in the list; for example, if the list is sorted by balance.
 *
 * NOTE: The function does not sort the groups by any criteria. It only groups the tokens. So, even if a group ends up having a total balance that would put it in a higher position in the list, it will not be moved.
 *
 * @param {TokenUi[]} tokens - The list of TokenUi objects to group. Each token may or may not have a prop key to identify a "main token".
 * @returns {TokenUiGroup[]} A list where tokens are grouped into a TokenUiGroup, even if they are by themselves.
 */
export const groupTokens = (tokens: TokenUi[]): TokenUiGroup[] => {
	const tokenGroupsMap = tokens.reduce<{
		[id: TokenId]: TokenUiGroup | undefined;
	}>((acc, token) => {
		// If the token has a twinToken, and both have the same decimals, group them together.
		if (
			'twinToken' in token &&
			isToken(token.twinToken) &&
			token.decimals === token.twinToken.decimals
		) {
			acc[token.twinToken.id] = groupSecondaryToken({ token, tokenGroup: acc[token.twinToken.id] });

			return acc;
		}

		acc[token.id] = groupMainToken({ token, tokenGroup: acc[token.id] });

		return acc;
	}, {});

	return Object.getOwnPropertySymbols(tokenGroupsMap).map(
		(id) => tokenGroupsMap[id as TokenId] as TokenUiGroup
	);
};
