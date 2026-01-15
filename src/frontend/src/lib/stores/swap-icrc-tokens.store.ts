import type { IcTokenWithIcrc2Supported } from '$icp/types/ic-token';
import { writable, type Readable } from 'svelte/store';

export type SwappableTokensStoreData = IcTokenWithIcrc2Supported[];

export interface SwappableTokensStore extends Readable<SwappableTokensStoreData> {
	setSwappableTokens: (data: SwappableTokensStoreData) => void;
}

const initSwappableIcrcTokensStore = (): SwappableTokensStore => {
	const { subscribe, set } = writable<SwappableTokensStoreData>(undefined);

	return {
		subscribe,

		setSwappableTokens: (data: SwappableTokensStoreData) => {
			set(data);
		}
	};
};

export const swappableIcrcTokensStore = initSwappableIcrcTokensStore();
