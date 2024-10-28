import type { TokenId, TokenUi, TokenUiGroup } from '$lib/types/token';
import { isToken, sumBalances, sumUsdBalances } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';

/**
 * Function to create a list of TokenUiGroup by grouping a provided list of tokens.
 *
 * The function loops through the tokens list and groups them according to a prop key that links a token to its "native token".
 * For example, it could be `twinToken` as per ck token standard. But the logic can be extended to other props, if necessary.
 *
 * The tokens with no "native token" will still be included in a group, but it will be a single-element group, where the "native token" is the token itself.
 * That, in general, makes sense for tokens that are not "secondary tokens" of a "native token".
 *
 * The returned list respects the sorting order of the initial tokens list, meaning that the group is created at each position of the first encountered token of the group.
 * So, independently of being a "native token" or a "secondary token", the group will replace the first token of the group in the list.
 * That is useful if a "secondary token" is before the "native token" in the list; for example, if the list is sorted by balance.
 *
 * NOTE: The function does not sort the groups by any criteria. It only groups the tokens. So, even if a group ends up having a total balance that would put it in a higher position in the list, it will not be moved.
 *
 * @param {TokenUi[]} tokens - The list of TokenUi objects to group. Each token may or may not have a prop key to identify a "native token".
 * @returns {TokenUiGroup[]} A list where tokens are grouped into a TokenUiGroup, even if they are by themselves.
 */
export const groupTokens = (tokens: TokenUi[]): TokenUiGroup[] => {
	const tokenGroups: { [id: TokenId]: TokenUiGroup } = tokens.reduce<{
		[id: TokenId]: TokenUiGroup;
	}>((acc, token) => {
		// If the token has a twinToken, and both have the same decimals, group them together.
		// The twinToken is the "native token" in this case.
		if (
			'twinToken' in token &&
			isToken(token.twinToken) &&
			token.decimals === token.twinToken.decimals
		) {
			const { id: twinTokenId } = token.twinToken;

			const existingGroup: TokenUiGroup = acc[twinTokenId];

			acc = {
				...acc,
				[twinTokenId]: nonNullish(existingGroup)
					? // If a group already exists for the "native token" of the current token, add it to the existing group.
						{
							...existingGroup,
							tokens: [...existingGroup.tokens, token],
							balance: sumBalances([existingGroup.balance, token.balance]),
							usdBalance: sumUsdBalances([existingGroup.usdBalance, token.usdBalance])
						}
					: // Otherwise, create a new group with the current token as "native token", as placeholder.
						// This is to avoid that the group is created with an empty "native token", if the current token's "native token" is not in the list.
						// Instead, it should be considered a single-element group, until the "native token" may or may not be found.
						{
							id: token.id,
							nativeToken: token,
							tokens: [token],
							balance: token.balance,
							usdBalance: token.usdBalance
						}
			};

			return acc;
		}

		// If the token has no "native token", it is either a "native token" for an existing group,
		// or a "native token" for a group that still does not exist, or a single-element group (but still its "native token").
		acc = {
			...acc,
			[token.id]: nonNullish(acc[token.id])
				? // If a group already exists for the token, then the token is the "native token" of the group.
					// It overrides the "native token" placeholder, if it was created before.
					{
						...acc[token.id],
						id: token.id,
						nativeToken: token,
						// We place the "native token" as the first token in the group, independently of its position in the list, so basically ignoring the sorting rules, like the balance.
						// TODO: Check if the "native token" should always be the first token in the group, or if it should respect the order of the tokens in the group.
						tokens: [token, ...acc[token.id].tokens],
						balance: sumBalances([acc[token.id].balance, token.balance]),
						usdBalance: sumUsdBalances([acc[token.id].usdBalance, token.usdBalance])
					}
				: // If a group does not exist for the token, create a new group with the token as the "native token".
					{
						id: token.id,
						nativeToken: token,
						tokens: [token],
						balance: token.balance,
						usdBalance: token.usdBalance
					}
		};

		return acc;
	}, {});

	return Object.getOwnPropertySymbols(tokenGroups).map((id) => tokenGroups[id]);
};
