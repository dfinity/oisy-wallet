import type { Erc20Token } from '$eth/types/erc20';
import type { TokenId } from '$lib/types/token';
import { writable, type Readable } from 'svelte/store';

export type Ecr20DefaultTokensData = Erc20Token[] | undefined;

export interface Ecr20DefaultTokensStore extends Readable<Ecr20DefaultTokensData> {
	set: (tokens: Ecr20DefaultTokensData) => void;
	add: (token: Erc20Token) => void;
	remove: (tokenId: TokenId) => void;
	reset: () => void;
}

const initEcr20DefaultTokensStore = (): Ecr20DefaultTokensStore => {
	const INITIAL: Ecr20DefaultTokensData = undefined;

	const { subscribe, set, update } = writable<Ecr20DefaultTokensData>(INITIAL);

	return {
		set: (tokens: Ecr20DefaultTokensData) => set(tokens),
		add: (token: Erc20Token) =>
			update((state) => [
				...(state ?? []).filter(
					({ address }) => address.toLowerCase() !== token.address.toLowerCase()
				),
				token
			]),
		remove: (tokenId: TokenId) =>
			update((state) => [...(state ?? []).filter(({ id }) => id !== tokenId)]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const erc20DefaultTokensStore = initEcr20DefaultTokensStore();
