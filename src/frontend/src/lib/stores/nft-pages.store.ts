import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type NftPagesStoreData = Option<{
	originSelectedNetwork: OptionNetworkId;
}>;

export interface NftPagesStore extends Readable<NftPagesStoreData> {
	setOriginSelectedNetwork: (networkId: OptionNetworkId) => void;
}

export const initNftPagesStore = (): NftPagesStore => {
	const { subscribe, set } = writable<NftPagesStoreData>({
		originSelectedNetwork: undefined
	});

	return {
		subscribe,

		setOriginSelectedNetwork: (networkId: OptionNetworkId) => {
			set({ originSelectedNetwork: networkId });
		}
	};
};

export interface NftPagesContext extends NftPagesStore {}

export const NFT_PAGES_CONTEXT_KEY = Symbol('nft-pages');
