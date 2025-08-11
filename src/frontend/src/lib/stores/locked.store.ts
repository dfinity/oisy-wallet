import {
	TRACK_lOCK_MODE_ACTIVATED,
	TRACK_lOCK_MODE_DEACTIVATED
} from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { initStorageStore } from '$lib/stores/storage.store';
import { get } from 'svelte/store';

interface ToggleLockOptions {
	source?: string;
}

export interface AuthLockStore extends ReturnType<typeof initStorageStore<boolean>> {
	toggleLock: (options: ToggleLockOptions) => void;
    lock: (options: ToggleLockOptions) => void;  
    unlock: (options: ToggleLockOptions) => void; 
}

const createAuthLockStore = (): AuthLockStore => {
	const store = initStorageStore<boolean>({ key: 'authLocked', defaultValue: false });

    const updateLock = (newValue: boolean, source: string): void => {
        trackEvent({
            name: newValue ? TRACK_lOCK_MODE_ACTIVATED : TRACK_lOCK_MODE_DEACTIVATED,
            metadata: { locked: String(newValue), source }
        });
        store.set({ key: 'authLocked', value: newValue });
    };

    const toggleLock = ({ source }: ToggleLockOptions): void => {
        updateLock(!get(store), source ?? 'unknown');
    };

    const lock = ({ source }: ToggleLockOptions): void => {
        updateLock(true, source ?? 'unknown');
    };

    const unlock = ({ source }: ToggleLockOptions): void => {
        updateLock(false, source ?? 'unknown');
    };

    return { ...store, toggleLock, lock, unlock };
};

export const authLocked = createAuthLockStore();
