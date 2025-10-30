import type { Token, TokenId } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { isTokenToggleable } from '$lib/utils/token.utils';
import { nonNullish } from '@dfinity/utils';
import type { SvelteMap } from 'svelte/reactivity';

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
	modifiedTokens
}: {
	$allTokens: Token[];
	modifiedTokens: SvelteMap<TokenId, Token>;
}): TokenUiOrGroupUi[] =>
	($allTokens ?? []).reduce<TokenUiOrGroupUi[]>((acc, token) => {
		const isEnabled = isTokenToggleable(token) && token.enabled;
		const isModified = nonNullish(modifiedTokens.get(token.id));
		if (!isEnabled || isModified) {
			acc.push({ token });
		}
		return acc;
	}, []);
