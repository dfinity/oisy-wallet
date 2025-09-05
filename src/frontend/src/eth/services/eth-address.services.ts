import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	getIdbEthAddress,
	setIdbEthAddress,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb-addresses.api';
import { getEthAddress as getSignerEthAddress } from '$lib/api/signer.api';
import { deriveEthAddress } from '$lib/ic-pub-key/src/cli';
import {
	certifyAddress,
	loadIdbTokenAddress,
	loadTokenAddress,
	validateAddress
} from '$lib/services/address.services';
import { ethAddressStore, type AddressStoreData } from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const getEthAddress = async (identity: OptionIdentity): Promise<EthAddress> => {
	if (FRONTEND_DERIVATION_ENABLED) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is working right now ONLY in Beta and Prod because the library is aware of the production Chain Fusion Signer's public key (used by both envs), but not for the staging Chain Fusion Signer (used by all other envs).
		return await deriveEthAddress(identity.getPrincipal().toString());
	}

	return await getSignerEthAddress({
		identity,
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
};

export const loadEthAddress = (): Promise<ResultSuccess> =>
	loadTokenAddress<EthAddress>({
		networkId: ETHEREUM_NETWORK_ID,
		getAddress: getEthAddress,
		setIdbAddress: setIdbEthAddress,
		addressStore: ethAddressStore
	});

export const loadIdbEthAddress = (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<EthAddress>({
		networkId: ETHEREUM_NETWORK_ID,
		getIdbAddress: getIdbEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage,
		addressStore: ethAddressStore
	});

const certifyEthAddress = (address: EthAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<EthAddress>({
		networkId: ETHEREUM_NETWORK_ID,
		address,
		getAddress: getEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage,
		addressStore: ethAddressStore
	});

export const validateEthAddress = async ($addressStore: AddressStoreData<EthAddress>) =>
	await validateAddress<EthAddress>({
		$addressStore,
		certifyAddress: certifyEthAddress
	});
