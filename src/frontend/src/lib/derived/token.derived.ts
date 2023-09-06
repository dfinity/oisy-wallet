import { page } from '$app/stores';
import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import type { Token, TokenId } from '$lib/types/token';
import { isNullish } from '@dfinity/utils';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<Token> = derived(
	[page, erc20TokensStore],
	([$page, $erc20TokensStore]) => {
		const { data } = $page;

		if (isNullish(data.token)) {
			return ETHEREUM_TOKEN;
		}

		return $erc20TokensStore.find(({ name }) => name === data.token) ?? ETHEREUM_TOKEN;
	}
);

export const tokenId: Readable<TokenId> = derived([token], ([{ id }]) => id);

export const tokenSymbol: Readable<string> = derived([token], ([$token]) => $token.symbol);
