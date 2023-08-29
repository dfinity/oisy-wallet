import { Token } from '$lib/enums/token';
import type { Readable } from 'svelte/store';
import { writable } from 'svelte/store';

export type TokensData = Token;

export interface TokensStore extends Readable<TokensData> {
	select: (token: Token) => void;
    reset: () => void;
}

const initTokensStore = (): TokensStore => {
	const { subscribe, set } = writable<TokensData>(Token.ETHEREUM);

	return {
		select: (token: Token) => set(token),
        reset: () => set(Token.ETHEREUM),
		subscribe
	};
};

export const tokensStore = initTokensStore();
