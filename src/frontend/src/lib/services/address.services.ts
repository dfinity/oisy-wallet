import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { SIGNER_MASTER_PUB_KEY } from '$lib/constants/signer.constants';
import type { AddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address } from '$lib/types/address';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export interface LoadTokenAddressParams<T extends Address> {
	networkId: NetworkId;
	getAddress: (identity: NullishIdentity) => Promise<T>;
	addressStore: AddressStore<T>;
}

/**
 * Shared frontend address-derivation flow used by the chain-specific address services.
 *
 * When frontend derivation is enabled and the signer master public key is known, the address is
 * derived locally (mirroring the canister logic) instead of calling the signer API. The shared
 * global `SIGNER_MASTER_PUB_KEY` is always used; each chain only differs in which field(s) of it it
 * reads (e.g. ECDSA `ecdsa.secp256k1` vs Schnorr `schnorr.ed25519`), the derive call and the
 * signer-API fallback, so those are injected by the caller while the guarding logic stays here.
 */
export const deriveTokenAddress = async <T>({
	identity,
	deriveAddress,
	getSignerAddress
}: {
	identity: NullishIdentity;
	deriveAddress: (params: {
		user: string;
		masterPubKey: NonNullable<typeof SIGNER_MASTER_PUB_KEY>;
	}) => T | Promise<T>;
	getSignerAddress: () => Promise<T>;
}): Promise<T> => {
	if (FRONTEND_DERIVATION_ENABLED && nonNullish(SIGNER_MASTER_PUB_KEY)) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is not working for Local environment for now, because the library is not aware of the `dfx_test_1` public key (used by Local deployment).
		return await deriveAddress({
			user: identity.getPrincipal().toString(),
			masterPubKey: SIGNER_MASTER_PUB_KEY
		});
	}

	return await getSignerAddress();
};

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
