import type { Erc20Token } from '$lib/types/erc20';
import { writable, type Readable } from 'svelte/store';

export interface Ecr20TokensStore extends Readable<Erc20Token[]> {
	set: (tokens: Erc20Token[]) => void;
	reset: () => void;
}

const initEcr20TokensStore = (): Ecr20TokensStore => {
	const INITIAL: Erc20Token[] = [];

	const { subscribe, set } = writable<Erc20Token[]>(INITIAL);

	return {
		set: (tokens: Erc20Token[]) => set(tokens),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const erc20TokensStore = initEcr20TokensStore();
