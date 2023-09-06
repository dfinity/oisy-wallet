import type { Erc20Token } from '$lib/types/erc20';
import { writable, type Readable } from 'svelte/store';

export type Ecr20TokensData = Erc20Token[] | undefined;

export interface Ecr20TokensStore extends Readable<Ecr20TokensData> {
	set: (tokens: Ecr20TokensData) => void;
	reset: () => void;
}

const initEcr20TokensStore = (): Ecr20TokensStore => {
	const INITIAL: Ecr20TokensData = undefined;

	const { subscribe, set } = writable<Ecr20TokensData>(INITIAL);

	return {
		set: (tokens: Ecr20TokensData) => set(tokens),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const erc20TokensStore = initEcr20TokensStore();
