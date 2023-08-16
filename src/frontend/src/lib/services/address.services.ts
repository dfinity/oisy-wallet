import { getEthAddress } from '$lib/api/backend.api';
import { addressStore } from '$lib/stores/address.store';
import { toastsError } from '$lib/stores/toasts.store';
import { nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadAddress = async () => {
	const store = get(addressStore);

	// We load the eth address once per session
	if (nonNullish(store)) {
		return;
	}

	try {
		const address = await getEthAddress();
		addressStore.set(address);
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ETH address.' },
			err
		});
	}
};
