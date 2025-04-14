import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import { getIdbEthAddress, setIdbEthAddress, updateIdbEthAddressLastUsage } from '$lib/api/idb.api';
import { getEthAddress } from '$lib/api/signer.api';
import {
	certifyAddress,
	loadIdbTokenAddress,
	loadTokenAddress,
	validateAddress
} from '$lib/services/address.services';
import { ethAddressStore, type StorageAddressData } from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { EthAddress } from '$lib/types/address';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { get } from 'svelte/store';

export const loadEthAddress = (): Promise<ResultSuccess> =>
	loadTokenAddress<EthAddress>({
		networkId: ETHEREUM_NETWORK_ID,
		getAddress: (identity: OptionIdentity) =>
			getEthAddress({
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			}),
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
		getAddress: (identity: OptionIdentity) =>
			getEthAddress({
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			}),
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage,
		addressStore: ethAddressStore
	});

export const validateEthAddress = async ($addressStore: StorageAddressData<EthAddress>) =>
	await validateAddress<EthAddress>({
		$addressStore,
		certifyAddress: certifyEthAddress
	});
