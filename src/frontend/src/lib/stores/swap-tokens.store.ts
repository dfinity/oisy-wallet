import type { ICTokenReply } from '$declarations/kong_backend/kong_backend.did';
import type { Option } from '$lib/types/utils';
import { writable, type Readable } from 'svelte/store';

export type SwapTokensStoreData = Option<Record<string, any>>;

interface SwapTokensStore extends Readable<SwapTokensStoreData> {
    setKongSwapTokens: (data: SwapTokensStoreData) => void;
}

const initSwapTokensStore = (): SwapTokensStore => {
    const { subscribe, set } = writable<SwapTokensStoreData>(undefined);

    return {
        subscribe,

        setKongSwapTokens(data: SwapTokensStoreData) {
            set(data);
        }
    };
};

// The store is global but will be filled with data only once user opens the Swap modal.
// It is done this way to make sure that we load static kong tokens data just once.
export const swapTokensStore = initSwapTokensStore();
