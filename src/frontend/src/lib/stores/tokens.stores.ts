import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { TokenId } from '$lib/types/token';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface TokensStore extends Readable<TokenId> {
	select: (id: TokenId) => void;
	reset: () => void;
}

const initTokensStore = (): TokensStore => {
	const INITIAL: TokenId = ETHEREUM_TOKEN_ID;

	const { subscribe, set } = writable<TokenId>(INITIAL);

	return {
		select: (id: TokenId) => set(id),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const tokensStore = initTokensStore();
