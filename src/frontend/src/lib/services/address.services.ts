import { NETWORK_BITCOIN_ENABLED } from '$env/networks.btc.env';
import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import {
	getIdbBtcAddressMainnet,
	getIdbEthAddress,
	setIdbBtcAddressMainnet,
	setIdbEthAddress,
	updateIdbBtcAddressMainnetLastUsage,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb.api';
import { getBtcAddress, getEthAddress } from '$lib/api/signer.api';
import { addressStore } from '$lib/stores/address.store';
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

const loadTokenAddress = async <T extends Address>({
	tokenId,
	getAddress,
	setIdbAddress
}: {
	tokenId: TokenId;
	getAddress: (identity: OptionIdentity) => Promise<T>;
	setIdbAddress: (params: SetIdbAddressParams<T>) => Promise<void>;
}): Promise<ResultSuccess> => {
	try {
		const { identity } = get(authStore);

		const address = await getAddress(identity);
		addressStore.set({ tokenId, data: { data: address, certified: true } });

		await saveTokenAddressForFutureSignIn({ address, identity, setIdbAddress });
	} catch (err: unknown) {
		addressStore.reset(tokenId);

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

const loadBtcAddress = async ({
	tokenId,
	network
}: {
	tokenId: typeof BTC_MAINNET_TOKEN_ID;
	network: BitcoinNetwork;
}): Promise<ResultSuccess> =>
	loadTokenAddress<BtcAddress>({
		tokenId,
		getAddress: (identity: OptionIdentity) =>
			getBtcAddress({
				identity,
				network: network === 'testnet' ? { testnet: null } : { mainnet: null }
			}),
		setIdbAddress: setIdbBtcAddressMainnet
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
		setIdbAddress: setIdbEthAddress
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
	updateIdbAddressLastUsage
}: {
	tokenId: TokenId;
	getIdbAddress: (principal: Principal) => Promise<IdbAddress<T> | undefined>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
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
		addressStore.set({ tokenId, data: { data: address, certified: false } });

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
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage
	});

const loadIdbEthAddress = async (): Promise<ResultSuccess<LoadIdbAddressError>> =>
	loadIdbTokenAddress<EthAddress>({
		tokenId: ETHEREUM_TOKEN_ID,
		getIdbAddress: getIdbEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage
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

const certifyAddress = async ({
	tokenId,
	address,
	getAddress,
	updateIdbAddressLastUsage
}: {
	tokenId: TokenId;
	address: Address;
	getAddress: (identity: OptionIdentity) => Promise<Address>;
	updateIdbAddressLastUsage: (principal: Principal) => Promise<void>;
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

		addressStore.set({ tokenId, data: { data: address, certified: true } });

		await updateIdbAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		addressStore.reset(tokenId);

		return { success: false, err: `Error while loading the ${tokenId.description} address.` };
	}

	return { success: true };
};

export const certifyBtcAddressMainnet = async (
	address: BtcAddress
): Promise<ResultSuccess<string>> =>
	certifyAddress({
		tokenId: BTC_MAINNET_TOKEN_ID,
		address,
		getAddress: (identity: OptionIdentity) =>
			getBtcAddress({
				identity,
				network: { mainnet: null }
			}),
		updateIdbAddressLastUsage: updateIdbBtcAddressMainnetLastUsage
	});

export const certifyEthAddress = async (address: EthAddress): Promise<ResultSuccess<string>> =>
	certifyAddress({
		tokenId: ETHEREUM_TOKEN_ID,
		address,
		getAddress: getEthAddress,
		updateIdbAddressLastUsage: updateIdbEthAddressLastUsage
	});
