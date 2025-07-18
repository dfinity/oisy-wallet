import type { ICTokenReply } from '$declarations/kong_backend/kong_backend.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type KongSwapTokensStoreData = Option<Record<string, ICTokenReply>>;

interface KongSwapTokensStore extends Readable<KongSwapTokensStoreData> {
	setKongSwapTokens: (data: KongSwapTokensStoreData) => void;
}

const initKongSwapTokensStore = (): KongSwapTokensStore => {
	const { subscribe, set } = writable<KongSwapTokensStoreData>(undefined);

	return {
		subscribe,

		setKongSwapTokens: (data: KongSwapTokensStoreData) => {
			set(data);
		}
	};
};

// The store is global but will be filled with data only once user opens the Swap modal.
// It is done this way to make sure that we load static kong tokens data just once.
export const kongSwapTokensStore = initKongSwapTokensStore();
