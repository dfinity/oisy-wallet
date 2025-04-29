import { ZERO_BI } from '$lib/constants/app.constants';
import type { TokenId, TokenUi, TokenUiGroupable } from '$lib/types/token';
import type { TokenGroupId, TokenUiGroup, TokenUiOrGroupUi } from '$lib/types/token-group';
import { sumBalances, sumUsdBalances } from '$lib/utils/token.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

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
 * Function to create a list of `TokenUiOrGroupUi` by grouping tokens with matching `groupData`.
 * A group is placed in the position where its first token was found.
 * Tokens with no groups remain as individual tokens in their original position.
 *
 * @param tokens - The list of TokenUi objects to group. Each token may or may not have a `groupData` field.
 *                 Tokens with `groupData` are grouped together.
 *
 * @returns A new list where tokens with `groupData` are grouped into a `TokenUiGroup`,
 *          and tokens without twins remain in their original place.
 *          A group replaces its first token in the list.
 */
export const groupTokensByTwin = (tokens: TokenUi[]): TokenUiOrGroupUi[] => {
	const tokenOrGroups = groupTokens(tokens);

	return tokenOrGroups
		.map((tokenOrGroup) =>
			isTokenUiGroup(tokenOrGroup) && tokenOrGroup.group.tokens.length === 1
				? { token: tokenOrGroup.group.tokens[0] }
				: tokenOrGroup
		)
		.sort((aa, bb) => {
			const a = isTokenUiGroup(aa) ? aa.group : aa.token;
			const b = isTokenUiGroup(bb) ? bb.group : bb.token;

			return (
				(b.usdBalance ?? 0) - (a.usdBalance ?? 0) ||
				+((b.balance ?? ZERO_BI) > (a.balance ?? ZERO_BI)) -
					+((b.balance ?? ZERO_BI) < (a.balance ?? ZERO_BI))
			);
		});
};

const hasBalance = ({ token, showZeroBalances }: { token: TokenUi; showZeroBalances: boolean }) =>
	Number(token.balance ?? ZERO_BI) || Number(token.usdBalance ?? ZERO_BI) || showZeroBalances;

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

const mapNewTokenGroup = (token: TokenUiGroupable): TokenUiGroup => ({
	id: token.groupData.id,
	nativeToken: token,
	groupData: token.groupData,
	tokens: [token],
	balance: token.balance,
	usdBalance: token.usdBalance
});

interface GroupTokenParams {
	token: TokenUiGroupable;
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
 * Function to create a list of `TokenUiOrGroupUi` by grouping (or not grouping) a provided list of tokens.
 *
 * The function loops through the tokens list and groups them according to the `groupData` field,
 * if it exists, in a variant of `TokenUiOrGroupUi` that is `{ group: TokenUiGroup }`.
 * The tokens with no `groupData` will be included in the list, but as variant `{ token : TokenUi }`.
 * The returned list respects the sorting order of the initial tokens list, meaning that the group is created at each position of the first encountered token of the group.
 *
 * NOTE: The function does not sort the groups by any criteria. It only groups the tokens. So, even if a group ends up having a total balance that would put it in a higher position in the list, it will not be moved.
 *
 * @param {TokenUi[]} tokens - The list of TokenUi objects to group. Each token may or may not have a prop key to identify a "main token".
 * @returns {TokenUiOrGroupUi[]} A list where tokens are either grouped into a `TokenUiGroup`, or remain as individual tokens.
 */
export const groupTokens = (tokens: TokenUi[]): TokenUiOrGroupUi[] => {
	const tokenGroupsMap = tokens.reduce<{
		[id: TokenId | TokenGroupId]: TokenUiOrGroupUi;
	}>((acc, token) => {
		const { id: tokenId, groupData } = token;

		if (isNullish(groupData)) {
			return { ...acc, [tokenId]: { token } };
		}

		const { id: groupId } = groupData;

		const putativeExistingGroup = acc[groupId];

		const group: TokenUiGroup = groupSecondaryToken({
			// Even if we check for the existence of the `groupData`, the compiler warns that the type of the token is still `TokenUi`.
			// We need to cast it to `TokenUiWithGroupData` to access the groupData property.
			token: token as TokenUiGroupable,
			tokenGroup:
				nonNullish(putativeExistingGroup) && 'group' in putativeExistingGroup
					? putativeExistingGroup.group
					: undefined
		});

		return { ...acc, [groupId]: { group } };
	}, {});

	return Object.getOwnPropertySymbols(tokenGroupsMap).map((id) => tokenGroupsMap[id as TokenId]);
};
