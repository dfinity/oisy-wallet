import {
	TRACK_LOCK_MODE_ACTIVATED,
	TRACK_LOCK_MODE_DEACTIVATED
} from '$lib/constants/analytics.constants';
import { trackEvent } from '$lib/services/analytics.services';
import { initStorageStore } from '$lib/stores/storage.store';
import { get } from 'svelte/store';

export type AuthLockReason = 'lock' | 'expired';

// `true` is what a lock stored before the reason was kept. It reads as 'lock'.
export type AuthLockStoreData = AuthLockReason | boolean;

interface ToggleLockOptions {
	source?: string;
}

interface LockOptions extends ToggleLockOptions {
	reason?: AuthLockReason;
}

export interface AuthLockStore extends ReturnType<typeof initStorageStore<AuthLockStoreData>> {
	toggleLock: (options?: ToggleLockOptions) => void;
	lock: (options?: LockOptions) => void;
	unlock: (options?: ToggleLockOptions) => void;
}

export const AUTH_LOCK_KEY = 'authLocked';

const createAuthLockStore = (): AuthLockStore => {
	const store = initStorageStore<AuthLockStoreData>({ key: AUTH_LOCK_KEY, defaultValue: false });

	const updateLock = ({
		newValue,
		source = 'unknown'
	}: { newValue: AuthLockReason | false } & ToggleLockOptions): void => {
		const locked = newValue !== false;

		trackEvent({
			name: locked ? TRACK_LOCK_MODE_ACTIVATED : TRACK_LOCK_MODE_DEACTIVATED,
			metadata: { locked: String(locked), source }
		});
		store.set({ key: 'authLocked', value: newValue });
	};

	const toggleLock = ({ source }: ToggleLockOptions = {}): void => {
		updateLock({ newValue: get(store) === false ? 'lock' : false, source });
	};

	const lock = ({ source, reason = 'lock' }: LockOptions = {}): void => {
		updateLock({ newValue: reason, source });
	};

	const unlock = ({ source }: ToggleLockOptions = {}): void => {
		updateLock({ newValue: false, source });
	};

	return { ...store, toggleLock, lock, unlock };
};

export const authLocked = createAuthLockStore();
