import type { Token, TokenId } from '$lib/types/token';
import type { TokenUi } from '$lib/types/token-ui';
import type { TokenUiOrGroupUi } from '$lib/types/token-ui-group';
import { getTokenIdentifier } from '$lib/utils/identifier.utils';
import { isTokenUiGroup } from '$lib/utils/token-group.utils';
import { isTokenToggleable } from '$lib/utils/token-toggleable.utils';
import { doesTokenMatchFilter } from '$lib/utils/tokens.utils';
import { nonNullish } from '@dfinity/utils';
import type { SvelteMap } from 'svelte/reactivity';

/**
 * The key of a token's row in a list: the token's address on its network (its ledger, for an
 * Internet Computer token), or its id for a native coin, which has no address.
 *
 * Not the symbol: two tokens can share one, and a keyed list throws on a repeated key. Not the id
 * itself either: it is a new `Symbol` each time the token is loaded, which would redraw the row.
 */
export const getTokenRowKey = (token: Token): string =>
	`token:${token.network.id.description}:${getTokenIdentifier(token) ?? token.id.description}`;

const getFilterCondition = ({ filter, token }: { filter: string; token: TokenUi }): boolean =>
	doesTokenMatchFilter({ token, filter });

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
	tokens,
	modifiedTokens
}: {
	tokens: Token[];
	modifiedTokens: SvelteMap<TokenId, Token>;
}): TokenUiOrGroupUi[] =>
	tokens.reduce<TokenUiOrGroupUi[]>((acc, token) => {
		const isEnabled = isTokenToggleable(token) && token.enabled;
		const isModified = nonNullish(modifiedTokens.get(token.id));
		if (!isEnabled || isModified) {
			acc.push({ token });
		}
		return acc;
	}, []);
