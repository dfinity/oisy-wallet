import {
	BTC_MAINNET_TOKEN_ID,
	BTC_REGTEST_TOKEN_ID,
	BTC_TESTNET_TOKEN_ID
} from '$env/tokens/tokens.btc.env';
import {
	getIdbBtcAddressMainnet,
	setIdbBtcAddressMainnet,
	setIdbBtcAddressTestnet,
	updateIdbBtcAddressMainnetLastUsage
} from '$lib/api/idb.api';
import { getBtcAddress } from '$lib/api/signer.api';
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
	type StorageAddressData
} from '$lib/stores/address.store';
import { i18n } from '$lib/stores/i18n.store';
import type { BtcAddress } from '$lib/types/address';
import type { LoadIdbAddressError } from '$lib/types/errors';
import type { OptionIdentity } from '$lib/types/identity';
import type { ResultSuccess } from '$lib/types/utils';
import { mapToSignerBitcoinNetwork } from '$lib/utils/network.utils';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import { get } from 'svelte/store';

type TokenIdBtcPublicNetwork =
	| typeof BTC_MAINNET_TOKEN_ID
	| typeof BTC_TESTNET_TOKEN_ID
	| typeof BTC_REGTEST_TOKEN_ID;

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

const loadBtcAddress = ({
	tokenId,
	network
}: {
	tokenId: TokenIdBtcPublicNetwork;
	network: BitcoinNetwork;
}): Promise<ResultSuccess> =>
	loadTokenAddress<BtcAddress>({
		tokenId,
		getAddress: (identity: OptionIdentity) =>
			getBtcAddress({
				identity,
				network: mapToSignerBitcoinNetwork({ network }),
				nullishIdentityErrorMessage: get(i18n).auth.error.no_internet_identity
			}),
		...bitcoinMapper[network]
	});

export const loadBtcAddressTestnet = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		tokenId: BTC_TESTNET_TOKEN_ID,
		network: 'testnet'
	});

export const loadBtcAddressRegtest = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		tokenId: BTC_REGTEST_TOKEN_ID,
		network: 'regtest'
	});

export const loadBtcAddressMainnet = (): Promise<ResultSuccess> =>
	loadBtcAddress({
		tokenId: BTC_MAINNET_TOKEN_ID,
		network: 'mainnet'
	});

export const loadIdbBtcAddressMainnet = (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<BtcAddress>({
		tokenId: BTC_MAINNET_TOKEN_ID,
		getIdbAddress: getIdbBtcAddressMainnet,
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage,
		addressStore: btcAddressMainnetStore
	});

const certifyBtcAddressMainnet = (address: BtcAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<BtcAddress>({
		tokenId: BTC_MAINNET_TOKEN_ID,
		address,
		getAddress: (identity: OptionIdentity) =>
			getBtcAddress({
				identity,
				network: { mainnet: null }
			}),
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage,
		addressStore: btcAddressMainnetStore
	});

export const validateBtcAddressMainnet = async ($addressStore: StorageAddressData<BtcAddress>) =>
	await validateAddress<BtcAddress>({
		$addressStore,
		certifyAddress: certifyBtcAddressMainnet
	});
