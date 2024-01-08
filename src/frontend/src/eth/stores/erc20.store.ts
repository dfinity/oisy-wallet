import type { Erc20Token } from '$eth/types/erc20';
import { writable, type Readable } from 'svelte/store';

export type Ecr20TokensData = Erc20Token[] | undefined;

export interface Ecr20TokensStore extends Readable<Ecr20TokensData> {
	set: (tokens: Ecr20TokensData) => void;
	add: (token: Erc20Token) => void;
	reset: () => void;
}

const initEcr20TokensStore = (): Ecr20TokensStore => {
	const INITIAL: Ecr20TokensData = undefined;

	const { subscribe, set, update } = writable<Ecr20TokensData>(INITIAL);

	return {
		set: (tokens: Ecr20TokensData) => set(tokens),
		add: (token: Erc20Token) =>
			update((state) => [
				...(state ?? []).filter(
					({ address }) => address.toLowerCase() !== token.address.toLowerCase()
				),
				token
			]),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const erc20TokensStore = initEcr20TokensStore();
