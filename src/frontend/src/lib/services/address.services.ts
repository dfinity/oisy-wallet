import { warnSignOut } from '$lib/services/auth.services';
import type { AddressStore, AddressStoreData } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address } from '$lib/types/address';
import { LoadIdbAddressError } from '$lib/types/errors';
import type { IdbAddress, SetIdbAddressParams } from '$lib/types/idb-addresses';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface LoadTokenAddressParams<T extends Address> {
	networkId: NetworkId;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	setIdbAddress: ((params: SetIdbAddressParams<T>) => Promise<void>) | null;
	addressStore: AddressStore<T>;
}

export const loadTokenAddress = async <T extends Address>({
	networkId,
	getAddress,
	setIdbAddress,
	addressStore
}: LoadTokenAddressParams<T>): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const address = await getAddress(identity);
		addressStore.set({ data: address, certified: true });

		if (nonNullish(setIdbAddress)) {
			await saveTokenAddressForFutureSignIn({ address, identity, setIdbAddress });
		}
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).init.error.loading_address, {
					$symbol: networkId.description ?? ''
				})
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};

const saveTokenAddressForFutureSignIn = async <T extends Address>({
	identity,
	address,
	setIdbAddress
}: {
	identity: OptionIdentity;
	address: T;
	setIdbAddress: (params: SetIdbAddressParams<T>) => Promise<void>;
}) => {
	// Should not happen given the current layout and guards. Moreover, the backend throws an error if the caller is anonymous.
	assertNonNullish(identity, 'Cannot continue without an identity.');

	const now = Date.now();

	await setIdbAddress({
		address: {
			address,
			createdAtTimestamp: now,
			lastUsedTimestamp: now
		},
		principal: identity.getPrincipal()
	});
};

export const loadIdbTokenAddress = async <T extends Address>({
	networkId,
	getIdbAddress,
	updateIdbAddressLastUsage,
	addressStore
}: {
	networkId: NetworkId;
	getIdbAddress: (principal: Principal) => Promise<IdbAddress<T> | undefined>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
	addressStore: AddressStore<T>;
}): Promise<ResultSuccess<LoadIdbAddressError>> => {
	try {
		const { identity } = get(authStore);

		// Should not happen given the current layout and guards.
		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false, err: new LoadIdbAddressError(networkId) };
		}

		const idbAddress = await getIdbAddress(identity.getPrincipal());

		if (isNullish(idbAddress)) {
			return { success: false, err: new LoadIdbAddressError(networkId) };
		}

		const { address } = idbAddress;
		addressStore.set({ data: address, certified: false });

		await updateIdbAddressLastUsage(identity.getPrincipal());
	} catch (_err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			`Error encountered while searching for locally stored ${networkId.description} public address in the browser.`
		);

		return { success: false, err: new LoadIdbAddressError(networkId) };
	}

	return { success: true };
};

export const certifyAddress = async <T extends Address>({
	networkId,
	address,
	getAddress,
	updateIdbAddressLastUsage,
	addressStore
}: {
	networkId: NetworkId;
	address: T;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
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

		await updateIdbAddressLastUsage(identity.getPrincipal());
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
