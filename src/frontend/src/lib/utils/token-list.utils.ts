import type { Network } from '$lib/types/network';
import type { Token, TokenUi } from '$lib/types/token';
import type { TokenUiOrGroupUi } from '$lib/types/token-group';
import type { TokenToggleable } from '$lib/types/token-toggleable';
import { showTokenFilteredBySelectedNetwork } from '$lib/utils/network.utils';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { isNullish, nonNullish } from '@dfinity/utils';

const getFilterCondition = ({ filter, token }: { filter: string; token: TokenUi }): boolean =>
	token.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0 ||
	token.symbol.toLowerCase().indexOf(filter.toLowerCase()) >= 0;

export const getFilteredTokenList = ({
	filter,
	list
}: {
	filter: string;
	list: TokenUiOrGroupUi[];
}): TokenUiOrGroupUi[] =>
	filter === ''
		? list
		: list.filter((item) =>
				isTokenUiGroup(item)
					? item.group.tokens.some((token) => getFilterCondition({ filter, token }))
					: getFilterCondition({ filter, token: item.token })
			);

export const getFilteredTokenGroup = ({
	filter,
	list
}: {
	filter: string;
	list: TokenUi[];
}): TokenUi[] => list.filter((item) => getFilterCondition({ filter, token: item }));

// hide enabled initially, but keep enabled (modified) ones that have just been enabled to let the user revert easily
// then we return it as a valid TokenUiOrGroupUi since the displaying cards require that type
// we also apply the same logic for filtering networks as in manage tokens modal
export const getDisabledOrModifiedTokens = ({
	$allTokens,
	modifiedTokens,
	selectedNetwork
}: {
	$allTokens: TokenToggleable<Token>[];
	modifiedTokens: Record<string, Token>;
	selectedNetwork?: Network;
}): TokenUiOrGroupUi[] =>
	($allTokens ?? []).reduce<TokenUiOrGroupUi[]>((acc, token) => {
		const isModified = nonNullish(
			modifiedTokens[`${token.network.id.description}-${token.id.description}`]
		);
		if (
			(!token.enabled || (token.enabled && isModified)) &&
			showTokenFilteredBySelectedNetwork({
				token,
				$selectedNetwork: selectedNetwork,
				$pseudoNetworkChainFusion: isNullish(selectedNetwork)
			})
		) {
			acc.push({
				token: token as TokenUi
			});
		}
		return acc;
	}, []);
