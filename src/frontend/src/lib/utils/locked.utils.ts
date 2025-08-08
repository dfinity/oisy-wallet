import { TRACK_lOCK_MODE_ACTIVATED } from '$lib/constants/analytics.contants';
import { trackEvent } from '$lib/services/analytics.services';
import { initStorageStore } from '$lib/stores/storage.store';
import { get } from 'svelte/store';

interface SetAuthLockOptions {
	locked: boolean;
	source?: string;
}

export interface AuthLockStore extends ReturnType<typeof initStorageStore<boolean>> {
	setLock: (options: SetAuthLockOptions) => void;
	toggleLock: (options: Omit<SetAuthLockOptions, 'locked'>) => void;
}

const createAuthLockStore = (): AuthLockStore => {
	const store = initStorageStore<boolean>({
		key: 'authLocked',
		defaultValue: false
	});

	const setLock = ({ locked, source }: SetAuthLockOptions): void => {
		trackEvent({
			name: TRACK_lOCK_MODE_ACTIVATED,
			metadata: {
				locked: String(locked),
				source: `${source}`
			}
		});

		store.set({ key: 'authLocked', value: locked });
	};

	const toggleLock = (options: Omit<SetAuthLockOptions, 'locked'>) => {
		const current = get(store);
		setLock({ ...options, locked: !current });
	};

	return {
		...store,
		setLock,
		toggleLock
	};
};

export const authLocked = createAuthLockStore();