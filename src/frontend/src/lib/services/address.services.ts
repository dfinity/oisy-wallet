import { BTC_MAINNET_TOKEN_ID } from '$env/tokens.btc.env';
import { ETHEREUM_TOKEN_ID } from '$env/tokens.env';
import { getBtcAddress, getEthAddress } from '$lib/api/backend.api';
import {
	getIdbEthAddress,
	setIdbBtcAddressMainnet,
	setIdbEthAddress,
	updateIdbEthAddressLastUsage
} from '$lib/api/idb.api';
import { addressStore } from '$lib/stores/address.store';
import { authStore } from '$lib/stores/auth.store';
import { i18n } from '$lib/stores/i18n.store';
import { toastsError } from '$lib/stores/toasts.store';
import type { Address, BtcAddress, EthAddress } from '$lib/types/address';
import type { SetIdbAddressParams } from '$lib/types/idb';
import type { OptionIdentity } from '$lib/types/identity';
import type { TokenId } from '$lib/types/token';
import { replacePlaceholders } from '$lib/utils/i18n.utils';
import type { BitcoinNetwork } from '@dfinity/ckbtc';
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
}): Promise<{ success: boolean }> => {
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
}): Promise<{ success: boolean }> =>
	loadTokenAddress<BtcAddress>({
		tokenId,
		getAddress: (identity) =>
			getBtcAddress({
				identity,
				network: network === 'testnet' ? { testnet: null } : { mainnet: null }
			}),
		setIdbAddress: setIdbBtcAddressMainnet
	});

export const loadBtcAddressMainnet = async (): Promise<{ success: boolean }> =>
	loadBtcAddress({
		tokenId: BTC_MAINNET_TOKEN_ID,
		network: 'mainnet'
	});

export const loadEthAddress = async (): Promise<{ success: boolean }> =>
	loadTokenAddress<EthAddress>({
		tokenId: ETHEREUM_TOKEN_ID,
		getAddress: getEthAddress,
		setIdbAddress: setIdbEthAddress
	});

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

export const loadIdbAddress = async (): Promise<{ success: boolean }> => {
	const tokenId = ETHEREUM_TOKEN_ID;

	try {
		const { identity } = get(authStore);

		// Should not happen given the current layout and guards.
		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false };
		}

		const idbEthAddress = await getIdbEthAddress(identity.getPrincipal());

		if (isNullish(idbEthAddress)) {
			return { success: false };
		}

		const { address } = idbEthAddress;
		addressStore.set({ tokenId, data: { data: address, certified: false } });

		await updateIdbEthAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		// We silence the error as the dapp will proceed with a standard lookup of the address.
		console.error(
			'Error encountered while searching for a locally stored public address in the browser.'
		);

		return { success: false };
	}

	return { success: true };
};

export const certifyAddress = async (
	address: string
): Promise<{ success: boolean; err?: string }> => {
	const tokenId = ETHEREUM_TOKEN_ID;

	try {
		const { identity } = get(authStore);

		assertNonNullish(identity, 'Cannot continue without an identity.');

		if (identity.getPrincipal().isAnonymous()) {
			return { success: false, err: 'Using the dapp with an anonymous user if not supported.' };
		}

		const certifiedAddress = await getEthAddress(identity);

		if (address.toLowerCase() !== certifiedAddress.toLowerCase()) {
			return {
				success: false,
				err: 'The address used to load the data did not match your actual wallet address, which is why your session was ended. Please sign in again to reload your own data.'
			};
		}

		addressStore.set({ tokenId, data: { data: address, certified: true } });

		await updateIdbEthAddressLastUsage(identity.getPrincipal());
	} catch (err: unknown) {
		addressStore.reset(tokenId);

		return { success: false, err: 'Error while loading the ETH address.' };
	}

	return { success: true };
};
