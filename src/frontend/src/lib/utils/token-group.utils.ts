import type { TokenId, TokenUi, TokenUiGroup } from '$lib/types/token';
import { isToken, sumBalances, sumUsdBalances } from '$lib/utils/token.utils';

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
		// The twinToken is the "main token" in this case.
		if (
			'twinToken' in token &&
			isToken(token.twinToken) &&
			token.decimals === token.twinToken.decimals
		) {
			const { id: twinTokenId } = token.twinToken;

			// If a group already exists for the "main token" of the current token, add it to the existing group.
			// Otherwise, create a new group with the current token as a placeholder "main token".
			// This is to avoid that the group is created with an empty "main token", if the current token's "main token" is not in the list.
			// Instead, it should be considered a single-element group, until the "main token" may or may not be found.
			acc[twinTokenId] = {
				...(acc[twinTokenId] ?? {
					id: token.id,
					nativeToken: token
				}),
				tokens: [...(acc[twinTokenId]?.tokens ?? []), token],
				balance: sumBalances([acc[twinTokenId]?.balance, token.balance]),
				usdBalance: sumUsdBalances([acc[twinTokenId]?.usdBalance, token.usdBalance])
			};

			return acc;
		}

		// If the token has no "main token", it is either a "main token" for an existing group,
		// or a "main token" for a group that still does not exist, or a single-element group (but still its "main token").
		acc[token.id] = {
			...(acc[token.id] ?? {}),
			// It overrides the "main token" placeholder, if it was created before or not.
			id: token.id,
			nativeToken: token,
			tokens: [...(acc[token.id]?.tokens ?? []), token],
			balance: sumBalances([acc[token.id]?.balance, token.balance]),
			usdBalance: sumUsdBalances([acc[token.id]?.usdBalance, token.usdBalance])
		};

		return acc;
	}, {});

	return Object.getOwnPropertySymbols(tokenGroupsMap).map(
		(id) => tokenGroupsMap[id as TokenId] as TokenUiGroup
	);
};
