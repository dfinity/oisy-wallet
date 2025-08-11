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
}

const createAuthLockStore = (): AuthLockStore => {
	const store = initStorageStore<boolean>({
		key: 'authLocked',
		defaultValue: false
	});

	const toggleLock = ({ source }: ToggleLockOptions): void => {
		const current = get(store);
		const newValue = !current;

		trackEvent({
			name: newValue ? TRACK_lOCK_MODE_ACTIVATED : TRACK_lOCK_MODE_DEACTIVATED,
			metadata: {
				locked: String(newValue),
				source: `${source}`
			}
		});

		store.set({ key: 'authLocked', value: newValue });
	};

	return {
		...store,
		toggleLock
	};
};

export const authLocked = createAuthLockStore();
