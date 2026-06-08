import { ETHEREUM_NETWORK_ID } from '$env/networks/networks.eth.env';
import type { EthAddress } from '$eth/types/address';
import { getEthAddress as getSignerEthAddress } from '$lib/api/signer.api';
import { deriveEthAddress } from '$lib/ic-pub-key/src/cli';
import { deriveTokenAddress, loadTokenAddress } from '$lib/services/address.services';
import { ethAddressStore } from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { get } from 'svelte/store';

export const getEthAddress = async (identity: NullishIdentity): Promise<EthAddress> =>
	await deriveTokenAddress<EthAddress>({
		identity,
		deriveAddress: ({ user, masterPubKey }) =>
			deriveEthAddress({
				user,
				pubkey: masterPubKey.ecdsa.secp256k1.pubkey
			}),
		getSignerAddress: () =>
			getSignerEthAddress({
				identity,
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			})
	});

export const loadEthAddress = (): Promise<ResultSuccess> =>
	loadTokenAddress<EthAddress>({
		networkId: ETHEREUM_NETWORK_ID,
		getAddress: getEthAddress,
		addressStore: ethAddressStore
	});
