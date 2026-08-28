import type { SplTokenAddress } from '$sol/types/spl';
import { writable, type Readable } from 'svelte/store';

export interface SplTokenMetadata {
	name: string;
	symbol: string;
}

export type SplTokenMetadataData = Record<SplTokenAddress, SplTokenMetadata>;

interface SplTokenMetadataStore extends Readable<SplTokenMetadataData> {
	set: (metadata: SplTokenMetadataData) => void;
	reset: () => void;
}

/**
 * Names a Token-2022 mint carries in its own account, for mints the wallet does not list.
 *
 * Keyed by mint and never evicted within a session: a mint's name does not change under us, and
 * the same unlisted token turns up across many transactions.
 */
const initSplTokenMetadataStore = (): SplTokenMetadataStore => {
	const { subscribe, update, set } = writable<SplTokenMetadataData>({});

	return {
		subscribe,
		set: (metadata: SplTokenMetadataData) => update((state) => ({ ...state, ...metadata })),
		reset: () => set({})
	};
};

export const splTokenMetadataStore = initSplTokenMetadataStore();
