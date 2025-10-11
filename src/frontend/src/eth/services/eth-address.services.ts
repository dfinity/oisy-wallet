import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import {
	getIdbEthAddress,
	setIdbEthAddress,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb-addresses.api';
import { getEthAddress as getSignerEthAddress } from '$lib/api/signer.api';
import { SIGNER_MASTER_PUB_KEY } from '$lib/constants/signer.constants';
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
import { assertNonNullish, nonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

export const getEthAddress = async (identity: OptionIdentity): Promise<EthAddress> => {
	if (FRONTEND_DERIVATION_ENABLED && nonNullish(SIGNER_MASTER_PUB_KEY)) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is not working for Local environment for now, because the library is not aware of the `dfx_test_1` public key (used by Local deployment).
		return await deriveEthAddress(
			identity.getPrincipal().toString(),
			SIGNER_MASTER_PUB_KEY.ecdsa.secp256k1.pubkey
		);
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
