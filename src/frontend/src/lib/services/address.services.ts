import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { BTC_MAINNET_NETWORK_ID } from '$env/networks/networks.btc.env';
import { SOLANA_MAINNET_NETWORK_ID } from '$env/networks/networks.sol.env';
import { SIGNER_MASTER_PUB_KEY } from '$lib/constants/signer.constants';
import {
	PLAUSIBLE_EVENT_CONTEXTS,
	PLAUSIBLE_EVENT_ERROR_CODES,
	PLAUSIBLE_EVENT_ERROR_SEVERITIES,
	PLAUSIBLE_EVENT_ERROR_SUBCODES,
	PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR
} from '$lib/enums/plausible';
import { trackAppError } from '$lib/services/analytics.services';
import { recordFailedAddress } from '$lib/services/failed-addresses.services';
import type { AddressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { failedAddresses } from '$lib/stores/failed-addresses.store';
import { i18n } from '$lib/stores/i18n.store';
import type { Address } from '$lib/types/address';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { consoleError } from '$lib/utils/console.utils';
import { assertNonNullish, isNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const addressSubcontext = (networkId: NetworkId): PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR =>
	networkId === BTC_MAINNET_NETWORK_ID
		? PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.BTC_ADDRESS
		: networkId === SOLANA_MAINNET_NETWORK_ID
			? PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.SOL_ADDRESS
			: PLAUSIBLE_EVENT_SUBCONTEXT_APP_ERROR.ETH_ADDRESS;

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

export type LoadTokenAddressFailureReason = 'session-invalid' | 'derivation-failed';

export const loadTokenAddress = async <T extends Address>({
	networkId,
	getAddress,
	addressStore
}: LoadTokenAddressParams<T>): Promise<ResultSuccess<LoadTokenAddressFailureReason>> => {
	const { identity } = get(authStore);

	// Checked here rather than inferred from the caught error: `deriveTokenAddress` asserts on a
	// nullish identity, and recognising that by matching its i18n message would break the moment the
	// copy changes. The two causes need opposite handling — a lost session should sign the user out,
	// a derivation bug must not — so they must be distinguishable reliably.
	if (isNullish(identity)) {
		addressStore.reset();

		return { success: false, err: 'session-invalid' };
	}

	try {
		const address = await getAddress(identity);
		addressStore.set({ data: address, certified: true });

		// A chain that recovers stops being treated as failed, without needing a reload.
		failedAddresses.remove(networkId);
	} catch (err: unknown) {
		addressStore.reset();

		consoleError(`Failed to derive the ${networkId.description} address.`, err);

		// No toast here: with two callers and a retry loop, one toast per chain per attempt is what
		// produced the pile-up. `recordFailedAddress` aggregates and deduplicates instead.
		recordFailedAddress(networkId);

		trackAppError({
			context: PLAUSIBLE_EVENT_CONTEXTS.ADDRESS_DERIVATION,
			subcontext: addressSubcontext(networkId),
			code: PLAUSIBLE_EVENT_ERROR_CODES.ADDRESS_DERIVATION_FAILED,
			subcode: PLAUSIBLE_EVENT_ERROR_SUBCODES.DERIVE_THREW,
			severity: PLAUSIBLE_EVENT_ERROR_SEVERITIES.MAJOR,
			err
		});

		return { success: false, err: 'derivation-failed' };
	}

	return { success: true };
};
