import { getEthAddress } from '$lib/api/backend.api';
import { ethAddressStore } from '$lib/stores/eth.store';
import { toasts } from '$lib/stores/toasts.store';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadEthAddress = async () => {
	const addressStore = get(ethAddressStore);

	// We load the eth address once per session
	if (nonNullish(addressStore)) {
		return;
	}

	try {
		const address = await getEthAddress();
		ethAddressStore.set(address);
	} catch (err: unknown) {
		ethAddressStore.reset();

		toasts.error({
			text: 'Error while loading the eth address',
			detail: err
		});
	}
};
