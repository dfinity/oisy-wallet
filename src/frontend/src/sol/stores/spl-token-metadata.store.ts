import type { SolanaNetworkType } from '$sol/types/network';
import type { SplTokenAddress } from '$sol/types/spl';
import { writable, type Readable } from 'svelte/store';

export interface SplTokenMetadata {
	name: string;
	symbol: string;
}

/**
 * Keyed by network and then by mint: the same address exists on several clusters and carries
 * different data on each, so a devnet mint must not inherit a mainnet name.
 */
export type SplTokenMetadataData = Partial<
	Record<SolanaNetworkType, Partial<Record<SplTokenAddress, SplTokenMetadata>>>
>;

interface SplTokenMetadataStore extends Readable<SplTokenMetadataData> {
	set: (params: {
		network: SolanaNetworkType;
		metadata: Partial<Record<SplTokenAddress, SplTokenMetadata>>;
	}) => void;
	reset: () => void;
}

/**
 * Names a Token-2022 mint carries in its own account, for mints the wallet does not list.
 *
 * Never evicted within a session: a mint's name does not change under us, and the same unlisted
 * token turns up across many transactions.
 */
const initSplTokenMetadataStore = (): SplTokenMetadataStore => {
	const { subscribe, update, set } = writable<SplTokenMetadataData>({});

	return {
		subscribe,
		set: ({ network, metadata }) =>
			update((state) => ({ ...state, [network]: { ...(state[network] ?? {}), ...metadata } })),
		reset: () => set({})
	};
};

export const splTokenMetadataStore = initSplTokenMetadataStore();
