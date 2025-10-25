import type { TokenTypes } from '$lib/enums/token-types';
import type { OptionNetworkId } from '$lib/types/network';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type NftPagesStoreData = Option<{
	assetsTab?: TokenTypes;
	originSelectedNetwork: OptionNetworkId;
}>;

export interface NftPagesStore extends Readable<NftPagesStoreData> {
	setAssetsTab: (tab: TokenTypes) => void;
	setOriginSelectedNetwork: (networkId: OptionNetworkId) => void;
}

const initialStore: NftPagesStoreData = {
	assetsTab: undefined,
	originSelectedNetwork: undefined
};

export const initNftPagesStore = (): NftPagesStore => {
	const { subscribe, update } = writable<NftPagesStoreData>(initialStore);

	return {
		subscribe,

		setAssetsTab: (tab: TokenTypes) => {
			update((curr) => ({
				...(curr ?? initialStore),
				assetsTab: tab
			}));
		},

		setOriginSelectedNetwork: (networkId: OptionNetworkId) => {
			update((curr) => ({
				...(curr ?? initialStore),
				originSelectedNetwork: networkId
			}));
		}
	};
};

export interface NftPagesContext extends NftPagesStore {}

export const NFT_PAGES_CONTEXT_KEY = Symbol('nft-pages');
