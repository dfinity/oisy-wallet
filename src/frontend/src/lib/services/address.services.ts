import { getEthAddress } from '$lib/api/backend.api';
import { getIdbEthAddress, setIdbEthAddress } from '$lib/api/idb.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import { isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadAddress = async (): Promise<{ success: boolean }> => {
	const { identity } = get(authStore);

	// Should not happen given the current layout and guards
	if (isNullish(identity)) {
		toastsError({
			msg: { text: 'Cannot continue without an identity.' }
		});

		return { success: false };
	}

	try {
		// TODO: just for test, if we've got IDB data then the popup should not even be displayed
		if (!identity.getPrincipal().isAnonymous()) {
			const idbEthAddress = await getIdbEthAddress(identity.getPrincipal());

			if (nonNullish(idbEthAddress)) {
				const { address } = idbEthAddress;
				addressStore.set(address);

				// TODO: perform a non blocker async security check that the address still match await getEthAddress(identity)

				return { success: true };
			}
		}

		// Note that the backend throws an error if the caller is an anonymous
		const address = await getEthAddress(identity);
		addressStore.set(address);

		const now = Date.now();

		await setIdbEthAddress({
			address: {
				address,
				createdAtTimestamp: now,
				lastUsedTimestamp: now
			},
			principal: identity.getPrincipal()
		});
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: { text: 'Error while loading the ETH address.' },
			err
		});

		return { success: false };
	}

	return { success: true };
};
