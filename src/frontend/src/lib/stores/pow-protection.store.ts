import type { PostMessageDataResponsePowProtectorProgress } from '$lib/types/post-message';
import { writable, type Readable } from 'svelte/store';

export type AllowSigningStoreData = {
	progress: PostMessageDataResponsePowProtectorProgress;
	nextAllowanceMs?: bigint;
};

export interface AllowSigningStore extends Readable<AllowSigningStoreData> {
	setAllowSigningStoreData: (data: AllowSigningStoreData) => void;
}

export const initAllowSigningStore = (): AllowSigningStore => {
	const { subscribe, set } = writable<AllowSigningStoreData>(undefined);

	return {
		subscribe,

		setAllowSigningStoreData: (data: AllowSigningStoreData) => {
			set(data);
		}
	};
};

export const allowSigningPowStore = initAllowSigningStore();
