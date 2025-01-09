import type { TokenId } from '$lib/types/token';
import type { SplToken } from '$sol/types/spl';
import { writable, type Readable } from 'svelte/store';

export type SplDefaultTokensData = SplToken[] | undefined;

export interface SplDefaultTokensStore extends Readable<SplDefaultTokensData> {
	set: (tokens: SplDefaultTokensData) => void;
	add: (token: SplToken) => void;
	remove: (tokenId: TokenId) => void;
	reset: () => void;
}

const initSPLDefaultTokensStore = (): SplDefaultTokensStore => {
	const INITIAL: SplDefaultTokensData = undefined;

	const { subscribe, set, update } = writable<SplDefaultTokensData>(INITIAL);

	return {
		set: (tokens: SplDefaultTokensData) => set(tokens),
		add: (token: SplToken) =>
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

export const splDefaultTokensStore = initSPLDefaultTokensStore();
