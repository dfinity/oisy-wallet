import { browser } from '$app/environment';
import type { NetworkId } from '$lib/types/network';
import { isNullish } from '@dfinity/utils';

export const setLocalStorageNetworkId = (networkId: NetworkId) => {
	// Pre-rendering guard
	if (!browser) {
		return;
	}

	try {
		const networkIdKey = networkId.description;

		if (isNullish(networkIdKey)) {
			localStorage.removeItem('oisy_network_id');
		} else {
			localStorage.setItem('oisy_network_id', networkIdKey);
		}
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
	}
};

export const getLocalStorageNetworkId = (): string | undefined => {
	try {
		const { oisy_network_id }: Storage = browser
			? localStorage
			: ({ oisy_network_id: undefined } as unknown as Storage);

		return oisy_network_id === '' ? undefined : oisy_network_id;
	} catch (err: unknown) {
		// We use the local storage for the operational part of the app but, not crucial
		console.error(err);
		return undefined;
	}
};

export const clearLocalStorage = () => localStorage.clear();
