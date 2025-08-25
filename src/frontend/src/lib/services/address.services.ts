import type { BitcoinNetwork as SignerBitcoinNetwork } from '$declarations/signer/signer.did';
import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN_ID, BTC_TESTNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import {
	getIdbBtcAddressMainnet,
	getIdbEthAddress,
	setIdbBtcAddressMainnet,
	setIdbBtcAddressTestnet,
	setIdbEthAddress,
	updateIdbBtcAddressMainnetLastUsage,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb.api';
import { getBtcAddress, getEthAddress } from '$lib/api/signer.api';
import { warnSignOut } from '$lib/services/auth.services';
import {
	btcAddressMainnetStore,
	btcAddressTestnetStore,
	ethAddressStore,
	type AddressStore,
	type StorageAddressData
} from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import { LoadIdbAddressError } from '$lib/types/errors';
import type { IdbAddress, SetIdbAddressParams } from '$lib/types/idb';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import type { ResultSuccess, ResultSuccessReduced } from '$lib/types/utils';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import { reduceResults } from '$lib/utils/results.utils';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
import type { Principal } from '@dfinity/principal';
import { assertNonNullish, isNullish } from '@dfinity/utils';
import { get } from 'svelte/store';

type LoadTokenAddressParams<T extends Address> = {
	tokenId: TokenId;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	setIdbAddress: (params: SetIdbAddressParams<T>) => Promise<void>;
	addressStore: AddressStore<T>;
};

const loadTokenAddress = async <T extends Address>({
	tokenId,
	getAddress,
	setIdbAddress,
	addressStore
}: LoadTokenAddressParams<T>): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const address = await getAddress(identity);
		addressStore.set({ data: address, certified: true });

		await saveTokenAddressForFutureSignIn({ address, identity, setIdbAddress });
	} catch (err: unknown) {
		addressStore.reset();

		toastsError({
			msg: {
				text: replacePlaceholders(get(i18n).init.error.loading_address, {
					$symbol: tokenId.description ?? ''
				})
			},
			err
		});

		return { success: false };
	}

	return { success: true };
};

// We use the Testnet address for Regtest.
type TokenIdBtcPublicNetwork = typeof BTC_MAINNET_TOKEN_ID | typeof BTC_TESTNET_TOKEN_ID;
type BtcPublicNetwork = Exclude<BitcoinNetwork, 'regtest'>;

const bitcoinMapper: Record<
	BtcPublicNetwork,
	Pick<LoadTokenAddressParams<BtcAddress>, 'addressStore' | 'setIdbAddress'>
> = {
	mainnet: {
		addressStore: btcAddressMainnetStore,
		setIdbAddress: setIdbBtcAddressMainnet
	},
	testnet: {
		addressStore: btcAddressTestnetStore,
		setIdbAddress: setIdbBtcAddressTestnet
	}
};

const bitcoinNetworkMapper: Record<BtcPublicNetwork, SignerBitcoinNetwork> = {
	mainnet: { mainnet: null },
	testnet: { testnet: null }
};

const loadBtcAddress = async ({
	tokenId,
	network
}: {
	tokenId: TokenIdBtcPublicNetwork;
	network: BtcPublicNetwork;
}): Promise<ResultSuccess> =>
	loadTokenAddress<BtcAddress>({
		tokenId,
		getAddress: (identity: OptionIdentity) =>
			getBtcAddress({
				identity,
				network: bitcoinNetworkMapper[network]
			}),
		...bitcoinMapper[network]
	});

export const loadBtcAddressTestnet = async (): Promise<ResultSuccess> =>
	loadBtcAddress({
		tokenId: BTC_TESTNET_TOKEN_ID,
		network: 'testnet'
	});

const loadBtcAddressMainnet = async (): Promise<ResultSuccess> =>
	loadBtcAddress({
		tokenId: BTC_MAINNET_TOKEN_ID,
		network: 'mainnet'
	});

const loadEthAddress = async (): Promise<ResultSuccess> =>
	loadTokenAddress<EthAddress>({
		tokenId: ETHEREUM_TOKEN_ID,
		getAddress: getEthAddress,
		setIdbAddress: setIdbEthAddress,
		addressStore: ethAddressStore
	});

