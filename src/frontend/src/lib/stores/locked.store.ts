import {
	TRACK_LOCK_MODE_ACTIVATED,
	TRACK_LOCK_MODE_DEACTIVATED
} from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { initStorageStore } from '$lib/stores/storage.store';
import { get } from 'svelte/store';

interface ToggleLockOptions {
	source?: string;
}

export interface AuthLockStore extends ReturnType<typeof initStorageStore<boolean>> {
	toggleLock: (options?: ToggleLockOptions) => void;
	lock: (options?: ToggleLockOptions) => void;
	unlock: (options?: ToggleLockOptions) => void;
}

const createAuthLockStore = (): AuthLockStore => {
	const store = initStorageStore<boolean>({ key: 'authLocked', defaultValue: false });

	const updateLock = ({
		newValue,
		source = 'unknown'
	}: { newValue: boolean } & ToggleLockOptions): void => {
		trackEvent({
			name: newValue ? TRACK_LOCK_MODE_ACTIVATED : TRACK_LOCK_MODE_DEACTIVATED,
			metadata: { locked: String(newValue), source }
		});
		store.set({ key: 'authLocked', value: newValue });
	};

	const toggleLock = ({ source }: ToggleLockOptions = {}): void => {
		updateLock({ newValue: !get(store), source });
	};

	const lock = ({ source }: ToggleLockOptions = {}): void => {
		updateLock({ newValue: true, source });
	};

	const unlock = ({ source }: ToggleLockOptions = {}): void => {
		updateLock({ newValue: false, source });
	};

	return { ...store, toggleLock, lock, unlock };
};

export const authLocked = createAuthLockStore();
