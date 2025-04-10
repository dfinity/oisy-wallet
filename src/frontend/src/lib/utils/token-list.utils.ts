import type { TokenUi } from '$lib/types/token';
import type { TokenUiOrGroupUi } from '$lib/types/token-group';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';

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
