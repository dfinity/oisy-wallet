import type { TokenUi } from '$lib/types/token';
import type { TokenUiOrGroupUi } from '$lib/types/token-group';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { nonNullish } from '@dfinity/utils';

const getFilterCondition = ({ filter, token }: { filter: string; token: TokenUi }) =>
	token.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0 ||
	token.symbol.toLowerCase().indexOf(filter.toLowerCase()) >= 0;

export const getFilteredTokenList: ({
	filter,
	list
}: {
	filter: string;
	list: TokenUiOrGroupUi[];
}) => TokenUiOrGroupUi[] = ({ filter, list }: { filter: string; list: TokenUiOrGroupUi[] }) =>
	list.reduce<TokenUiOrGroupUi[]>((acc, item) => {
		if (filter === '') {
			return [...acc, item];
		} else {
			if (!isTokenUiGroup(item)) {
				const token = item.token;

				if (getFilterCondition({ filter, token })) {
					return [...acc, item];
				}
			} else {
				const group = item.group;
				const matchesGroup = group.tokens.some((token) => getFilterCondition({ filter, token }));

				// If any token in the group matches, add the group to the result
				if (nonNullish(matchesGroup)) {
					return [...acc, item];
				}
			}
		}
		return acc;
	}, []);

export const getFilteredTokenGroup = ({ filter, list }: { filter: string; list: TokenUi[] }) =>
	list.filter((item) => getFilterCondition({ filter, token: item }));
