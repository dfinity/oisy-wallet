import { ETHEREUM_TOKEN_ID } from '$lib/constants/tokens.constants';
import type { TokenId } from '$lib/types/token';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export interface TokenIdStore extends Readable<TokenId> {
	select: (id: TokenId) => void;
	reset: () => void;
}

const initTokenIdStore = (): TokenIdStore => {
	const INITIAL: TokenId = ETHEREUM_TOKEN_ID;

	const { subscribe, set } = writable<TokenId>(INITIAL);

	return {
		select: (id: TokenId) => set(id),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const tokenIdStore = initTokenIdStore();
