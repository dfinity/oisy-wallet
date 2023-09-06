import { page } from '$app/stores';
import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { erc20Tokens } from '$lib/derived/erc20.derived';
import type { Token, TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<Token> = derived([page, erc20Tokens], ([$page, $erc20Tokens]) => {
	const { data } = $page;

	if (isNullish(data.token)) {
		return ETHEREUM_TOKEN;
	}

	return $erc20Tokens.find(({ name }) => name === data.token) ?? ETHEREUM_TOKEN;
});

export const tokenId: Readable<TokenId> = derived([token], ([{ id }]) => id);

export const tokenSymbol: Readable<string> = derived([token], ([$token]) => $token.symbol);
