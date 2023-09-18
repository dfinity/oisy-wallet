import type { Info } from '$declarations/airdrop/airdrop.did';
import { writable, type Readable } from 'svelte/types/runtime/store';

export type AirdropData = Info | undefined | null;

export interface AirdropStore extends Readable<AirdropData> {
	set: (info: Info | null) => void;
	reset: () => void;
}

const initAirdropStore = (): AirdropStore => {
	const { subscribe, set } = writable<AirdropData>(undefined);

	return {
		set: (info: Info | null) => set(info),
		reset: () => set(undefined),
		subscribe
	};
};

export const airdropStore = initAirdropStore();
