import { ETHEREUM_TOKEN, ICP_TOKEN } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import { routeToken } from '$lib/derived/nav.derived';
import type { Token, TokenId, TokenStandard } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<Token> = derived(
	[routeToken, erc20Tokens],
	([$routeToken, $erc20Tokens]) => {
		if (isNullish($routeToken)) {
			return ETHEREUM_TOKEN;
		}

		if ($routeToken === ICP_TOKEN.name) {
			return ICP_TOKEN;
		}

		return $erc20Tokens.find(({ name }) => name === $routeToken) ?? ETHEREUM_TOKEN;
	}
);

export const tokenId: Readable<TokenId> = derived([token], ([{ id }]) => id);

export const tokenStandard: Readable<TokenStandard> = derived(
	[token],
	([{ standard }]) => standard
);

export const tokenSymbol: Readable<string> = derived([token], ([$token]) => $token.symbol);

export const tokenDecimals: Readable<number> = derived([token], ([$token]) => $token.decimals);
