import { ZERO } from '$lib/constants/app.constants';
import type { TokenId, TokenUi } from '$lib/types/token';
import type { TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import { sumBalances, sumUsdBalances } from '$lib/utils/token.utils';
import { isToken } from '$lib/validation/token.validation';
import { nonNullish } from '@dfinity/utils';

/**
 * Type guard to check if an object is of type TokenUiGroup.
 *
 * @param tokenUiOrGroupUi - The object to check.
 * @returns A boolean indicating whether the object is a TokenUiGroup.
 */
export const isTokenUiGroup = (
	tokenUiOrGroupUi: TokenUiOrGroupUi
): tokenUiOrGroupUi is { group: TokenUiGroup } =>
	typeof tokenUiOrGroupUi === 'object' &&
	'group' in tokenUiOrGroupUi &&
	'nativeToken' in tokenUiOrGroupUi.group &&
	'tokens' in tokenUiOrGroupUi.group;

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
	const tokenGroups = groupTokens(tokens);

	return tokenGroups
		.map((group) => (group.tokens.length === 1 ? { token: group.tokens[0] } : { group }))
		.sort((aa, bb) => {
			const a = isTokenUiGroup(aa) ? aa.group : aa.token;
			const b = isTokenUiGroup(bb) ? bb.group : bb.token;

			return (
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				+(b.balance ?? ZERO).gt(a.balance ?? ZERO) - +(b.balance ?? ZERO).lt(a.balance ?? ZERO)
			);
		});
};

const hasBalance = ({ token, showZeroBalances }: { token: TokenUi; showZeroBalances: boolean }) =>
	Number(token.balance ?? 0n) || Number(token.usdBalance ?? 0n) || showZeroBalances;

/**
 * Function to create a list of TokenUiOrGroupUi, filtering out all groups that do not have at least
 * one token with a balance if showZeroBalance is false.
 *
 * @param groupedTokens - The list of TokenUiOrGroupUi to filter. Groups without balance are filtered out.
 * @param showZeroBalances - A boolean that indicates if zero balances should be shown.
 *
 * @returns A new list where all groups that do not have at least one token with a balance are removed if showZeroBalances is false.
 */
export const filterTokenGroups = ({
	groupedTokens,
	showZeroBalances
}: {
	groupedTokens: TokenUiOrGroupUi[];
	showZeroBalances: boolean;
}) =>
	groupedTokens.filter((tokenOrGroup: TokenUiOrGroupUi) =>
		isTokenUiGroup(tokenOrGroup)
			? tokenOrGroup.group.tokens.some((token: TokenUi) => hasBalance({ token, showZeroBalances }))
			: hasBalance({ token: tokenOrGroup.token, showZeroBalances })
	);

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
	}>(
		(acc, token) => ({
			...acc,
			...(isToken(token) &&
			'twinToken' in token &&
			nonNullish(token.twinToken) &&
			isToken(token.twinToken) &&
			// TODO: separate the check for decimals from the rest, since it seems important to the logic.
			token.decimals === token.twinToken.decimals
				? // If the token has a twinToken, and both have the same decimals, group them together.
					{
						[token.twinToken.id]: groupSecondaryToken({
							token,
							tokenGroup: acc[token.twinToken.id]
						})
					}
				: {
						[token.id]: groupMainToken({
							token,
							tokenGroup: acc[token.id]
						})
					})
		}),
		{}
	);

	return Object.getOwnPropertySymbols(tokenGroupsMap).map(
		(id) => tokenGroupsMap[id as TokenId] as TokenUiGroup
	);
};
