import type { BtcAddress } from '$btc/types/address';
import {
	BTC_MAINNET_NETWORK_ID,
	BTC_REGTEST_NETWORK_ID,
	BTC_TESTNET_NETWORK_ID
} from '$env/networks/networks.btc.env';
import { getBtcAddress as getSignerBtcAddress } from '$lib/api/signer.api';
import {
	btcAddressMainnet,
	btcAddressRegtest,
	btcAddressTestnet
} from '$lib/derived/address.derived';
import { deriveBtcAddress } from '$lib/ic-pub-key/src/cli';
import {
	deriveTokenAddress,
	loadTokenAddress,
	type LoadTokenAddressParams
} from '$lib/services/address.services';
import {
	btcAddressMainnetStore,
	btcAddressRegtestStore,
	btcAddressTestnetStore
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { NullishIdentity } from '$lib/types/identity';
import type { NetworkId } from '$lib/types/network';
import type { ResultSuccess } from '$lib/types/utils';
import {
	isNetworkIdBTCRegtest,
	isNetworkIdBTCTestnet,
	mapToSignerBitcoinNetwork
} from '$lib/utils/network.utils';
import type { BitcoinNetwork } from '@icp-sdk/canisters/ckbtc';
import { get } from 'svelte/store';

const bitcoinMapper: Record<
	BitcoinNetwork,
	Pick<LoadTokenAddressParams<BtcAddress>, 'addressStore'>
> = {
	mainnet: {
		addressStore: btcAddressMainnetStore
	},
	testnet: {
		addressStore: btcAddressTestnetStore
	},
	regtest: {
		addressStore: btcAddressRegtestStore
	}
};

export const getBtcAddress = async ({
	identity,
	network
}: {
	identity: NullishIdentity;
	network: BitcoinNetwork;
}): Promise<BtcAddress> =>
	await deriveTokenAddress<BtcAddress>({
		identity,
		deriveAddress: ({ user, masterPubKey }) =>
			deriveBtcAddress({
				user,
				network,
				pubkey: masterPubKey.ecdsa.secp256k1.pubkey
			}),
		getSignerAddress: () =>
			getSignerBtcAddress({
				identity,
				network: mapToSignerBitcoinNetwork({ network }),
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			})
	});

const loadBtcAddress = ({
	networkId,
	network
}: {
	networkId: NetworkId;
	network: BitcoinNetwork;
}): Promise<ResultSuccess> =>
	loadTokenAddress<BtcAddress>({
		networkId,
		getAddress: (identity: NullishIdentity) => getBtcAddress({ identity, network }),
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

/**
 * Get the BTC source address for a given network ID
 * @param networkId - The network ID
 * @returns The source address string
 */
export const getBtcSourceAddress = (networkId: NetworkId | undefined): string =>
	(isNetworkIdBTCTestnet(networkId)
		? get(btcAddressTestnet)
		: isNetworkIdBTCRegtest(networkId)
			? get(btcAddressRegtest)
			: get(btcAddressMainnet)) ?? '';
