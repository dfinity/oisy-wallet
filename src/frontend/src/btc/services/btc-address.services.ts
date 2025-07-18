import { FRONTEND_DERIVATION_ENABLED } from '$env/address.env';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import {
	getIdbBtcAddressMainnet,
	setIdbBtcAddressMainnet,
	setIdbBtcAddressTestnet,
	updateIdbBtcAddressMainnetLastUsage
} from '$lib/api/idb-addresses.api';
import { getBtcAddress as getSignerBtcAddress } from '$lib/api/signer.api';
import { deriveBtcAddress } from '$lib/ic-pub-key/src/cli';
import {
	certifyAddress,
	loadIdbTokenAddress,
	loadTokenAddress,
	validateAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore,
	type AddressStoreData
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { BtcAddress } from '$lib/types/address';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { assertNonNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

const bitcoinMapper: Record<
	BitcoinNetwork,
	Pick<LoadTokenAddressParams<BtcAddress>, 'addressStore' | 'setIdbAddress'>
> = {
	mainnet: {
		addressStore: btcAddressMainnetStore,
		setIdbAddress: setIdbBtcAddressMainnet
	},
	testnet: {
		addressStore: btcAddressTestnetStore,
		setIdbAddress: setIdbBtcAddressTestnet
	},
	regtest: {
		addressStore: btcAddressRegtestStore,
		// No need to store the regtest in the local storage because it's only used locally.
		setIdbAddress: null
	}
};

const getBtcAddress = async ({
	identity,
	network
}: {
	identity: OptionIdentity;
	network: BitcoinNetwork;
}): Promise<BtcAddress> => {
	if (FRONTEND_DERIVATION_ENABLED) {
		// We use the same logic of the canister method. The potential error will be handled in the consumer.
		assertNonNullish(identity, get(i18n).auth.error.no_internet_identity);

		// HACK: This is working right now ONLY in Beta and Prod because the library is aware of the production Chain Fusion Signer's public key (used by both envs), but not for the staging Chain Fusion Signer (used by all other envs).
		return await deriveBtcAddress(identity.getPrincipal().toString(), network);
	}

	return await getSignerBtcAddress({
		identity,
		network: mapToSignerBitcoinNetwork({ network }),
		nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
	});
};

const loadBtcAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: BitcoinNetwork;
}): Promise<ResultSuccess> =>
	loadTokenAddress<BtcAddress>({
		networkId,
		getAddress: (identity: OptionIdentity) => getBtcAddress({ identity, network }),
		...bitcoinMapper[network]
	});

export const loadBtcAddressTestnet = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		networkId: BTC_TESTNET_NETWORK_ID,
		network: 'testnet'
	});

export const loadBtcAddressRegtest = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		networkId: BTC_REGTEST_NETWORK_ID,
		network: 'regtest'
	});

export const loadBtcAddressMainnet = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		networkId: BTC_MAINNET_NETWORK_ID,
		network: 'mainnet'
	});

export const loadIdbBtcAddressMainnet = (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<BtcAddress>({
		networkId: BTC_MAINNET_NETWORK_ID,
		getIdbAddress: getIdbBtcAddressMainnet,
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage,
		addressStore: btcAddressMainnetStore
	});

const certifyBtcAddressMainnet = (address: BtcAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<BtcAddress>({
		networkId: BTC_MAINNET_NETWORK_ID,
		address,
		getAddress: (identity: OptionIdentity) => getBtcAddress({ identity, network: 'mainnet' }),
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage,
		addressStore: btcAddressMainnetStore
	});

export const validateBtcAddressMainnet = async ($addressStore: AddressStoreData<BtcAddress>) =>
	await validateAddress<BtcAddress>({
		$addressStore,
		certifyAddress: certifyBtcAddressMainnet
	});
