import { ETHEREUM_TOKEN } from '$lib/constants/tokens.constants';
import { erc20TokensStore } from '$lib/stores/erc20.store';
import { tokenIdStore } from '$lib/stores/token-id.stores';
import type { Token } from '$lib/types/token';
import { derived, type Readable } from 'svelte/store';

export const token: Readable<Token> = derived(
	[tokenIdStore, erc20TokensStore],
	([$tokenIdStore, $erc20TokensStore]) =>
		$erc20TokensStore.find(({ id }) => id === $tokenIdStore) ?? ETHEREUM_TOKEN
);

export const tokenSymbol: Readable<string> = derived([token], ([$token]) => $token.symbol);
