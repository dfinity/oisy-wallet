import { getEthAddress } from '$lib/api/backend.api';
import { getIdbEthAddress, setIdbEthAddress } from '$lib/api/idb.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { ETH_ADDRESS } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const loadAddress = async (): Promise<{ success: boolean }> => {
	try {
		const { identity } = get(authStore);

		const address = await getEthAddress(identity);
		addressStore.set({ address, certified: true });

		await saveEthAddressForFutureSignIn({ address, identity });
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

const saveEthAddressForFutureSignIn = async ({
	identity,
	address
}: {
	identity: OptionIdentity;
	address: ETH_ADDRESS;
}) => {
	// Should not happen given the current layout and guards. Moreover, the backend throws an error if the caller is anonymous.
	assertNonNullish(identity, 'Cannot continue without an identity.');

	const now = Date.now();

	await setIdbEthAddress({
		address: {
			address,
			createdAtTimestamp: now,
			lastUsedTimestamp: now
		},
		principal: identity.getPrincipal()
	});
};

export const loadIdbAddress = async (): Promise<{ success: boolean }> => {
	try {
		const { identity } = get(authStore);

		// Should not happen given the current layout and guards.
		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false };
		}

		const idbEthAddress = await getIdbEthAddress(identity.getPrincipal());

		if (isNullish(idbEthAddress)) {
			return { success: false };
		}

		const { address } = idbEthAddress;
		addressStore.set({ address, certified: false });
	} catch (err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			'Error encountered while searching for a locally stored public address in the browser.'
		);

		return { success: false };
	}

	return { success: true };
};

export const certifyAddress = async (
	address: string
): Promise<{ success: boolean; err?: string }> => {
	try {
		const { identity } = get(authStore);

		const certifiedAddress = await getEthAddress(identity);

		if (address.toLowerCase() !== certifiedAddress.toLowerCase()) {
			return {
				success: false,
				err: 'The address used to load the data did not match your actual wallet address, which is why your session was ended. Please sign in again to reload your own data.'
			};
		}

		addressStore.set({ address, certified: true });

		await saveEthAddressForFutureSignIn({ address, identity });
	} catch (err: unknown) {
		addressStore.reset();

		return { success: false, err: 'Error while loading the ETH address.' };
	}

	return { success: true };
};
