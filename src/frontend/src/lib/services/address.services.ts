import { warnSignOut } from '$lib/services/auth.services';
import type { AddressStore, AddressStoreData } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address } from '$lib/types/address';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface LoadTokenAddressParams<T extends Address> {
	networkId: NetworkId;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	addressStore: AddressStore<T>;
}

export const loadTokenAddress = async <T extends Address>({
	networkId,
	getAddress,
	addressStore
}: LoadTokenAddressParams<T>): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const address = await getAddress(identity);
		addressStore.set({ data: address, certified: true });
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).init.error.loading_address, {
					$symbol: `${networkId.description}`
				})
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};

export const certifyAddress = async <T extends Address>({
	networkId,
	address,
	getAddress,
	addressStore
}: {
	networkId: NetworkId;
	address: T;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	addressStore: AddressStore<T>;
}): Promise<ResultSuccess<string>> => {
	try {
		const { identity } = get(authStore);

		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false, err: 'Using the dapp with an anonymous user if not supported.' };
		}

		const certifiedAddress = await getAddress(identity);

		if (address.toLowerCase() !== certifiedAddress.toLowerCase()) {
			return {
				success: false,
				err: `The address used to load the data did not match your actual ${networkId.description} wallet address, which is why your session was ended. Please sign in again to reload your own data.`
			};
		}

		addressStore.set({ data: address, certified: true });
	} catch (_err: unknown) {
		addressStore.reset();

		return { success: false, err: `Error while loading the ${networkId.description} address.` };
	}

	return { success: true };
};

export const validateAddress = async <T extends Address>({
	$addressStore,
	certifyAddress
}: {
	$addressStore: AddressStoreData<T>;
	certifyAddress: (address: T) => Promise<ResultSuccess<string>>;
}) => {
	if (isNullish($addressStore)) {
		// No address is loaded, we don't have to verify it
		return;
	}

	if ($addressStore.certified) {
		// The address is certified, all good
		return;
	}

	const { success, err } = await certifyAddress($addressStore.data);

	if (success) {
		// The address is valid
		return;
	}

	await warnSignOut(err ?? 'Error while certifying your address');
};
