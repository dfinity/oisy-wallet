import type { NetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type NftPagesStoreData = Option<{
	originSelectedNetwork: NetworkId | undefined;
}>;

export interface NftPagesStore extends Readable<NftPagesStoreData> {
	setOriginSelectedNetwork: (networkId: NetworkId | undefined) => void;
}

export const initNftPagesStore = (): NftPagesStore => {
	const { subscribe, set } = writable<NftPagesStoreData>({
		originSelectedNetwork: undefined
	});

	return {
		subscribe,

		setOriginSelectedNetwork: (networkId: NetworkId | undefined) => {
			set({ originSelectedNetwork: networkId });
		}
	};
};

export interface NftPagesContext {
	store: NftPagesStore;
}

export const NFT_PAGES_CONTEXT_KEY = Symbol('nft-pages');
