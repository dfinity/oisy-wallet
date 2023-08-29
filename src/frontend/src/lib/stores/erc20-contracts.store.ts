import type { Erc20Contract } from '$lib/types/erc20';
import { writable, type Readable } from 'svelte/store';

export interface Ecr20ContractsStore extends Readable<Erc20Contract[]> {
	set: (contracts: Erc20Contract[]) => void;
	reset: () => void;
}

const initEcr20ContractsStore = (): Ecr20ContractsStore => {
	const INITIAL: Erc20Contract[] = [];

	const { subscribe, set } = writable<Erc20Contract[]>(INITIAL);

	return {
		set: (contracts: Erc20Contract[]) => set(contracts),
		reset: () => set(INITIAL),
		subscribe
	};
};

export const erc20ContractsStore = initEcr20ContractsStore();