export const loadAddresses = async (tokenIds: TokenId[]): Promise<ResultSuccess> => {
	const results = await Promise.all([
		NETWORK_BITCOIN_ENABLED && tokenIds.includes(BTC_MAINNET_TOKEN_ID)
			? loadBtcAddressMainnet()
			: Promise.resolve({ success: true }),
		tokenIds.includes(ETHEREUM_TOKEN_ID) ? loadEthAddress() : Promise.resolve({ success: true })
	]);

	return { success: results.every(({ success }) => success) };
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

const loadIdbTokenAddress = async <T extends Address>({
	tokenId,
	getIdbAddress,
	updateIdbAddressLastUsage,
	addressStore
}: {
	tokenId: TokenId;
	getIdbAddress: (principal: Principal) => Promise<IdbAddress<T> | undefined>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
	addressStore: AddressStore<T>;
}): Promise<ResultSuccess<LoadIdbAddressError>> => {
	try {
		const { identity } = get(authStore);

		// Should not happen given the current layout and guards.
		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false, err: new LoadIdbAddressError(tokenId) };
		}

		const idbAddress = await getIdbAddress(identity.getPrincipal());

		if (isNullish(idbAddress)) {
			return { success: false, err: new LoadIdbAddressError(tokenId) };
		}

		const { address } = idbAddress;
		addressStore.set({ data: address, certified: false });

		await updateIdbAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			`Error encountered while searching for locally stored ${tokenId.description} public address in the browser.`
		);

		return { success: false, err: new LoadIdbAddressError(tokenId) };
	}

	return { success: true };
};

const loadIdbBtcAddressMainnet = async (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<BtcAddress>({
		tokenId: BTC_MAINNET_TOKEN_ID,
		getIdbAddress: getIdbBtcAddressMainnet,
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage,
		addressStore: btcAddressMainnetStore
	});

const loadIdbEthAddress = async (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<EthAddress>({
		tokenId: ETHEREUM_TOKEN_ID,
		getIdbAddress: getIdbEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage,
		addressStore: ethAddressStore
	});

export const loadIdbAddresses = async (): Promise<ResultSuccessReduced<LoadIdbAddressError>> => {
	const results = await Promise.all([
		NETWORK_BITCOIN_ENABLED
			? loadIdbBtcAddressMainnet()
			: Promise.resolve<ResultSuccess<LoadIdbAddressError>>({ success: true }),
		loadIdbEthAddress()
	]);

	const { success, err } = reduceResults<LoadIdbAddressError>(results);

	return { success, err };
};

const certifyAddress = async <T extends Address>({
	tokenId,
	address,
	getAddress,
	updateIdbAddressLastUsage,
	addressStore
}: {
	tokenId: TokenId;
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
				err: `The address used to load the data did not match your actual ${tokenId.description} wallet address, which is why your session was ended. Please sign in again to reload your own data.`
			};
		}

		addressStore.set({ data: address, certified: true });

		await updateIdbAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		addressStore.reset();

		return { success: false, err: `Error while loading the ${tokenId.description} address.` };
	}

	return { success: true };
};

export const certifyBtcAddressMainnet = async (
	address: BtcAddress
): Promise<ResultSuccess<string>> =>
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

export const certifyEthAddress = async (address: EthAddress): Promise<ResultSuccess<string>> =>
	certifyAddress<EthAddress>({
		tokenId: ETHEREUM_TOKEN_ID,
		address,
		getAddress: getEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage,
		addressStore: ethAddressStore
	});

const validateAddress = async <T extends Address>({
	$addressStore,
	certifyAddress
}: {
	$addressStore: StorageAddressData<T>;
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

export const validateBtcAddressMainnet = async ($addressStore: StorageAddressData<BtcAddress>) =>
	await validateAddress<BtcAddress>({
		$addressStore,
		certifyAddress: certifyBtcAddressMainnet
	});

export const validateEthAddress = async ($addressStore: StorageAddressData<EthAddress>) =>
	await validateAddress<EthAddress>({
		$addressStore,
		certifyAddress: certifyEthAddress
	});
